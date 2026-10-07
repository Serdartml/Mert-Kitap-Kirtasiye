import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { deleteCategory } from "@/actions/admin";
import ConfirmButton from "@/components/admin/ConfirmButton";
import StatusNote from "@/components/admin/StatusNote";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Kategoriler" };

interface RowProps {
  category: { id: string; name: string; slug: string; sortOrder: number; _count: { products: number } };
  childCount: number;
  // Ana kategoride gösterilen sayı: kendi ürünleri + alt kategorilerindekiler.
  totalProducts?: number;
  nested?: boolean;
}

function CategoryRow({ category, childCount, totalProducts, nested = false }: RowProps) {
  const deletable = category._count.products === 0 && childCount === 0;

  return (
    // Mobilde adres (slug) gizlenir ve işlemler sıkışır; yoksa ad dar bir sütunda üç satıra bölünüyordu.
    <li className={`flex items-center gap-x-1 py-1.5 pr-1.5 sm:gap-x-3 sm:px-4 sm:py-3 ${nested ? "pl-6 sm:pl-10" : "pl-3"}`}>
      <Link href={`/yonetim/kategoriler/${category.id}`} className="min-w-0 flex-1 py-1.5 hover:underline">
        <span className={`block break-words ${nested ? "font-semibold" : "font-extrabold"}`}>{category.name}</span>
        <span className="block text-xs text-neutral-500">
          <span className="hidden sm:inline">/kategori/{category.slug} · </span>sıra {category.sortOrder}
        </span>
      </Link>
      <Link
        href={`/yonetim/urunler?kategori=${category.id}`}
        className="grid min-h-10 shrink-0 place-items-center whitespace-nowrap px-2 text-xs font-bold text-neutral-600 hover:underline"
      >
        {totalProducts ?? category._count.products} ürün
      </Link>
      <Link href={`/yonetim/kategoriler/${category.id}`} className="grid min-h-10 shrink-0 place-items-center px-2 text-sm font-bold hover:underline">
        Düzenle
      </Link>
      {deletable ? (
        <form action={deleteCategory.bind(null, category.id)} className="shrink-0">
          <ConfirmButton
            message={`"${category.name}" kategorisi silinecek. Emin misiniz?`}
            aria-label={`${category.name} kategorisini sil`}
            className="grid size-10 place-items-center rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-red-700"
          >
            <Trash2 size={16} aria-hidden />
          </ConfirmButton>
        </form>
      ) : (
        // Dolu kategori silinemez; hizayı korumak için aynı genişlikte boşluk.
        <span className="size-10 shrink-0" title="İçinde ürün veya alt kategori olduğu için silinemez" />
      )}
    </li>
  );
}

export default async function AdminCategoriesPage({ searchParams }: { searchParams: Promise<{ durum?: string }> }) {
  await requireAdmin();
  const { durum } = await searchParams;

  const roots = await db.category.findMany({
    where: { parentId: null },
    orderBy: { sortOrder: "asc" },
    include: {
      _count: { select: { products: true } },
      children: { orderBy: { sortOrder: "asc" }, include: { _count: { select: { products: true } } } },
    },
  });

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">
          <span className="marker">Kategoriler</span>
        </h1>
        <Link href="/yonetim/kategoriler/yeni" className="btn btn-primary">
          <Plus size={16} aria-hidden /> Yeni kategori
        </Link>
      </div>

      <div className="mt-5">
        <StatusNote status={durum} />
      </div>

      <div className="space-y-4">
        {roots.map((root) => (
          <ul key={root.id} className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-raised">
            <CategoryRow
              category={root}
              childCount={root.children.length}
              totalProducts={root._count.products + root.children.reduce((sum, child) => sum + child._count.products, 0)}
            />
            {root.children.map((child) => (
              <CategoryRow key={child.id} category={child} childCount={0} nested />
            ))}
          </ul>
        ))}
        {roots.length === 0 && <p className="text-sm text-neutral-500">Henüz kategori yok.</p>}
      </div>

      <p className="mt-5 max-w-2xl text-xs text-neutral-500">
        Yeni bir ana kategori eklediğinizde ikon, doku ve çizimi kod tarafında tanımlanana kadar kırtasiye
        görünümünü kullanır. İçinde ürün veya alt kategori olan kategoriler silinemez.
      </p>
    </>
  );
}
