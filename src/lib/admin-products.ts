import type { Prisma } from "@prisma/client";
import { lowStockWhere } from "./low-stock";

// Yönetim ürün listesinin filtreleri. Liste sayfası, toplu silme ve toplu düzenleme aynı koşulu kullanır; böylece
// "bu aramadaki tüm ürünleri sil/düzenle" tam olarak listede görünen ürünleri etkiler.

export const productFilters = [
  { key: "", label: "Tümü" },
  { key: "yayinda", label: "Yayında" },
  { key: "pasif", label: "Pasif" },
  { key: "indirimli", label: "İndirimli" },
  { key: "onecikan", label: "Öne çıkan" },
  { key: "stoksuz", label: "Stokta yok" },
  { key: "azalan", label: "Stok azalıyor" },
];

const filterWhere: Record<string, Prisma.ProductWhereInput> = {
  yayinda: { isActive: true },
  pasif: { isActive: false },
  indirimli: { compareAtKurus: { not: null } },
  onecikan: { isFeatured: true },
  stoksuz: { stock: 0 },
  azalan: lowStockWhere,
};

export const isProductFilter = (key: string | undefined): key is string => !!key && key in filterWhere;

// Seçilen süzgeç ve kategori çereze yazılır; adreste ikisi de yoksa (menüden girişte, kayıt sonrası dönüşte) oradan okunur.
// Adreste "filtre=" ya da "kategori=" geçiyorsa (boş olsa bile) seçim açıkça adresten gelir.
export const FILTER_COOKIE = "yonetim-urun-filtre";

export const filtersCookieValue = (filter: string, categoryId: string) => (filter || categoryId ? `${filter}~${categoryId}` : "");

export function parseSavedFilters(value: string | undefined): { filter: string; categoryId: string } {
  const [filter = "", categoryId = ""] = (value ?? "").split("~");
  return { filter: isProductFilter(filter) ? filter : "", categoryId: /^[A-Za-z0-9]{1,40}$/.test(categoryId) ? categoryId : "" };
}

// Sütun başlıklarından sıralama: adres parametresi "sirala=fiyat-artan" biçimindedir.
export const sortableColumns = [
  { key: "ad", label: "Ad" },
  { key: "kategori", label: "Kategori" },
  { key: "fiyat", label: "Fiyat" },
  { key: "stok", label: "Stok" },
  { key: "durum", label: "Durum" },
] as const;

export type SortColumn = (typeof sortableColumns)[number]["key"];
export type SortDirection = "artan" | "azalan";
export interface ProductSort {
  column: SortColumn;
  direction: SortDirection;
}

export function parseProductSort(value: string | undefined): ProductSort | null {
  const [column, direction] = (value ?? "").split("-");
  if (!sortableColumns.some((item) => item.key === column) || (direction !== "artan" && direction !== "azalan")) return null;
  return { column: column as SortColumn, direction };
}

export const sortParam = (sort: ProductSort) => `${sort.column}-${sort.direction}`;

// Seçilen sıralama çerezde hatırlanır; adreste "sirala=son" varsayılan (son güncellenen) sıralamayı açıkça seçer.
export const SORT_COOKIE = "yonetim-urun-sirala";
export const DEFAULT_SORT_PARAM = "son";

// Sıralama yoksa son güncellenen üstte. Eşit değerlerde sayfalar arasında ürün atlanmasın/tekrarlanmasın diye
// her zaman benzersiz bir ikinci anahtar eklenir.
export function productOrderBy(sort: ProductSort | null): Prisma.ProductOrderByWithRelationInput[] {
  if (!sort) return [{ updatedAt: "desc" }, { id: "asc" }];
  const dir: Prisma.SortOrder = sort.direction === "artan" ? "asc" : "desc";
  const primary: Prisma.ProductOrderByWithRelationInput = {
    ad: { name: dir },
    kategori: { category: { name: dir } },
    fiyat: { priceKurus: dir },
    stok: { stock: dir },
    durum: { isActive: dir },
  }[sort.column];
  return sort.column === "ad" ? [primary, { id: "asc" }] : [primary, { name: "asc" }, { id: "asc" }];
}

export interface ProductListFilter {
  q: string;
  categoryId: string;
  filter: string;
}

interface RootCategory {
  id: string;
  children: { id: string }[];
}

export function productListWhere({ q, categoryId, filter }: ProductListFilter, rootCategories: RootCategory[]): Prisma.ProductWhereInput {
  // Ana kategori seçilirse alt kategorilerindeki ürünler de gelir.
  const selectedRoot = rootCategories.find((category) => category.id === categoryId);
  const categoryIds = selectedRoot ? [selectedRoot.id, ...selectedRoot.children.map((child) => child.id)] : categoryId ? [categoryId] : null;

  return {
    ...(filter && filterWhere[filter] ? filterWhere[filter] : {}),
    ...(categoryIds ? { categoryId: { in: categoryIds } } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { sku: { contains: q, mode: "insensitive" } },
            { barcode: { contains: q } },
            // Ürün adlarında marka yazmadığı için marka adıyla da bulunur.
            { brand: { name: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
}
