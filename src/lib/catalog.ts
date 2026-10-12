import "server-only";
import type { Prisma } from "@prisma/client";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "./db";

// 2, 4 ve 5 sütunlu ızgaralarda son satır yarım kalmasın diye 20.
export const PAGE_SIZE = 20;

export const productCardInclude = {
  category: { include: { parent: true } },
  images: { orderBy: { sortOrder: "asc" }, take: 1 },
} satisfies Prisma.ProductInclude;

export type ProductCardData = Prisma.ProductGetPayload<{ include: typeof productCardInclude }>;

export const sortOptions = [
  { key: "onerilen", label: "Önerilen" },
  { key: "yeni", label: "En yeniler" },
  { key: "fiyat-artan", label: "En düşük fiyat" },
  { key: "fiyat-azalan", label: "En yüksek fiyat" },
] as const;

export type SortKey = (typeof sortOptions)[number]["key"];

export function parseSort(value: string | undefined): SortKey {
  return sortOptions.some((o) => o.key === value) ? (value as SortKey) : "onerilen";
}

export function parsePage(value: string | undefined): number {
  const page = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

// Adresteki marka listesi (?marka=a&marka=b): yalnızca güvenli adres karakterleri, en fazla 20 marka.
export function parseBrands(value: string | string[] | undefined): string[] {
  const list = Array.isArray(value) ? value : value ? [value] : [];
  return [...new Set(list.filter((slug) => /^[a-z0-9-]{1,80}$/.test(slug)))].slice(0, 20);
}

const orderBy: Record<SortKey, Prisma.ProductOrderByWithRelationInput[]> = {
  onerilen: [{ isFeatured: "desc" }, { createdAt: "desc" }],
  yeni: [{ createdAt: "desc" }],
  "fiyat-artan": [{ priceKurus: "asc" }],
  "fiyat-azalan": [{ priceKurus: "desc" }],
};

// Katalog okumaları "use cache" ile önbelleğe alınır: sayfalar her istekte veritabanına gitmez.
// Kategoriler saatlik, ürün verisi (fiyat/stok) dakikalık yenilenir. Ürün veya kategori değiştiren
// her işlem (içe aktarma, yönetim paneli) sonunda revalidateTag(CATALOG_TAG, "max") çağırmalı.
export const CATALOG_TAG = "catalog";

export async function getNavCategories() {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOG_TAG);

  return db.category.findMany({
    where: { parentId: null },
    orderBy: { sortOrder: "asc" },
    include: { children: { orderBy: { sortOrder: "asc" } } },
  });
}

export async function getCategoryBySlug(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOG_TAG);

  return db.category.findUnique({
    where: { slug },
    include: { parent: true, children: { orderBy: { sortOrder: "asc" } } },
  });
}

export async function countCategoryProducts(categoryIds: string[]) {
  "use cache";
  cacheLife("minutes");
  cacheTag(CATALOG_TAG);

  return db.product.count({ where: { isActive: true, categoryId: { in: categoryIds } } });
}

export async function getAllCategorySlugs() {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOG_TAG);

  const categories = await db.category.findMany({ select: { slug: true } });
  return categories.map((category) => category.slug);
}

interface ListParams {
  categoryIds?: string[];
  query?: string;
  inStockOnly?: boolean;
  // Marka adresleri (slug); boşsa marka filtresi yok.
  brandSlugs?: string[];
  // Kuruş cinsinden fiyat aralığı (KDV dahil, ürün fiyatıyla aynı birim).
  minPriceKurus?: number;
  maxPriceKurus?: number;
  sort?: SortKey;
  page?: number;
}

export async function listProducts({
  categoryIds,
  query,
  inStockOnly,
  brandSlugs,
  minPriceKurus,
  maxPriceKurus,
  sort = "onerilen",
  page = 1,
}: ListParams) {
  "use cache";
  cacheLife("minutes");
  cacheTag(CATALOG_TAG);

  const where: Prisma.ProductWhereInput = {
    isActive: true,
    ...(categoryIds ? { categoryId: { in: categoryIds } } : {}),
    ...(inStockOnly ? { stock: { gt: 0 } } : {}),
    ...(brandSlugs && brandSlugs.length > 0 ? { brand: { slug: { in: brandSlugs } } } : {}),
    ...(minPriceKurus !== undefined || maxPriceKurus !== undefined
      ? { priceKurus: { ...(minPriceKurus !== undefined ? { gte: minPriceKurus } : {}), ...(maxPriceKurus !== undefined ? { lte: maxPriceKurus } : {}) } }
      : {}),
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
            { sku: { contains: query, mode: "insensitive" } },
            { barcode: query },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    db.product.findMany({
      where,
      include: productCardInclude,
      orderBy: orderBy[sort],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.product.count({ where }),
  ]);

  return { items, total, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

// Filtre çekmecesindeki seçenekler: kategorideki markalar ve en düşük / en yüksek fiyat (kuruş).
export async function getFilterOptions(categoryIds: string[]) {
  "use cache";
  cacheLife("minutes");
  cacheTag(CATALOG_TAG);

  const where: Prisma.ProductWhereInput = { isActive: true, categoryId: { in: categoryIds } };
  const [brands, range] = await Promise.all([
    db.brand.findMany({
      where: { products: { some: where } },
      select: { slug: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.product.aggregate({ where, _min: { priceKurus: true }, _max: { priceKurus: true } }),
  ]);
  return { brands, minPriceKurus: range._min.priceKurus, maxPriceKurus: range._max.priceKurus };
}

// "Yeni" rozeti için kesit: bu zamandan (ms) sonra eklenen ürün yenidir; rozet gösterilmemeliyse null.
// Toplu içe aktarmada (stok programından 10 bin ürün) hepsi aynı gün eklenir ve hepsine "Yeni" demek
// anlamsızdır; son 14 günde eklenenler katalogun beşte birinden ya da 30 üründen fazlaysa rozet kapanır.
// Zaman okuması önbellek içinde olduğundan sayfaların sabit kabuğuna girebilir.
const NEW_PRODUCT_DAYS = 14;

export async function getNewProductCutoff(): Promise<number | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag(CATALOG_TAG);

  const cutoff = Date.now() - NEW_PRODUCT_DAYS * 24 * 60 * 60 * 1000;
  const [recent, total] = await Promise.all([
    db.product.count({ where: { isActive: true, createdAt: { gt: new Date(cutoff) } } }),
    db.product.count({ where: { isActive: true } }),
  ]);
  return recent > 30 || recent * 5 > total ? null : cutoff;
}

// Ürün sayfasındaki "Yanına yakışanlar": önce aynı siparişlerde birlikte alınanlar, sonra aynı ana
// kategorinin diğer alt kategorilerinden öne çıkanlar (kalemin yanına defter gibi). Stokta olanlar gelir.
export async function getComplementaryProducts(productId: string, categoryId: string, rootId: string, take = 4) {
  "use cache";
  cacheLife("minutes");
  cacheTag(CATALOG_TAG);

  const together = await db.orderItem.groupBy({
    by: ["productId"],
    where: {
      productId: { not: null },
      order: {
        status: { notIn: ["CANCELLED", "REFUNDED"] },
        items: { some: { productId } },
      },
    },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: take + 1,
  });
  const togetherIds = together.map((row) => row.productId).filter((id): id is string => id !== null && id !== productId);

  const first = togetherIds.length
    ? await db.product.findMany({
        where: { id: { in: togetherIds }, isActive: true, stock: { gt: 0 } },
        include: productCardInclude,
        take,
      })
    : [];
  // Birlikte alınma sırasını koru.
  first.sort((a, b) => togetherIds.indexOf(a.id) - togetherIds.indexOf(b.id));

  const missing = take - first.length;
  if (missing <= 0) return first;

  const filler = await db.product.findMany({
    where: {
      isActive: true,
      stock: { gt: 0 },
      id: { notIn: [productId, ...first.map((p) => p.id)] },
      categoryId: { not: categoryId },
      category: { OR: [{ id: rootId }, { parentId: rootId }] },
    },
    include: productCardInclude,
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
    take: missing,
  });
  return [...first, ...filler];
}

export interface SearchSuggestions {
  categories: { slug: string; name: string; parentName: string | null }[];
  products: { slug: string; name: string; priceKurus: number; categoryName: string; rootSlug: string }[];
  // Aramayla eşleşen toplam ürün (listede yalnızca ilk birkaçı gösterilir).
  total: number;
}

// Arama kutusundaki otomatik tamamlama. Eşleşme kuralı listProducts ile aynı olmalı ki öneri sayısı ile
// sonuç sayfası tutarlı kalsın. Sorgu metni anahtar olduğundan aynı yazım dakikalık önbellekten gelir.
export async function getSearchSuggestions(query: string): Promise<SearchSuggestions> {
  "use cache";
  cacheLife("minutes");
  cacheTag(CATALOG_TAG);

  const where: Prisma.ProductWhereInput = {
    isActive: true,
    OR: [
      { name: { contains: query, mode: "insensitive" } },
      { description: { contains: query, mode: "insensitive" } },
      { sku: { contains: query, mode: "insensitive" } },
      { barcode: query },
    ],
  };

  const [categories, products, total] = await Promise.all([
    db.category.findMany({
      where: { name: { contains: query, mode: "insensitive" } },
      include: { parent: { select: { name: true } } },
      orderBy: { sortOrder: "asc" },
      take: 3,
    }),
    db.product.findMany({
      where,
      select: {
        slug: true,
        name: true,
        priceKurus: true,
        category: { select: { slug: true, name: true, parent: { select: { slug: true } } } },
      },
      orderBy: [{ isFeatured: "desc" }, { name: "asc" }],
      take: 6,
    }),
    db.product.count({ where }),
  ]);

  return {
    categories: categories.map((c) => ({ slug: c.slug, name: c.name, parentName: c.parent?.name ?? null })),
    products: products.map((p) => ({
      slug: p.slug,
      name: p.name,
      priceKurus: p.priceKurus,
      categoryName: p.category.name,
      rootSlug: p.category.parent?.slug ?? p.category.slug,
    })),
    total,
  };
}

export async function getFeaturedProducts(take = 8) {
  "use cache";
  cacheLife("minutes");
  cacheTag(CATALOG_TAG);

  return db.product.findMany({
    where: { isActive: true, isFeatured: true },
    include: productCardInclude,
    orderBy: { createdAt: "desc" },
    take,
  });
}

export async function getDiscountedProducts(take = 4) {
  "use cache";
  cacheLife("minutes");
  cacheTag(CATALOG_TAG);

  return db.product.findMany({
    where: { isActive: true, compareAtKurus: { not: null } },
    include: productCardInclude,
    orderBy: { updatedAt: "desc" },
    take,
  });
}

export async function getNewestProducts(take = 8) {
  "use cache";
  cacheLife("minutes");
  cacheTag(CATALOG_TAG);

  return db.product.findMany({
    where: { isActive: true },
    include: productCardInclude,
    orderBy: { createdAt: "desc" },
    take,
  });
}

export async function getProductBySlug(slug: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag(CATALOG_TAG);

  return db.product.findUnique({
    where: { slug },
    include: {
      category: { include: { parent: true } },
      brand: true,
      images: { orderBy: { sortOrder: "asc" } },
      attributes: { orderBy: { sortOrder: "asc" } },
    },
  });
}

export async function getRelatedProducts(categoryId: string, excludeId: string, take = 4) {
  "use cache";
  cacheLife("minutes");
  cacheTag(CATALOG_TAG);

  return db.product.findMany({
    where: { isActive: true, categoryId, id: { not: excludeId } },
    include: productCardInclude,
    take,
  });
}

// Build sırasında önceden üretilecek ürün sayfaları. Geri kalanlar ilk ziyarette üretilip önbelleğe alınır.
export async function getPrerenderProductSlugs() {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOG_TAG);

  const products = await db.product.findMany({
    where: { isActive: true, isFeatured: true },
    select: { slug: true },
    take: 50,
  });
  return products.map((product) => product.slug);
}

export async function getSitemapEntries() {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOG_TAG);

  const [categories, products] = await Promise.all([
    db.category.findMany({ select: { slug: true } }),
    db.product.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }),
  ]);
  return { categories, products };
}