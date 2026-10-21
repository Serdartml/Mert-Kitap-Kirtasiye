import type { Prisma } from "@prisma/client";

// "Stok azalıyor" tanımı: yönetim paneli (özet, ürün listesi süzgeci) ve mağazadaki "Son N adet" rozeti aynı kuralı kullanır.
// Kitaplarda (kültür ve hazırlık kitaplarının tümü: çocuk, kişisel gelişim, roman...) stok azalıyor uyarısı yoktur.

export const LOW_STOCK = 2;

export const BOOK_ROOT_SLUGS = ["kultur-kitaplari", "hazirlik-kitaplari"];

export const isBookRoot = (rootSlug: string) => BOOK_ROOT_SLUGS.includes(rootSlug);

// rootSlug: ürünün ana kategorisinin adresi (alt kategorideyse üst kategorisininki).
export const isLowStock = (stock: number, rootSlug: string) => stock > 0 && stock <= LOW_STOCK && !isBookRoot(rootSlug);

// Ürün kitap kategorisindeyse (ana kategori ya da alt kategorisi) eşleşir.
export const bookCategoryWhere: Prisma.ProductWhereInput = {
  category: { OR: [{ slug: { in: BOOK_ROOT_SLUGS } }, { parent: { slug: { in: BOOK_ROOT_SLUGS } } }] },
};

export const lowStockWhere: Prisma.ProductWhereInput = {
  stock: { gt: 0, lte: LOW_STOCK },
  NOT: bookCategoryWhere,
};
