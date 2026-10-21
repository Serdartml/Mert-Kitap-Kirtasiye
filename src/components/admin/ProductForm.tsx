"use client";


import { useState } from "react";
import Link from "next/link";
import { saveProduct } from "@/actions/admin";
import { applyDiscount, parsePercent, percentOf } from "@/lib/discount";
import { formatPrice } from "@/lib/format";
import { kurusToInput, parsePriceToKurus } from "@/lib/slug";
import { useServerForm } from "./useServerForm";

export interface ProductFormValues {
  id?: string;
  name: string;
  slug: string;
  sku: string;
  barcode: string;
  price: string;
  compareAt: string;
  cost: string;
  stock: number;
  categoryId: string;
  brandId: string;
  description: string;
  attributes: string;
  isActive: boolean;
  isFeatured: boolean;
}

export interface CategoryOption {
  id: string;
  name: string;
  children: { id: string; name: string }[];
}

const label = "block text-sm font-bold";
const hint = "mt-1 block text-xs font-normal text-neutral-500";

export default function ProductForm({
  values,
  categories,
  brands,
}: {
  values: ProductFormValues;
  categories: CategoryOption[];
  brands: { id: string; name: string }[];
}) {
  const { state, pending, onSubmit } = useServerForm(saveProduct);
  // Satış fiyatı, eski fiyat ve indirim yüzdesi birbirine bağlıdır; hangisi yazılırsa diğerleri canlı güncellenir.
  const [price, setPrice] = useState(values.price);
  const [compareAt, setCompareAt] = useState(values.compareAt);
  const [percent, setPercent] = useState(() => percentOf(parsePriceToKurus(values.price), parsePriceToKurus(values.compareAt)));
  const priceKurus = parsePriceToKurus(price);
  const compareKurus = parsePriceToKurus(compareAt);
  const hasDiscount = priceKurus != null && compareKurus != null && compareKurus > priceKurus;

  function onPriceChange(value: string) {
    setPrice(value);
    setPercent(percentOf(parsePriceToKurus(value), compareKurus));
  }

  function onCompareChange(value: string) {
    setCompareAt(value);
    setPercent(percentOf(priceKurus, parsePriceToKurus(value)));
  }

  // Yüzde, asıl fiyat (varsa eski fiyat, yoksa satış fiyatı) üzerinden uygulanır; yüzde silinirse indirim kalkar.
  function onPercentChange(value: string) {
    setPercent(value);
    if (value.trim() === "") {
      if (hasDiscount) {
        setPrice(kurusToInput(compareKurus));
        setCompareAt("");
      }
      return;
    }
    const parsed = parsePercent(value);
    if (parsed == null || priceKurus == null) return;
    const next = applyDiscount(priceKurus, compareKurus, parsed);
    if (!next) return;
    setPrice(kurusToInput(next.priceKurus));
    setCompareAt(kurusToInput(next.compareAtKurus));
  }

  return (
    <form onSubmit={onSubmit} className="max-w-3xl space-y-6">
      {values.id && <input type="hidden" name="id" value={values.id} />}

      <fieldset className="space-y-4 rounded-xl border border-neutral-200 bg-raised p-5">
        <legend className="px-1 text-sm font-extrabold">Temel bilgiler</legend>
        <label className={label}>
          Ürün adı
          <input name="name" defaultValue={values.name} required maxLength={200} className="field mt-1.5 font-normal" />
        </label>
        <label className={label}>
          Adres (slug)
          <input name="slug" defaultValue={values.slug} maxLength={80} className="field mt-1.5 font-normal" placeholder="bos-birakilirsa-addan-uretilir" />
          <span className={hint}>Ürün sayfasının adresi: /urun/…  Boş bırakırsanız addan üretilir.</span>
        </label>
        <label className={label}>
          Kategori
          <select name="categoryId" defaultValue={values.categoryId} required className="field mt-1.5 font-normal">
            <option value="">Seçin</option>
            {categories.map((category) => (
              <optgroup key={category.id} label={category.name}>
                <option value={category.id}>{category.name} (genel)</option>
                {category.children.map((child) => (
                  <option key={child.id} value={child.id}>
                    {child.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label className={label}>
          Marka
          <select name="brandId" defaultValue={values.brandId} className="field mt-1.5 font-normal">
            <option value="">Markasız</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </select>
          <span className={hint}>
            Markalar <Link href="/yonetim/markalar" className="underline">Markalar</Link> sayfasında yönetilir; kategori sayfasındaki marka filtresi bunu kullanır.
          </span>
        </label>
        <label className={label}>
          Açıklama
          <textarea name="description" defaultValue={values.description} rows={4} maxLength={5000} className="field mt-1.5 font-normal" />
        </label>
      </fieldset>

      <fieldset className="grid gap-4 rounded-xl border border-neutral-200 bg-raised p-5 sm:grid-cols-2">
        <legend className="px-1 text-sm font-extrabold">Fiyat ve stok</legend>
        <label className={label}>
          Satış fiyatı (TL)
          <input name="price" value={price} onChange={(event) => onPriceChange(event.target.value)} required inputMode="decimal" className="field mt-1.5 font-normal" placeholder="449,90" />
          <span className={hint}>KDV dahil.</span>
        </label>
        <label className={label}>
          Eski fiyat (TL)
          <input name="compareAt" value={compareAt} onChange={(event) => onCompareChange(event.target.value)} inputMode="decimal" className="field mt-1.5 font-normal" placeholder="549,90" />
          <span className={hint}>İndirim yoksa boş bırakın.</span>
        </label>
        <label className={label}>
          İndirim yüzdesi (%)
          <input value={percent} onChange={(event) => onPercentChange(event.target.value)} inputMode="decimal" className="field mt-1.5 font-normal" placeholder="20" />
          <span className={hint}>Yüzde yazınca eski ve satış fiyatı hesaplanır; eski fiyat yazınca yüzde hesaplanır. Yüzdeyi silerseniz indirim kalkar.</span>
        </label>
        <p aria-live="polite" className={`self-center rounded-lg border p-3 text-sm font-semibold sm:col-span-2 ${hasDiscount ? "border-green-300 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-300" : compareAt.trim() && !hasDiscount ? "border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300" : "border-neutral-200 text-neutral-500"}`}>
          {hasDiscount
            ? `İndirim %${percent}: ${formatPrice(compareKurus)} yerine ${formatPrice(priceKurus)} (${formatPrice(compareKurus - priceKurus)} tasarruf)`
            : compareAt.trim()
              ? "Eski fiyat, satış fiyatından yüksek olmalı."
              : "İndirim yok. Eski fiyat ya da yüzde yazarak indirim ekleyebilirsiniz."}
        </p>
        <label className={label}>
          Alış fiyatı (TL)
          <input name="cost" defaultValue={values.cost} inputMode="decimal" className="field mt-1.5 font-normal" placeholder="249,90" />
          <span className={hint}>Yalnızca yönetimde görünür; sitede hiçbir yerde gösterilmez.</span>
        </label>
        <label className={label}>
          Stok adedi
          <input name="stock" type="number" min={0} step={1} defaultValue={values.stock} required className="field mt-1.5 font-normal" />
        </label>
      </fieldset>

      <fieldset className="grid gap-4 rounded-xl border border-neutral-200 bg-raised p-5 sm:grid-cols-2">
        <legend className="px-1 text-sm font-extrabold">Kodlar</legend>
        <label className={label}>
          Stok kodu
          <input name="sku" defaultValue={values.sku} required maxLength={60} className="field mt-1.5 font-normal" />
        </label>
        <label className={label}>
          Barkod
          <input name="barcode" defaultValue={values.barcode} maxLength={40} inputMode="numeric" className="field mt-1.5 font-normal" />
        </label>
      </fieldset>

      <fieldset className="space-y-4 rounded-xl border border-neutral-200 bg-raised p-5">
        <legend className="px-1 text-sm font-extrabold">Özellikler ve görünürlük</legend>
        <label className={label}>
          Özellikler
          <textarea
            name="attributes"
            defaultValue={values.attributes}
            rows={4}
            // Mobilde 16px: daha küçük yazı iOS'ta odaklanınca sayfayı yakınlaştırır.
            className="field mt-1.5 font-mono text-base font-normal md:text-sm"
            placeholder={"Renk: Siyah\nBoyut: A5"}
          />
          <span className={hint}>Her satıra bir özellik, &quot;Ad: Değer&quot; biçiminde.</span>
        </label>
        <label className="flex min-h-10 items-center gap-3 text-sm font-bold">
          <input type="checkbox" name="isActive" defaultChecked={values.isActive} className="size-5 shrink-0 accent-brand-500" />
          Sitede yayında
        </label>
        <label className="flex min-h-10 items-center gap-3 text-sm font-bold">
          <input type="checkbox" name="isFeatured" defaultChecked={values.isFeatured} className="size-5 shrink-0 accent-brand-500" />
          Ana sayfada &quot;Öne Çıkanlar&quot;da göster
        </label>
      </fieldset>

      {/*
        Mobilde form uzun olduğu için Kaydet çubuğu ekranın altına yapışır; hata mesajı da çubuğun
        içindedir ki formun ortasındayken de görünsün. Negatif kenar boşluğu, panelin iç boşluğunu geri alır.
      */}
      <div className="sticky bottom-0 z-10 -mx-3 space-y-3 border-t border-neutral-200 bg-neutral-50 px-3 py-3 sm:-mx-4 sm:px-4 md:static md:mx-0 md:border-0 md:bg-transparent md:p-0">
        {state.error && (
          <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
            {state.error}
          </p>
        )}

        <div className="flex gap-3">
          <button type="submit" disabled={pending} className="btn btn-primary flex-1 md:flex-none">
            {pending ? "Kaydediliyor..." : "Kaydet"}
          </button>
          <Link href="/yonetim/urunler" className="btn btn-outline">
            Vazgeç
          </Link>
        </div>
      </div>
    </form>
  );
}
