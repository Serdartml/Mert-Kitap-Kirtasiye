import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CategoryForm from "@/components/admin/CategoryForm";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Kategori" };

// "yeni" de bu sayfadan geçer: /yonetim/kategoriler/yeni boş formu açar.
export default async function CategoryFormPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const isNew = id === "yeni";

  const [category, roots] = await Promise.all([
    isNew ? null : db.category.findUnique({ where: { id } }),
    db.category.findMany({ where: { parentId: null }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!isNew && !category) notFound();

  return (
    <>
      <h1 className="mb-6 text-2xl font-extrabold">
        <span className="marker">{isNew ? "Yeni kategori" : "Kategoriyi düzenle"}</span>
      </h1>
      <CategoryForm
        // Kategori kendisinin üst kategorisi olarak seçilemesin.
        parents={roots.filter((root) => root.id !== category?.id)}
        values={{
          id: category?.id,
          name: category?.name ?? "",
          slug: category?.slug ?? "",
          description: category?.description ?? "",
          sortOrder: category?.sortOrder ?? 0,
          parentId: category?.parentId ?? "",
        }}
      />
    </>
  );
}
