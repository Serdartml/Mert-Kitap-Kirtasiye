// Site arama motorlarına açık mı? Varsayılan KAPALI: deneme / test yayını (örn. *.vercel.app) Google'a düşmesin.
// Gerçek yayına çıkarken ortam değişkeni SITE_INDEXABLE=1 verilir. Kapalıyken robots.txt her şeyi yasaklar,
// sitemap boş döner ve tüm sayfalara noindex eklenir (app/layout.tsx).
export function isIndexable(): boolean {
  return process.env.SITE_INDEXABLE === "1";
}
