"use client";

import Link from "next/link";
import { saveBrand } from "@/actions/admin";
import { useServerForm } from "./useServerForm";

export default function BrandForm({ values }: { values: { id?: string; name: string; slug: string; isWholesaler: boolean } }) {
  const { state, pending, onSubmit } = useServerForm(saveBrand);

  return (
    <form onSubmit={onSubmit} className="max-w-xl space-y-4 rounded-xl border border-neutral-200 bg-raised p-5">
      {values.id && <input type="hidden" name="id" value={values.id} />}

      <label className="block text-sm font-bold">
        Marka adı
        <input name="name" defaultValue={values.name} required maxLength={80} className="field mt-1.5 font-normal" />
      </label>
      <label className="block text-sm font-bold">
        Adres (slug)
        <input name="slug" defaultValue={values.slug} maxLength={80} className="field mt-1.5 font-normal" placeholder="bos-birakilirsa-addan-uretilir" />
        <span className="mt-1 block text-xs font-normal text-neutral-500">
          Kategori sayfalarındaki marka filtresinin adres parametresi (?marka=…). Değiştirmek eski filtre bağlantılarını kırar.
        </span>
      </label>

      <label className="flex items-start gap-3 text-sm font-bold">
        <input type="checkbox" name="isWholesaler" defaultChecked={values.isWholesaler} className="mt-0.5 size-5 shrink-0 accent-brand-500" />
        <span>
          Toptancı / dağıtıcı
          <span className="mt-1 block text-xs font-normal text-neutral-500">
            İşaretlenirse bu ad yalnızca yönetim panelinde görünür; ürün sayfasında ve kategori sayfasındaki marka filtresinde müşteriye gösterilmez.
          </span>
        </span>
      </label>

      {state.error && (
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={pending} className="btn btn-primary flex-1 md:flex-none">
          {pending ? "Kaydediliyor..." : "Kaydet"}
        </button>
        <Link href="/yonetim/markalar" className="btn btn-outline">
          Vazgeç
        </Link>
      </div>
    </form>
  );
}
