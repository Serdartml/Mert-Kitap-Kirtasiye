import "server-only";
import type { Prisma } from "@prisma/client";
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

export function getNavCategories() {
  return db.category.findMany({
    where: { parentId: null },
    orderBy: { sortOrder: "asc" },
    include: { children: { orderBy: { sortOrder: "asc" } } },
  });
}

export function getCategoryBySlug(slug: string) {
  return db.category.findUnique({
    where: { slug },
    include: { parent: true, children: { orderBy: { sortOrder: "asc" } } },
  });
}

interface ListParams {
  categoryIds?: string[];
  query?: string;
  inStockOnly?: boolean;
  sort?: SortKey;
  page?: number;
}

export async function listProducts({ categoryIds, query, inStockOnly, sort = "onerilen", page = 1 }: ListParams) {
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

export function getFeaturedProducts(take = 8) {
  return db.product.findMany({
    where: { isActive: true, isFeatured: true },
    include: productCardInclude,
    orderBy: { createdAt: "desc" },
    take,
  });
}

export function getDiscountedProducts(take = 4) {
  return db.product.findMany({
    where: { isActive: true, compareAtKurus: { not: null } },
    include: productCardInclude,
    orderBy: { updatedAt: "desc" },
    take,
  });
}

export function getNewestProducts(take = 8) {
  return db.product.findMany({
    where: { isActive: true },
    include: productCardInclude,
    orderBy: { createdAt: "desc" },
    take,
  });
}

export function getProductBySlug(slug: string) {
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

export function getRelatedProducts(categoryId: string, excludeId: string, take = 4) {
  return db.product.findMany({
    where: { isActive: true, categoryId, id: { not: excludeId } },
    include: productCardInclude,
    take,
  });
}
