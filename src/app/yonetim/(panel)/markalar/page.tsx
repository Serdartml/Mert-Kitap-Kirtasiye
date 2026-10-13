import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { deleteBrand } from "@/actions/admin";
import ConfirmButton from "@/components/admin/ConfirmButton";
import StatusNote from "@/components/admin/StatusNote";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Markalar" };

// Oturum arkasındaki yönetim sayfası: Next'in "anında gezinme" denetiminden çıkarıldı (README, Yönetim paneli).
export const instant = false;

export default async function AdminBrandsPage({ searchParams }: { searchParams: Promise<{ durum?: string }> }) {
  await requireAdmin();
  const { durum } = await searchParams;

  const brands = await db.brand.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">
          <span className="marker">Markalar</span>
        </h1>
        <Link href="/yonetim/markalar/yeni" className="btn btn-primary">
          <Plus size={16} aria-hidden /> Yeni marka
        </Link>
      </div>

      <div className="mt-5">
        <StatusNote status={durum} />
      </div>

      {brands.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 p-10 text-center text-sm text-neutral-500">
          Henüz marka yok. Marka ekleyip ürünlerin düzenleme sayfasından seçtiğinizde kategori sayfalarında marka filtresi görünür.
        </p>
      ) : (
        <ul className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-raised">
          {brands.map((brand) => (
            <li key={brand.id} className="flex items-center gap-x-1 py-1.5 pl-3 pr-1.5 sm:gap-x-3 sm:px-4 sm:py-3">
              <Link href={`/yonetim/markalar/${brand.id}`} className="min-w-0 flex-1 py-1.5 hover:underline">
                <span className="block break-words font-extrabold">{brand.name}</span>
                <span className="block text-xs text-neutral-500">?marka={brand.slug}</span>
              </Link>
              <span className="shrink-0 whitespace-nowrap px-2 text-xs font-bold text-neutral-600">{brand._count.products} ürün</span>
              <Link href={`/yonetim/markalar/${brand.id}`} className="grid min-h-10 shrink-0 place-items-center px-2 text-sm font-bold hover:underline">
                Düzenle
              </Link>
              {brand._count.products === 0 ? (
                <form action={deleteBrand.bind(null, brand.id)} className="shrink-0">
                  <ConfirmButton
                    message={`"${brand.name}" markası silinecek. Emin misiniz?`}
                    aria-label={`${brand.name} markasını sil`}
                    className="grid size-10 place-items-center rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-red-700"
                  >
                    <Trash2 size={16} aria-hidden />
                  </ConfirmButton>
                </form>
              ) : (
                <span className="size-10 shrink-0" title="Ürünleri olduğu için silinemez" />
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
