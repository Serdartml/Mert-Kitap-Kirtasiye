"use client";


import Link from "next/link";
import { saveProduct } from "@/actions/admin";
import { useServerForm } from "./useServerForm";

export interface ProductFormValues {
  id?: string;
  name: string;
  slug: string;
  sku: string;
  barcode: string;
  price: string;
  compareAt: string;
  stock: number;
  categoryId: string;
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

export default function ProductForm({ values, categories }: { values: ProductFormValues; categories: CategoryOption[] }) {
  const { state, pending, onSubmit } = useServerForm(saveProduct);

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
          Açıklama
          <textarea name="description" defaultValue={values.description} rows={4} maxLength={5000} className="field mt-1.5 font-normal" />
        </label>
      </fieldset>

      <fieldset className="grid gap-4 rounded-xl border border-neutral-200 bg-raised p-5 sm:grid-cols-3">
        <legend className="px-1 text-sm font-extrabold">Fiyat ve stok</legend>
        <label className={label}>
          Satış fiyatı (TL)
          <input name="price" defaultValue={values.price} required inputMode="decimal" className="field mt-1.5 font-normal" placeholder="449,90" />
          <span className={hint}>KDV dahil.</span>
        </label>
        <label className={label}>
          Eski fiyat (TL)
          <input name="compareAt" defaultValue={values.compareAt} inputMode="decimal" className="field mt-1.5 font-normal" placeholder="549,90" />
          <span className={hint}>İndirim yoksa boş bırakın.</span>
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
            className="field mt-1.5 font-mono text-sm font-normal"
            placeholder={"Renk: Siyah\nBoyut: A5"}
          />
          <span className={hint}>Her satıra bir özellik, &quot;Ad: Değer&quot; biçiminde.</span>
        </label>
        <label className="flex items-center gap-2.5 text-sm font-bold">
          <input type="checkbox" name="isActive" defaultChecked={values.isActive} className="size-4 accent-brand-500" />
          Sitede yayında
        </label>
        <label className="flex items-center gap-2.5 text-sm font-bold">
          <input type="checkbox" name="isFeatured" defaultChecked={values.isFeatured} className="size-4 accent-brand-500" />
          Ana sayfada &quot;Öne Çıkanlar&quot;da göster
        </label>
      </fieldset>

      {state.error && (
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? "Kaydediliyor..." : "Kaydet"}
        </button>
        <Link href="/yonetim/urunler" className="btn btn-outline">
          Vazgeç
        </Link>
      </div>
    </form>
  );
}
