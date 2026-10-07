import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Plus } from "lucide-react";
import { setProductActive } from "@/actions/admin";
import StatusNote from "@/components/admin/StatusNote";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/format";

export const metadata: Metadata = { title: "Ürünler" };

const PAGE_SIZE = 25;
const LOW_STOCK = 5;

const filters = [
  { key: "", label: "Tümü" },
  { key: "yayinda", label: "Yayında" },
  { key: "pasif", label: "Pasif" },
  { key: "stoksuz", label: "Stokta yok" },
  { key: "azalan", label: "Stok azalıyor" },
];

const filterWhere: Record<string, Prisma.ProductWhereInput> = {
  yayinda: { isActive: true },
  pasif: { isActive: false },
  stoksuz: { stock: 0 },
  azalan: { stock: { gt: 0, lte: LOW_STOCK } },
};

interface PageProps {
  searchParams: Promise<{ q?: string; kategori?: string; filtre?: string; sayfa?: string; durum?: string }>;
}

export default async function AdminProductsPage({ searchParams }: PageProps) {
  await requireAdmin();

  const params = await searchParams;
  const q = (params.q ?? "").trim().slice(0, 100);
  const categoryId = params.kategori ?? "";
  const filter = params.filtre && filterWhere[params.filtre] ? params.filtre : "";
  const page = Math.max(1, Number.parseInt(params.sayfa ?? "1", 10) || 1);

  const categories = await db.category.findMany({
    where: { parentId: null },
    orderBy: { sortOrder: "asc" },
    include: { children: { orderBy: { sortOrder: "asc" } } },
  });

  // Ana kategori seçilirse alt kategorilerindeki ürünler de gelir.
  const selectedRoot = categories.find((category) => category.id === categoryId);
  const categoryIds = selectedRoot ? [selectedRoot.id, ...selectedRoot.children.map((child) => child.id)] : categoryId ? [categoryId] : null;

  const where: Prisma.ProductWhereInput = {
    ...(filter ? filterWhere[filter] : {}),
    ...(categoryIds ? { categoryId: { in: categoryIds } } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { sku: { contains: q, mode: "insensitive" } },
            { barcode: { contains: q } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    db.product.findMany({
      where,
      include: { category: true },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.product.count({ where }),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const href = (overrides: Record<string, string | number>) => {
    const next = { q, kategori: categoryId, filtre: filter, sayfa: page, ...overrides };
    const query = new URLSearchParams();
    if (next.q) query.set("q", String(next.q));
    if (next.kategori) query.set("kategori", String(next.kategori));
    if (next.filtre) query.set("filtre", String(next.filtre));
    if (Number(next.sayfa) > 1) query.set("sayfa", String(next.sayfa));
    const qs = query.toString();
    return qs ? `/yonetim/urunler?${qs}` : "/yonetim/urunler";
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">
          <span className="marker">Ürünler</span>
        </h1>
        <Link href="/yonetim/urunler/yeni" className="btn btn-primary">
          <Plus size={16} aria-hidden /> Yeni ürün
        </Link>
      </div>

      <div className="mt-5">
        <StatusNote status={params.durum} />
      </div>

      <form action="/yonetim/urunler" className="flex flex-wrap gap-2">
        {filter && <input type="hidden" name="filtre" value={filter} />}
        {/* Mobilde arama kutusu tam satır; kategori ile buton altında yan yana. */}
        <input name="q" type="search" defaultValue={q} placeholder="Ad, stok kodu veya barkod" aria-label="Ürün ara" className="field basis-full sm:max-w-xs sm:basis-auto" />
        <select name="kategori" defaultValue={categoryId} aria-label="Kategori" className="field min-w-0 flex-1 sm:max-w-56 sm:flex-none">
          <option value="">Tüm kategoriler</option>
          {categories.map((category) => (
            <optgroup key={category.id} label={category.name}>
              <option value={category.id}>{category.name} (tümü)</option>
              {category.children.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <button type="submit" className="btn btn-dark">Ara</button>
      </form>

      <div className="mt-3 flex flex-wrap gap-2">
        {filters.map((item) => (
          <Link
            key={item.key}
            href={href({ filtre: item.key, sayfa: 1 })}
            aria-current={filter === item.key ? "true" : undefined}
            className={`flex min-h-10 items-center rounded-full border px-3.5 text-xs font-bold sm:min-h-8 sm:px-3 ${
              filter === item.key ? "border-brand-500 bg-brand-500 text-ink" : "border-neutral-300 hover:border-fg"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>

      <p className="mt-4 text-sm text-neutral-600">
        <span className="font-bold text-fg">{total}</span> ürün
      </p>

      {/* Mobil: tablo yerine kartlar. Altı sütun dar ekrana sığmıyor; fiyat, stok ve durum yana kayıp kayboluyordu. */}
      <ul className="mt-2 space-y-2 md:hidden">
        {items.map((product) => (
          <li key={product.id} className="rounded-xl border border-neutral-200 bg-raised p-3">
            <Link href={`/yonetim/urunler/${product.id}`} className="block">
              <span className="block break-words font-bold">{product.name}</span>
              <span className="mt-0.5 block text-xs text-neutral-500">
                {product.sku} · {product.category.name}
              </span>
            </Link>
            <div className="mt-2 flex items-center gap-3">
              <p className="min-w-0 flex-1 text-sm">
                <span className="font-extrabold">{formatPrice(product.priceKurus)}</span>
                {product.compareAtKurus && (
                  <span className="ml-1.5 text-xs text-neutral-500 line-through">{formatPrice(product.compareAtKurus)}</span>
                )}
                <span className={`mt-0.5 block text-xs font-bold ${product.stock === 0 ? "text-red-700 dark:text-red-400" : "text-neutral-600"}`}>
                  {product.stock === 0 ? "Stokta yok" : `Stok: ${product.stock}`}
                </span>
              </p>
              <form action={setProductActive.bind(null, product.id, !product.isActive)}>
                <button
                  type="submit"
                  aria-label={`${product.name}: ${product.isActive ? "yayından kaldır" : "yayına al"}`}
                  className={`min-h-10 rounded-full px-3.5 text-xs font-bold ${
                    product.isActive ? "bg-brand-500 text-ink" : "bg-neutral-200 text-neutral-600"
                  }`}
                >
                  {product.isActive ? "Yayında" : "Pasif"}
                </button>
              </form>
              <Link href={`/yonetim/urunler/${product.id}`} className="grid min-h-10 place-items-center rounded-lg border border-neutral-300 px-3 text-xs font-bold">
                Düzenle
              </Link>
            </div>
          </li>
        ))}
        {items.length === 0 && (
          <li className="rounded-xl border border-dashed border-neutral-300 p-10 text-center text-sm text-neutral-500">Bu seçime uygun ürün yok.</li>
        )}
      </ul>

      <div className="mt-2 hidden overflow-x-auto rounded-xl border border-neutral-200 bg-raised md:block">
        <table className="w-full min-w-[46rem] text-left text-sm">
          <thead className="border-b border-neutral-200 text-xs uppercase tracking-wider text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-bold">Ürün</th>
              <th className="px-4 py-3 font-bold">Kategori</th>
              <th className="px-4 py-3 text-right font-bold">Fiyat</th>
              <th className="px-4 py-3 text-right font-bold">Stok</th>
              <th className="px-4 py-3 font-bold">Durum</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {items.map((product) => (
              <tr key={product.id}>
                <td className="px-4 py-3">
                  <Link href={`/yonetim/urunler/${product.id}`} className="font-bold hover:underline">
                    {product.name}
                  </Link>
                  <span className="block text-xs text-neutral-500">
                    {product.sku}
                    {product.barcode ? ` · ${product.barcode}` : ""}
                  </span>
                </td>
                <td className="px-4 py-3 text-neutral-600">{product.category.name}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-semibold">
                  {formatPrice(product.priceKurus)}
                  {product.compareAtKurus && (
                    <span className="block text-xs font-normal text-neutral-500 line-through">{formatPrice(product.compareAtKurus)}</span>
                  )}
                </td>
                <td className={`px-4 py-3 text-right font-bold ${product.stock === 0 ? "text-red-700 dark:text-red-400" : ""}`}>
                  {product.stock}
                </td>
                <td className="px-4 py-3">
                  <form action={setProductActive.bind(null, product.id, !product.isActive)}>
                    <button
                      type="submit"
                      title={product.isActive ? "Yayından kaldır" : "Yayına al"}
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                        product.isActive ? "bg-brand-500 text-ink" : "bg-neutral-200 text-neutral-600"
                      }`}
                    >
                      {product.isActive ? "Yayında" : "Pasif"}
                    </button>
                  </form>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/yonetim/urunler/${product.id}`} className="font-bold hover:underline">
                    Düzenle
                  </Link>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-neutral-500">
                  Bu seçime uygun ürün yok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <nav aria-label="Sayfalar" className="mt-5 flex items-center justify-center gap-3 text-sm font-bold">
          {page > 1 ? <Link href={href({ sayfa: page - 1 })} className="btn btn-outline py-2.5">← Önceki</Link> : null}
          <span className="text-neutral-600">
            {page} / {pageCount}
          </span>
          {page < pageCount ? <Link href={href({ sayfa: page + 1 })} className="btn btn-outline py-2.5">Sonraki →</Link> : null}
        </nav>
      )}
    </>
  );
}
