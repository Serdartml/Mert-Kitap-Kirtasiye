import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Fotoğrafsız ürünler" };

const PAGE_SIZE = 300;
interface PageProps {
  searchParams: Promise<{ sayfa?: string }>;
}

// Oturum arkasındaki yönetim sayfası: Next'in "anında gezinme" denetiminden çıkarıldı (README, Yönetim paneli).
export const instant = false;

export default async function PhotolessProductsPage({ searchParams }: PageProps) {
  await requireAdmin();

  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.sayfa ?? "1", 10) || 1);
  const where = { images: { none: {} } };

  const [items, total] = await Promise.all([
    db.product.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { id: true, name: true, barcode: true, sku: true, isActive: true },
    }),
    db.product.count({ where }),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <Link href="/yonetim/urunler" className="text-sm font-bold hover:underline">
        ← Ürünler
      </Link>
      <h1 className="mt-2 text-2xl font-extrabold">
        <span className="marker">Fotoğrafsız ürünler</span>
      </h1>
      <p className="mt-3 text-sm text-neutral-600">
        <span className="font-bold text-fg">{total}</span> ürünün görseli yok. Ürün adına tıklayıp görsel ekleyebilirsiniz.
      </p>

      <div className="mt-4 overflow-x-auto rounded-xl border border-neutral-200 bg-raised">
        <table className="w-full min-w-[32rem] text-left text-sm">
          <thead className="border-b border-neutral-200 text-xs uppercase tracking-wider text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-bold">Ürün adı</th>
              <th className="px-4 py-3 font-bold">Barkod</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {items.map((product) => (
              <tr key={product.id}>
                <td className="px-4 py-2.5">
                  <Link href={`/yonetim/urunler/${product.id}`} className="font-bold hover:underline">
                    {product.name}
                  </Link>
                  {!product.isActive && <span className="ml-1.5 text-xs text-neutral-500">(pasif)</span>}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-neutral-600">{product.barcode ?? "—"}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={2} className="px-4 py-10 text-center text-neutral-500">
                  Görseli olmayan ürün yok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <nav aria-label="Sayfalar" className="mt-5 flex items-center justify-center gap-3 text-sm font-bold">
          {page > 1 ? <Link href={`/yonetim/urunler/fotosuz?sayfa=${page - 1}`} className="btn btn-outline py-2.5">← Önceki</Link> : null}
          <span className="text-neutral-600">
            {page} / {pageCount}
          </span>
          {page < pageCount ? <Link href={`/yonetim/urunler/fotosuz?sayfa=${page + 1}`} className="btn btn-outline py-2.5">Sonraki →</Link> : null}
        </nav>
      )}
    </>
  );
}
