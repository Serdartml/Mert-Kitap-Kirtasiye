// Arama için metin katlama: büyük/küçük harf ve Türkçe karakter farkı yok sayılır ("Çizim", "cizim" ve "CIZIM" aynıdır).
// Aynı eşleme SQL tarafında da kullanılır (lib/search.ts ve arama indeksleri migration'ı); üçü birlikte değişmeli.
// ı ve i birleştirilir: aksansız yazanlar ("kirtasiye") ile büyük harfle yazanlar ("KIRTASIYE") da bulunur.
export const FOLD_FROM = "İIıÇçĞğÖöŞşÜüÂâÎîÛû";
export const FOLD_TO = "iiiccggoossuuaaiiuu";

const foldMap = new Map([...FOLD_FROM].map((char, index) => [char, FOLD_TO[index]]));

export function foldTr(text: string): string {
  let result = "";
  for (const char of text) result += foldMap.get(char) ?? char;
  return result.toLowerCase();
}

// Aramanın kelimeleri (katlanmış): boşluklara göre bölünür, en fazla 6 kelime, her biri en fazla 50 karakter.
export function searchTokens(query: string): string[] {
  return [
    ...new Set(
      foldTr(query)
        .split(/\s+/)
        .filter(Boolean)
        .map((token) => token.slice(0, 50)),
    ),
  ].slice(0, 6);
}

// LIKE kalıbında özel anlamı olan karakterleri kaçırır (kaçış karakteri "!": SQL tarafında ESCAPE '!').
export function escapeLike(text: string): string {
  return text.replace(/[!%_]/g, (char) => `!${char}`);
}
