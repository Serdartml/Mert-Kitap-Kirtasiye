"use client";


import Link from "next/link";
import { saveCategory } from "@/actions/admin";
import { useServerForm } from "./useServerForm";

export interface CategoryFormValues {
  id?: string;
  name: string;
  slug: string;
  description: string;
  sortOrder: number;
  parentId: string;
}

const label = "block text-sm font-bold";
const hint = "mt-1 block text-xs font-normal text-neutral-500";

export default function CategoryForm({ values, parents }: { values: CategoryFormValues; parents: { id: string; name: string }[] }) {
  const { state, pending, onSubmit } = useServerForm(saveCategory);

  return (
    <form onSubmit={onSubmit} className="max-w-xl space-y-4 rounded-xl border border-neutral-200 bg-raised p-5">
      {values.id && <input type="hidden" name="id" value={values.id} />}

      <label className={label}>
        Kategori adı
        <input name="name" defaultValue={values.name} required maxLength={80} className="field mt-1.5 font-normal" />
      </label>
      <label className={label}>
        Adres (slug)
        <input name="slug" defaultValue={values.slug} maxLength={80} className="field mt-1.5 font-normal" placeholder="bos-birakilirsa-addan-uretilir" />
        <span className={hint}>
          Kategori sayfasının adresi: /kategori/…  Mevcut bir kategorinin adresini değiştirmek eski bağlantıları kırar.
        </span>
      </label>
      <label className={label}>
        Üst kategori
        <select name="parentId" defaultValue={values.parentId} className="field mt-1.5 font-normal">
          <option value="">Yok (ana kategori)</option>
          {parents.map((parent) => (
            <option key={parent.id} value={parent.id}>
              {parent.name}
            </option>
          ))}
        </select>
      </label>
      <label className={label}>
        Açıklama
        <input name="description" defaultValue={values.description} maxLength={300} className="field mt-1.5 font-normal" />
        <span className={hint}>Kategori sayfasındaki sarı şeritte başlığın altında görünür.</span>
      </label>
      <label className={label}>
        Sıra
        <input name="sortOrder" type="number" min={0} step={1} defaultValue={values.sortOrder} className="field mt-1.5 font-normal" />
        <span className={hint}>Küçük sayı menüde önce gelir.</span>
      </label>

      {state.error && (
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      )}

      <div className="flex flex-wrap gap-3 pt-2">
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? "Kaydediliyor..." : "Kaydet"}
        </button>
        <Link href="/yonetim/kategoriler" className="btn btn-outline">
          Vazgeç
        </Link>
      </div>
    </form>
  );
}
