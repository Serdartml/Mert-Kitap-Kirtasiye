import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BrandForm from "@/components/admin/BrandForm";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Marka" };

// "yeni" de bu sayfadan geçer: /yonetim/markalar/yeni boş formu açar.
// Oturum arkasındaki yönetim sayfası: Next'in "anında gezinme" denetiminden çıkarıldı (README, Yönetim paneli).
export const instant = false;

export default async function BrandFormPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const isNew = id === "yeni";

  const brand = isNew ? null : await db.brand.findUnique({ where: { id } });
  if (!isNew && !brand) notFound();

  return (
    <>
      <h1 className="mb-6 text-2xl font-extrabold">
        <span className="marker">{isNew ? "Yeni marka" : "Markayı düzenle"}</span>
      </h1>
      <BrandForm values={{ id: brand?.id, name: brand?.name ?? "", slug: brand?.slug ?? "", isWholesaler: brand?.isWholesaler ?? false }} />
    </>
  );
}
