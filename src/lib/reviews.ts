// Ürün yorumlarıyla ilgili saf yardımcılar (veritabanına dokunmaz; testlenebilir).

export const MIN_COMMENT_LENGTH = 10;
export const MAX_COMMENT_LENGTH = 1000;

// Yorumda tam ad yerine "Ali V." gösterilir: müşterinin soyadı herkese açık olmasın.
export function reviewerName(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Müşterimiz";
  if (parts.length === 1) return parts[0];
  const last = parts[parts.length - 1];
  return `${parts.slice(0, -1).join(" ")} ${last.charAt(0).toLocaleUpperCase("tr-TR")}.`;
}

// Ortalama puan tek ondalıkla ("4,5"); yorum yoksa null.
export function averageRating(ratings: number[]): number | null {
  if (ratings.length === 0) return null;
  return Math.round((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length) * 10) / 10;
}
