// /api/urun-ozet yanıtının biçimi: hızlı bakış penceresi (QuickViewHost) bunu okur.
export type ProductSummary = {
  id: string;
  slug: string;
  name: string;
  description: string;
  priceKurus: number;
  compareAtKurus: number | null;
  stock: number;
  categoryName: string;
  rootSlug: string;
  brand: string | null;
  image: { url: string; alt: string | null } | null;
  attributes: { name: string; value: string }[];
};
