import { foldTr } from "./search-fold";

// Turna stok programının dışa aktarımını (başlıksız Excel) site kataloğuna hazırlar: satılmayacak kalemleri ayıklar,
// ürün adından marka/yayınevi çıkarır ve kategori atar. Veritabanına dokunmaz (saf mantık); dosya okuma/yazma
// scripts/turna-hazirla.ts içindedir. Kurallar Turna'nın adlandırma düzenine göre yazılmıştır:
//   kırtasiye:  "Ürün Türü Özellikler-Marka[-2026]"      kültür kitabı: "Başlık (Yazar-Yayınevi)" ya da "Başlık-Yayınevi"
//   hazırlık:   "Yayınevi 8.sınıf Ders Soru-2026"
// Kural metinleri foldTr ile katlanmış (küçük harf, ı=i, ç=c ...) ada uygulanır.

// ---------- Satır okuma ----------

// Turna sütunları (0'dan): A barkod, B Turna kodu, C ad, E stok, G birim alış, I birim satış (H ve J satırın toplamıdır),
// L KDV %, P Turna'daki grup etiketi (çoğu satırda boş).
export interface TurnaItem {
  line: number;
  barcode: string;
  code: string;
  name: string;
  stock: number;
  costKurus: number;
  priceKurus: number;
  vat: number;
  label: string;
}

const text = (value: unknown) => (value === null || value === undefined ? "" : String(value).trim());
const kurus = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? Math.round(value * 100) : 0);

export function readTurnaRows(data: unknown[][]): TurnaItem[] {
  const items: TurnaItem[] = [];
  data.forEach((row, index) => {
    const barcode = text(row[0]);
    const name = text(row[2]).replace(/\s+/g, " ");
    if (!barcode && !name) return;
    items.push({
      line: index + 1,
      barcode,
      code: text(row[1]),
      name,
      stock: typeof row[4] === "number" ? row[4] : Number(text(row[4]).replace(",", ".")) || 0,
      costKurus: kurus(row[6]),
      priceKurus: kurus(row[8]),
      vat: typeof row[11] === "number" ? row[11] : 0,
      label: text(row[15]),
    });
  });
  return items;
}

// ---------- Satılmayacak kalemler ----------

// Dükkânın kasa/hizmet kalemleri: stok programında var ama sitede ürün değil.
const NOT_FOR_SALE: [RegExp, string][] = [
  [/^(bilgisayar cikti|cikti|renkli (fotograf )?cikti|renkli fotograf cikti|renkli fotokopi|fotokopi|kimlik fotokopi)/, "Fotokopi / çıktı hizmeti"],
  [/^(spiral )?ciltleme$|^spiral ciltleme/, "Ciltleme hizmeti"],
  [/^(kargo bedeli|fiyat farki|kirt\.? ?malz)/, "Kasa kalemi (kargo / fiyat farkı / serbest kırtasiye)"],
  [/^poset (mert kitap|buyuk|kucuk|orta)\b/, "Dükkân poşeti"],
];

export function notForSaleReason(item: TurnaItem): string | null {
  const folded = foldTr(item.name);
  for (const [pattern, reason] of NOT_FOR_SALE) if (pattern.test(folded)) return reason;
  if (foldTr(item.name).replace(/[^a-z0-9]/g, "").length < 2) return "Ürün adı yok (Turna'da adı boş ya da yalnızca nokta)";
  if (item.priceKurus <= 0) return "Satış fiyatı yok";
  return null;
}

// ---------- Hazırlık kitabı baskı yılı ----------

// Hazırlık/test kitapları yalnızca güncel dönem baskısıyla satılır: adında 2026-27 (ya da 2027) yazanlar. Eski yıllar
// (2026 tek başına dahil) siteye konmaz; hiç yıl yazmayanlar elle bakılsın diye ayrı dosyaya gider.
export type Edition = "guncel" | "tarihsiz" | "eski";

const CURRENT_EDITION = /(?<!\d)(?:\d{2}|20\d{2})-27(?!\d)|(?<!\d)2027(?!\d)/;
const ANY_YEAR = /(?<!\d)(?:19|20)\d{2}(?!\d)/;

export function editionOf(name: string): Edition {
  if (CURRENT_EDITION.test(name)) return "guncel";
  return ANY_YEAR.test(name) ? "eski" : "tarihsiz";
}

// ---------- Ad ayrıştırma ----------

export interface ParsedName {
  // Sitede görünecek ad.
  title: string;
  // Kırtasiyede marka, kitapta yayınevi; bulunamazsa null.
  brand: string | null;
}

const YEAR_ONLY = /^(19|20)\d{2}(-\d{2})?$/;
const NOTE_WORDS = /^(tam ?metin|tammetin|ksltm\.?|ksltlm\.?|kisaltilmis|gunumuz turkcesi|ciltsiz|ciltli|karton kapak|ksltm)$/;
const TITLE_NOTES = /\s*(?:\/\s*)?\b(tam ?metin|tammetin|ksltm\.?|ksltlm\.?|ciltsiz|gunumuz turkcesi)\b\.?\s*$/i;

// Hazırlık kitaplarında yayınevi sınıf/sınav sözcüğünden önce yazılır: "Sinan Kuzucu 8.sınıf ...", "Hız Tyt ...".
const EXAM_WORD = /\b(\d{1,2}\.\s?sinif|tyt|ayt|ygs|lys|yks|lgs|kpss|ales|dgs|yds|ydt|msu|abt)\b/;

function cleanBrand(raw: string): string | null {
  const parts = raw
    .split("/")
    .map((part) => part.trim())
    .filter((part) => part && !/^\d+$/.test(part) && !NOTE_WORDS.test(foldTr(part)));
  let brand = (parts[0] ?? "").replace(/\)+$/, "").replace(/\s*(19|20)\d{2}$/, "").replace(/[\s.]+$/, "").trim();
  brand = brand.replace(/\s+(tam ?metin|tammetin)$/i, "").trim();
  if (brand.length < 2 || brand.length > 40 || /^[\d\s.,:+-]+$/.test(brand)) return null;
  return brand;
}

// "Versatil Kalem 0.7 Sh-300 Grip Siyah Tombow" gibi model kodlarının ardı marka sayılmasın: marka rakam içermez, en fazla
// üç kelimedir. Kitap yayınevleri ("1001Çiçek") bu denetimden muaftır, çünkü kitaplarda "-" öncesi başlık, sonrası yayınevidir.
function plausibleBrand(brand: string): boolean {
  return !/\d/.test(brand) && brand.split(/\s+/).length <= 3;
}

const publisherLike = (brand: string) => /^\d{3,}\s?[a-z]+$|yayin|kitap|cocuk/.test(foldTr(brand));

export function parseName(rawName: string): ParsedName {
  const name = rawName.replace(/\s+/g, " ").trim();

  // "Yıldız Gezgini (Jack London-İşbankası) Tammetin": başlık + (yazar-yayınevi). Yayınevi ayrılır, yazar adda kalır.
  const paren = name.match(/^(.*?)\s*\(([^()]*)\)\s*(.*)$/);
  if (paren && paren[1].length >= 2) {
    const inside = paren[2];
    const dash = inside.lastIndexOf("-");
    if (dash > 0) {
      const author = inside.slice(0, dash).trim();
      return { title: `${paren[1].trim()} (${author})`, brand: cleanBrand(inside.slice(dash + 1)) };
    }
    return { title: name.replace(TITLE_NOTES, "").trim(), brand: null };
  }

  // Yıl ekleri ("-2026", "-2026-27") kırtasiyede gereksiz.
  const segments = name.split("-");
  const folded = foldTr(name);
  const keepYear = EXAM_WORD.test(folded);
  while (!keepYear && segments.length > 1 && YEAR_ONLY.test(segments[segments.length - 1].trim())) segments.pop();
  const trimmed = segments.join("-");

  // Hazırlık kitabı: yayınevi sınıf/sınav sözcüğünün önündeki kısım.
  const exam = foldTr(trimmed).match(EXAM_WORD);
  if (exam && exam.index !== undefined && exam.index > 1) {
    const prefix = trimmed.slice(0, exam.index).trim();
    // Uzun ön ek yayınevi değil başlıktır ("Düşünme Becerilerini Geliştirme 2.sınıf-Akademi Çocuk"); o zaman sondaki marka alınır.
    if (prefix.split(/\s+/).length <= 2) return { title: trimmed, brand: cleanBrand(prefix) };
  }

  const cut = trimmed.lastIndexOf("-");
  if (cut > 1 && cut < trimmed.length - 1) {
    const brand = cleanBrand(trimmed.slice(cut + 1));
    if (brand && (plausibleBrand(brand) || publisherLike(brand))) return { title: trimmed.slice(0, cut).replace(TITLE_NOTES, "").trim(), brand };
  }
  return { title: trimmed.replace(TITLE_NOTES, "").trim(), brand: null };
}

// ---------- Marka düzeltme ----------

// Aynı marka farklı yazılmış olabilir ("gıpta", "Gıpta", "GIPTA"); katlanmış anahtarla birleştirilir.
const BRAND_ALIASES: Record<string, string> = {
  isbankasi: "İş Bankası Kültür Yayınları",
  "isbankasi cocuk": "İş Bankası Kültür Yayınları",
  "is bankasi": "İş Bankası Kültür Yayınları",
  yky: "Yapı Kredi Yayınları",
  "yapi kredi": "Yapı Kredi Yayınları",
  "can yayinlari": "Can Yayınları",
  "faber castell": "Faber-Castell",
  "faber": "Faber-Castell",
  uniball: "Uni-ball",
};

const titleCase = (value: string) => value.replace(/(^|\s)(\p{L})/gu, (_, space: string, letter: string) => space + letter.toLocaleUpperCase("tr"));

// Marka adlarının katlanmış anahtarını görünür biçime çevirir; en sık görülen büyük harfli yazım kazanır.
export function buildBrandNames(rawBrands: Iterable<string>): Map<string, string> {
  const variants = new Map<string, Map<string, number>>();
  for (const raw of rawBrands) {
    const key = foldTr(raw);
    const counts = variants.get(key) ?? new Map<string, number>();
    counts.set(raw, (counts.get(raw) ?? 0) + 1);
    variants.set(key, counts);
  }
  const display = new Map<string, string>();
  for (const [key, counts] of variants) {
    const alias = BRAND_ALIASES[key];
    if (alias) {
      display.set(key, alias);
      continue;
    }
    const sorted = [...counts].sort((a, b) => b[1] - a[1]);
    const capitalised = sorted.find(([value]) => value[0] === value[0].toLocaleUpperCase("tr") && value[0] !== value[0].toLocaleLowerCase("tr"));
    display.set(key, capitalised ? capitalised[0] : titleCase(sorted[0][0]));
  }
  return display;
}

