import type { MetadataRoute } from "next";
import { getSitemapEntries } from "@/lib/catalog";
import { site } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { categories, products } = await getSitemapEntries();

  return [
    { url: site.url },
    { url: `${site.url}/hakkimizda` },
    { url: `${site.url}/iletisim` },
    ...categories.map((category) => ({ url: `${site.url}/kategori/${category.slug}` })),
    ...products.map((product) => ({ url: `${site.url}/urun/${product.slug}`, lastModified: product.updatedAt })),
  ];
}
