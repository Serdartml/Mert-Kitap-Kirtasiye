import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { site } from "@/lib/site";

// Katalog veritabanından geldiği için build sırasında değil istek anında üretilir.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, products] = await Promise.all([
    db.category.findMany({ select: { slug: true } }),
    db.product.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }),
  ]);

  return [
    { url: site.url },
    { url: `${site.url}/hakkimizda` },
    { url: `${site.url}/iletisim` },
    ...categories.map((category) => ({ url: `${site.url}/kategori/${category.slug}` })),
    ...products.map((product) => ({ url: `${site.url}/urun/${product.slug}`, lastModified: product.updatedAt })),
  ];
}
