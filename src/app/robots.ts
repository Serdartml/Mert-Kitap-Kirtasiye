import type { MetadataRoute } from "next";
import { isIndexable } from "@/lib/indexing";
import { site } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  // Deneme yayınında (SITE_INDEXABLE=1 yok) her şey yasak; sitemap da yok (lib/indexing.ts).
  if (!isIndexable()) return { rules: { userAgent: "*", disallow: "/" } };

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/sepet", "/odeme", "/arama", "/giris", "/kayit", "/hesabim", "/siparis", "/siparis-takip", "/yonetim", "/api"],
    },
    sitemap: `${site.url}/sitemap.xml`,
  };
}
