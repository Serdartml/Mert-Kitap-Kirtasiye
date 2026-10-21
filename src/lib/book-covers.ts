import "server-only";

// ISBN barkodlu kitaplar için kapak görseli bulma (Open Library). Türkiye'deki bazı ağlardan kapak sunucusuna
// (archive.org altyapısı) erişilemez; bu kod sunucuda (Vercel) çalışır, görseller R2'ye kopyalanır ve oradan sunulur.

const USER_AGENT = "MertKitap/1.0 (kitap kapagi eslestirme; serdarrtml@gmail.com)";
// Bundan küçük dosyalar gerçek kapak değil (yer tutucu ya da hata sayfası) sayılır.
const MIN_COVER_BYTES = 2000;

export const isIsbn13 = (barcode: string) => /^97[89]\d{10}$/.test(barcode);

export interface CoverLookup {
  urls: Map<string, string>;
  // Arama başarısızsa nedeni (HTTP durumu ya da hata adı); başarılıysa boş.
  problem: string;
}

// ISBN -> kapak adresi (S boyutlu küçük resim adresinden türetilir). Open Library'de kapağı olmayan ISBN sonuçta yer almaz.
export async function lookupCoverUrls(isbns: string[]): Promise<CoverLookup> {
  const urls = new Map<string, string>();
  if (isbns.length === 0) return { urls, problem: "" };
  const bibkeys = isbns.map((isbn) => `ISBN:${isbn}`).join(",");
  try {
    const response = await fetch(`https://openlibrary.org/api/books?bibkeys=${bibkeys}&format=json`, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return { urls, problem: `arama HTTP ${response.status}` };
    const data = (await response.json()) as Record<string, { thumbnail_url?: string }>;
    for (const isbn of isbns) {
      const thumbnail = data[`ISBN:${isbn}`]?.thumbnail_url;
      if (thumbnail) urls.set(isbn, thumbnail);
    }
    return { urls, problem: "" };
  } catch (error) {
    return { urls, problem: `arama ${(error as Error).name}` };
  }
}

async function tryDownload(url: string): Promise<{ cover: { bytes: Uint8Array; type: string } | null; problem: string }> {
  try {
    const response = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(8000), redirect: "follow" });
    const type = response.headers.get("content-type") ?? "";
    if (!response.ok) return { cover: null, problem: `HTTP ${response.status}` };
    if (!type.startsWith("image/")) return { cover: null, problem: `tür ${type || "yok"}` };
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length < MIN_COVER_BYTES) return { cover: null, problem: `çok küçük (${bytes.length} bayt)` };
    return { cover: { bytes, type: type.split(";")[0] }, problem: "" };
  } catch (error) {
    return { cover: null, problem: (error as Error).name };
  }
}

// Önce büyük (L), olmazsa orta (M), olmazsa küçük (S) boyut denenir; her biri başarısızlıkta bir kez yeniden denenir.
export async function downloadCover(thumbnailUrl: string): Promise<{ cover: { bytes: Uint8Array; type: string } | null; problem: string }> {
  let problem = "";
  for (const size of ["L", "M", "S"]) {
    const url = thumbnailUrl.replace(/-[SML]\.jpg$/, `-${size}.jpg`);
    for (let attempt = 0; attempt < 2; attempt++) {
      const result = await tryDownload(url);
      if (result.cover) return result;
      problem = `${size}: ${result.problem}`;
    }
  }
  return { cover: null, problem };
}
