const turkishMap: Record<string, string> = {
  ç: "c", Ç: "c", ğ: "g", Ğ: "g", ı: "i", I: "i", İ: "i", ö: "o", Ö: "o", ş: "s", Ş: "s", ü: "u", Ü: "u",
};

// "Çizim Seti 12'li" -> "cizim-seti-12li"
export function slugify(text: string): string {
  return text
    .replace(/[çÇğĞıIİöÖşŞüÜ]/g, (char) => turkishMap[char] ?? char)
    .toLowerCase()
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// "449,90", "449.90", "1.249,90", "449" -> kuruş. Geçersizse null.
export function parsePriceToKurus(input: string): number | null {
  const cleaned = input.trim().replace(/\s|₺|TL/gi, "");
  if (!cleaned) return null;

  // Virgül varsa ondalık ayırıcı odur ve noktalar binlik ayırıcıdır.
  const normalized = cleaned.includes(",") ? cleaned.replace(/\./g, "").replace(",", ".") : cleaned;
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;

  return Math.round(Number(normalized) * 100);
}

export function kurusToInput(kurus: number | null | undefined): string {
  return kurus == null ? "" : (kurus / 100).toFixed(2).replace(".", ",");
}
