import "server-only";

// ISBN barkodlu kitaplar için kapak görseli bulma (Open Library). Türkiye'deki bazı ağlardan kapak sunucusuna
// (archive.org altyapısı) erişilemez; bu kod sunucuda (Vercel) çalışır, görseller R2'ye kopyalanır ve oradan sunulur.

const USER_AGENT = "MertKitap/1.0 (kitap kapagi eslestirme; serdarrtml@gmail.com)";
// Bundan küçük dosyalar gerçek kapak değil (yer tutucu ya da hata sayfası) sayılır.
const MIN_COVER_BYTES = 2000;

export const isIsbn13 = (barcode: string) => /^97[89]\d{10}$/.test(barcode);

// ISBN -> büyük boy kapak adresi. Open Library'de kapağı olmayan ISBN sonuçta yer almaz.
export async function lookupCoverUrls(isbns: string[]): Promise<Map<string, string>> {
  const found = new Map<string, string>();
  if (isbns.length === 0) return found;
  const bibkeys = isbns.map((isbn) => `ISBN:${isbn}`).join(",");
  try {
    const response = await fetch(`https://openlibrary.org/api/books?bibkeys=${bibkeys}&format=json`, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return found;
    const data = (await response.json()) as Record<string, { thumbnail_url?: string }>;
    for (const isbn of isbns) {
      const thumbnail = data[`ISBN:${isbn}`]?.thumbnail_url;
      if (thumbnail) found.set(isbn, thumbnail.replace(/-S\.jpg$/, "-L.jpg"));
    }
  } catch {
    // Ağ hatası ya da zaman aşımı: bu grupta kapak bulunamadı sayılır, sonraki çalıştırmada yeniden denenir.
  }
  return found;
}

export async function downloadCover(url: string): Promise<{ bytes: Uint8Array; type: string } | null> {
  try {
    const response = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(8000) });
    const type = response.headers.get("content-type") ?? "";
    if (!response.ok || !type.startsWith("image/")) return null;
    const bytes = new Uint8Array(await response.arrayBuffer());
    return bytes.length >= MIN_COVER_BYTES ? { bytes, type: type.split(";")[0] } : null;
  } catch {
    return null;
  }
}
