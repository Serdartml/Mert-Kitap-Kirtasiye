// İndirim modeli: "eski fiyat" (compareAtKurus) üstü çizili asıl fiyattır, "satış fiyatı" (priceKurus) güncel fiyattır.
// Ürün formunda yüzde yazılınca indirim her zaman asıl fiyat üzerinden hesaplanır; böylece yüzde değiştikçe fiyat tekrar tekrar düşmez.

export const MAX_DISCOUNT_PERCENT = 90;

export const originalKurus = (priceKurus: number, compareAtKurus: number | null) => (compareAtKurus != null && compareAtKurus > priceKurus ? compareAtKurus : priceKurus);

// null: uygulanamaz (indirimli fiyat 1 kuruşun altına düşer ya da hiç düşmez).
export function applyDiscount(priceKurus: number, compareAtKurus: number | null, percent: number): { priceKurus: number; compareAtKurus: number } | null {
  const original = originalKurus(priceKurus, compareAtKurus);
  const next = Math.round((original * (100 - percent)) / 100);
  if (next < 1 || next >= original) return null;
  return { priceKurus: next, compareAtKurus: original };
}

// Fiyat alanlarındaki yazıdan indirim yüzdesi (en çok iki ondalık, virgüllü); indirim yoksa ya da alanlar geçersizse "".
export function percentOf(price: number | null, compareAt: number | null): string {
  if (price == null || compareAt == null || compareAt <= price) return "";
  return String(Math.round(((compareAt - price) / compareAt) * 10000) / 100).replace(".", ",");
}

// Yüzde alanına yazılan değer: 0'dan büyük, en çok 90, en çok iki ondalık. Geçersizse null.
export function parsePercent(raw: string): number | null {
  const value = raw.trim().replace("%", "").trim();
  if (!/^\d{1,2}([.,]\d{1,2})?$/.test(value)) return null;
  const percent = Number(value.replace(",", "."));
  return percent > 0 && percent <= MAX_DISCOUNT_PERCENT ? percent : null;
}
