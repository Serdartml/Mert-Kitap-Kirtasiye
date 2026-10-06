import "server-only";
import type { Prisma } from "@prisma/client";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "./db";

export const PAGE_SIZE = 12;

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
  sort?: SortKey;
  page?: number;
}

export async function listProducts({ categoryIds, query, inStockOnly, sort = "onerilen", page = 1 }: ListParams) {
  "use cache";
  cacheLife("minutes");
  cacheTag(CATALOG_TAG);

  const where: Prisma.ProductWhereInput = {
    isActive: true,
    ...(categoryIds ? { categoryId: { in: categoryIds } } : {}),
    ...(inStockOnly ? { stock: { gt: 0 } } : {}),
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