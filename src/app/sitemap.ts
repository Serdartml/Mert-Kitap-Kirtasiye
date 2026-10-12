import type { MetadataRoute } from "next";
import { getSitemapEntries } from "@/lib/catalog";
import { isIndexable } from "@/lib/indexing";
import { schoolLists } from "@/lib/school-lists";
import { site } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Deneme yayınında sitemap boş (lib/indexing.ts).
  if (!isIndexable()) return [];

  const { categories, products } = await getSitemapEntries();

  return [
    { url: site.url },
    { url: `${site.url}/hakkimizda` },
    { url: `${site.url}/iletisim` },
    { url: `${site.url}/okul-listeleri` },
    ...schoolLists.map((list) => ({ url: `${site.url}/okul-listeleri/${list.slug}` })),
    ...categories.map((category) => ({ url: `${site.url}/kategori/${category.slug}` })),
    ...products.map((product) => ({ url: `${site.url}/urun/${product.slug}`, lastModified: product.updatedAt })),
  ];
}
