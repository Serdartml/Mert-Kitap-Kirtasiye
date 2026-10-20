import type { Prisma } from "@prisma/client";

// Yönetim marka listesinin süzgeçleri ve toplu işlem sonrası geri dönüş adresi.

export const brandFilters = [
  { key: "", label: "Tümü" },
  { key: "toptanci", label: "Toptancı (sitede gizli)" },
  { key: "marka", label: "Marka (sitede görünür)" },
];

export const brandSorts = [
  { key: "ad", label: "Ada göre" },
  { key: "urun", label: "Ürün sayısına göre" },
];

export interface BrandListFilter {
  q: string;
  filter: string;
}

export function brandListWhere({ q, filter }: BrandListFilter): Prisma.BrandWhereInput {
  return {
    ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
    ...(filter === "toptanci" ? { isWholesaler: true } : filter === "marka" ? { isWholesaler: false } : {}),
  };
}

export function brandOrderBy(sort: string): Prisma.BrandOrderByWithRelationInput[] {
  return sort === "urun" ? [{ products: { _count: "desc" } }, { name: "asc" }] : [{ name: "asc" }];
}

// Toplu işlemden sonra kullanıcı kaldığı listeye dönsün diye form, o anki süzgeçleri taşır. Gelen değer güvenilmez:
// yalnızca bilinen anahtarlar ve kısa değerler geçer, böylece yönlendirme hep /yonetim/markalar altında kalır.
const BACK_KEYS = ["q", "filtre", "sirala", "sayfa"];

export function brandBackQuery(raw: string): URLSearchParams {
  const source = new URLSearchParams(raw.replace(/^\?/, ""));
  const safe = new URLSearchParams();
  for (const key of BACK_KEYS) {
    const value = source.get(key);
    if (value && value.length <= 100) safe.set(key, value);
  }
  return safe;
}
