import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown, FileSpreadsheet, Plus } from "lucide-react";
import { deleteProducts, editProducts, setProductActive } from "@/actions/admin";
import BulkSelect, { BulkCheckbox } from "@/components/admin/BulkSelect";
import RememberFilters from "@/components/admin/RememberFilters";
import RememberSort from "@/components/admin/RememberSort";
import StatusNote from "@/components/admin/StatusNote";
import {
  DEFAULT_SORT_PARAM,
  FILTER_COOKIE,
  filtersCookieValue,
  isProductFilter,
  parseProductSort,
  parseSavedFilters,
  productFilters as filters,
  productListWhere,
  productOrderBy,
  SORT_COOKIE,
  sortableColumns,
  sortParam,
  type ProductSort,
  type SortColumn,
} from "@/lib/admin-products";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { discountPercent, formatPrice } from "@/lib/format";

export const metadata: Metadata = { title: "Ürünler" };

const PAGE_SIZE = 25;
interface PageProps {
  searchParams: Promise<{ q?: string; kategori?: string; filtre?: string; sayfa?: string; sirala?: string; durum?: string; adet?: string }>;
}

// Oturum arkasındaki yönetim sayfası: Next'in "anında gezinme" denetiminden çıkarıldı (README, Yönetim paneli).
export const instant = false;

export default async function AdminProductsPage({ searchParams }: PageProps) {
  await requireAdmin();

  const params = await searchParams;
  const q = (params.q ?? "").trim().slice(0, 100);
  const page = Math.max(1, Number.parseInt(params.sayfa ?? "1", 10) || 1);
  const cookieStore = await cookies();
  // Süzgeç ve kategori: adreste "filtre" ya da "kategori" varsa (boş olsa bile) seçim oradandır; yoksa çerezde hatırlanan kullanılır.
  const filtersInUrl = params.filtre !== undefined || params.kategori !== undefined;
  const saved = parseSavedFilters(cookieStore.get(FILTER_COOKIE)?.value);
  const filter = filtersInUrl ? (isProductFilter(params.filtre) ? params.filtre : "") : saved.filter;
  const requestedCategory = filtersInUrl ? (params.kategori ?? "") : saved.categoryId;
  // Adreste sıralama yoksa çerezde hatırlanan sıralama kullanılır; "sirala=son" varsayılana dönmeyi seçer.
  const rememberedSort = cookieStore.get(SORT_COOKIE)?.value;
  const sort = parseProductSort(params.sirala ?? rememberedSort);
  // Bağlantılara yazılan değer: sıralama yoksa ama çerez varsa, varsayılan seçimi kaybolmasın diye açıkça "son".
  const sortValue = sort ? sortParam(sort) : rememberedSort ? DEFAULT_SORT_PARAM : "";

  const categories = await db.category.findMany({
    where: { parentId: null },
    orderBy: { sortOrder: "asc" },
    include: { children: { orderBy: { sortOrder: "asc" } } },
  });

  // Silinmiş kategori hatırlanmışsa boş liste yerine tüm kategoriler gösterilir.
  const categoryExists = categories.some((category) => category.id === requestedCategory || category.children.some((child) => child.id === requestedCategory));
  const categoryId = categoryExists ? requestedCategory : "";

  const where = productListWhere({ q, categoryId, filter }, categories);

  const [items, total] = await Promise.all([
    db.product.findMany({
      where,
      include: { category: true, brand: { select: { name: true } } },
      omit: { costKurus: false },
      orderBy: productOrderBy(sort),
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.product.count({ where }),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const href = (overrides: Record<string, string | number>) => {
    const next = { q, kategori: categoryId, filtre: filter, sirala: sortValue, sayfa: page, ...overrides };
    const query = new URLSearchParams();
    if (next.q) query.set("q", String(next.q));
    // Boş olsa da yazılır: "Tümü" seçimi hatırlanan süzgeci temizlesin diye adres seçimi açıkça taşır.
    query.set("kategori", String(next.kategori));
    query.set("filtre", String(next.filtre));
    if (next.sirala) query.set("sirala", String(next.sirala));
    if (Number(next.sayfa) > 1) query.set("sayfa", String(next.sayfa));
    return `/yonetim/urunler?${query}`;
  };

  // Başlığa ilk tıklama artan, sonraki tıklamalar artan/azalan arasında geçiş yapar; sıralama değişince ilk sayfaya dönülür.
  const sortHref = (column: SortColumn) => {
    const direction = sort?.column === column && sort.direction === "artan" ? "azalan" : "artan";
    return href({ sirala: sortParam({ column, direction }), sayfa: 1 });
  };
  // Bileşen değil, JSX döndüren yardımcı: render içinde bileşen tanımlamak her seferinde yeniden kurulmasına yol açar.
  const sortHeader = (column: SortColumn, align: "left" | "right" = "left") => {
    const active = sort?.column === column ? sort : null;
    const label = sortableColumns.find((item) => item.key === column)!.label;
    const Icon = active ? (active.direction === "artan" ? ArrowUp : ArrowDown) : ArrowUpDown;
    return (
      <th key={column} aria-sort={active ? (active.direction === "artan" ? "ascending" : "descending") : undefined} className={`px-4 py-3 font-bold ${align === "right" ? "text-right" : ""}`}>
        <Link
          href={sortHref(column)}
          title={`${label} sütununa göre sırala`}
          className={`inline-flex items-center gap-1 uppercase tracking-wider hover:text-fg ${active ? "text-fg" : ""} ${align === "right" ? "flex-row-reverse" : ""}`}
        >
          {label}
          <Icon size={13} aria-hidden className={active ? "" : "opacity-40"} />
        </Link>
      </th>
    );
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">
          <span className="marker">Ürünler</span>
        </h1>
        <div className="flex flex-wrap gap-2">
          <Link href="/yonetim/urunler/ice-aktar" className="btn btn-outline">
            <FileSpreadsheet size={16} aria-hidden /> Excel&apos;den aktar
          </Link>
          <Link href="/yonetim/urunler/yeni" className="btn btn-primary">
            <Plus size={16} aria-hidden /> Yeni ürün
          </Link>
        </div>
      </div>

      <RememberSort value={params.sirala === undefined ? undefined : sort ? sortParam(sort) : ""} />
      <RememberFilters value={filtersInUrl ? filtersCookieValue(filter, categoryId) : undefined} />

      <div className="mt-5">
        <StatusNote status={params.durum} count={params.adet} />
      </div>

      <form action="/yonetim/urunler" className="flex flex-wrap gap-2">
        <input type="hidden" name="filtre" value={filter} />
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
        {/* Telefonda tablo başlıkları yok; sıralama buradan seçilir (masaüstünde de aramayla birlikte korunur). */}
        <select name="sirala" defaultValue={sort ? sortParam(sort) : DEFAULT_SORT_PARAM} aria-label="Sırala" className="field min-w-0 flex-1 md:hidden">
          <option value={DEFAULT_SORT_PARAM}>Sırala: Son güncellenen</option>
          {sortableColumns.map((column) => (
            <optgroup key={column.key} label={column.label}>
              <option value={sortParam({ column: column.key, direction: "artan" } satisfies ProductSort)}>{column.label} (artan)</option>
              <option value={sortParam({ column: column.key, direction: "azalan" } satisfies ProductSort)}>{column.label} (azalan)</option>
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

      {/* Toplu seçim/silme: araç çubuğu ve her iki görünüm (kartlar, tablo) aynı seçimi paylaşır. */}
      <BulkSelect
        pageIds={items.map((product) => product.id)}
        total={total}
        filter={{ q, kategori: categoryId, filtre: filter }}
        reset={params.durum === "toplu-silindi"}
        deleteAction={deleteProducts}
        editAction={editProducts}
      >
      {/* Mobil: tablo yerine kartlar. Altı sütun dar ekrana sığmıyor; fiyat, stok ve durum yana kayıp kayboluyordu. */}
      <ul className="mt-2 space-y-2 md:hidden">
        {items.map((product) => (
          <li key={product.id} className="rounded-xl border border-neutral-200 bg-raised p-3">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center">
                <BulkCheckbox id={product.id} label={product.name} />
              </span>
              <Link href={`/yonetim/urunler/${product.id}`} className="block min-w-0 flex-1">
                <span className="block break-words font-bold">
                  {product.name}
                  {product.isFeatured && <span className="ml-1.5 rounded bg-brand-500 px-1.5 py-0.5 align-middle text-[10px] font-extrabold text-ink">Öne çıkan</span>}
                </span>
                <span className="mt-0.5 block text-xs text-neutral-500">
                  {product.sku} · {product.category.name}
                {product.brand ? ` · ${product.brand.name}` : ""}
                </span>
              </Link>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <p className="min-w-0 flex-1 text-sm">
                <span className="font-extrabold">{formatPrice(product.priceKurus)}</span>
                {product.compareAtKurus && (
                  <span className="ml-1.5 text-xs text-neutral-500">
                    <span className="line-through">{formatPrice(product.compareAtKurus)}</span> %{discountPercent(product.priceKurus, product.compareAtKurus) ?? 0}
                  </span>
                )}
                {product.costKurus != null && <span className="ml-1.5 text-xs font-normal text-neutral-500">Alış {formatPrice(product.costKurus)}</span>}
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
              <th className="w-10 py-3 pl-4"><span className="sr-only">Seç</span></th>
              {sortHeader("ad")}
              {sortHeader("kategori")}
              {sortHeader("fiyat", "right")}
              {sortHeader("stok", "right")}
              {sortHeader("durum")}
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {items.map((product) => (
              <tr key={product.id}>
                <td className="py-3 pl-4">
                  <BulkCheckbox id={product.id} label={product.name} />
                </td>
                <td className="px-4 py-3">
                  <Link href={`/yonetim/urunler/${product.id}`} className="font-bold hover:underline">
                    {product.name}
                  </Link>
                  {product.isFeatured && <span className="ml-1.5 rounded bg-brand-500 px-1.5 py-0.5 align-middle text-[10px] font-extrabold text-ink">Öne çıkan</span>}
                  <span className="block text-xs text-neutral-500">
                    {product.sku}
                    {product.barcode ? ` · ${product.barcode}` : ""}
                    {product.brand ? ` · ${product.brand.name}` : ""}
                  </span>
                </td>
                <td className="px-4 py-3 text-neutral-600">{product.category.name}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-semibold">
                  {formatPrice(product.priceKurus)}
                  {product.compareAtKurus && (
                    <span className="block text-xs font-normal text-neutral-500">
                      <span className="line-through">{formatPrice(product.compareAtKurus)}</span> %{discountPercent(product.priceKurus, product.compareAtKurus) ?? 0}
                    </span>
                  )}
                  {product.costKurus != null && <span className="block text-xs font-normal text-neutral-500">Alış {formatPrice(product.costKurus)}</span>}
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
                <td colSpan={7} className="px-4 py-10 text-center text-neutral-500">
                  Bu seçime uygun ürün yok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      </BulkSelect>

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
