const tryFormatter = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
});

export function formatPrice(kurus: number): string {
  return tryFormatter.format(kurus / 100);
}

export function discountPercent(priceKurus: number, compareAtKurus: number | null): number | null {
  if (!compareAtKurus || compareAtKurus <= priceKurus) return null;
  return Math.round(((compareAtKurus - priceKurus) / compareAtKurus) * 100);
}
