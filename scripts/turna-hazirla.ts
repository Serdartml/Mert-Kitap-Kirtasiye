import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readSheet } from "read-excel-file/node";
import writeXlsxFile from "write-excel-file/node";
import { foldTr } from "../src/lib/search-fold";
import { buildBrandNames, editionOf, notForSaleReason, parseName, readTurnaRows, type Edition, type ParsedName, type TurnaItem } from "../src/lib/turna-catalog";
import { classify, learnProductBrands, learnPublishers } from "../src/lib/turna-categories";

// Turna dışa aktarımını (başlıksız .xlsx) siteye yüklenecek biçime çevirir. Veritabanına dokunmaz.
//   npx tsx scripts/turna-hazirla.ts stok-temiz.xlsx [çıktı-klasörü]
// Üretilen dosyalar:
//   stok-hazir.xlsx          Yönetim > Ürünler > İçe aktar sayfasına yüklenir (tam mod).
//   hazirliktarihsiz.xlsx    Adında hiç yıl yazmayan hazırlık kitapları; elle bakılıp uygun olanlar (aynı biçimde) yüklenir.
//   stok-ayiklanan.xlsx      Sitede satılmayacağı için dışarıda bırakılanlar ve nedenleri.
//   stok-inceleme.xlsx       Her ürün için Turna adı, yeni ad, kategori, marka, durum ve uyarılar; filtreleyerek gözden geçirmek için.
// Hazırlık kitaplarından yalnızca adında 2026-27 / 2027 yazanlar siteye girer (bkz. editionOf).

const [input, outDir = "."] = process.argv.slice(2);
if (!input) {
  console.error("Kullanım: npx tsx scripts/turna-hazirla.ts <turna.xlsx> [çıktı-klasörü]");
  process.exit(1);
}

const HIGH_STOCK = 5000;

// Dosya Excel'de açıksa (EBUSY) üzerine yazılamaz; kullanıcının açık dosyasını bozmamak için yan isme yazılır.
function save(name: string, buffer: Buffer | Uint8Array) {
  try {
    writeFileSync(join(outDir, name), buffer);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EBUSY") throw error;
    const fallback = name.replace(/\.xlsx$/, "-yeni.xlsx");
    writeFileSync(join(outDir, fallback), buffer);
    console.warn(`UYARI: ${name} açık olduğu için ${fallback} olarak yazıldı.`);
  }
}

interface Row {
  item: TurnaItem;
  parsed: ParsedName;
  category: string;
  kind: string;
  name: string;
  brand: string | null;
  barcode: string;
  flags: string[];
  // Yalnızca hazırlık kitaplarında anlamlı: adındaki baskı yılına göre.
  edition: Edition | null;
}

async function main() {
  const data = (await readSheet(readFileSync(input))) as unknown[][];
  const items = readTurnaRows(data);

  const removed: { item: TurnaItem; reason: string }[] = [];
  const kept: { item: TurnaItem; parsed: ParsedName }[] = [];
  for (const item of items) {
    const reason = notForSaleReason(item);
    if (reason) removed.push({ item, reason });
    else kept.push({ item, parsed: parseName(item.name) });
  }

  const publishers = learnPublishers(kept.map(({ item, parsed }) => ({ brand: parsed.brand, vat: item.vat })));
  const productBrands = learnProductBrands(kept.map(({ item, parsed }) => ({ brand: parsed.brand, name: item.name })));
  const brandNames = buildBrandNames(kept.flatMap(({ parsed }) => (parsed.brand ? [parsed.brand] : [])));

  const seenBarcodes = new Set<string>();
  const rows: Row[] = kept.map(({ item, parsed }) => {
    const result = classify(item, parsed, { publishers, productBrands });
    const brand = parsed.brand ? (brandNames.get(foldTr(parsed.brand)) ?? parsed.brand) : null;
    // Sitede görünen ad markasızdır (marka/toptancı adı müşteriye gösterilmez); marka ayrı alanda, yönetimde görünür.
    const name = parsed.title.slice(0, 200);

    const flags: string[] = [];
    if (result.kind === "belirsiz") flags.push("Kategori belirsiz");
    let barcode = item.barcode;
    if (barcode && seenBarcodes.has(barcode)) {
      flags.push(`Barkod ${barcode} başka üründe de var; bu üründe boş bırakıldı`);
      barcode = "";
    }
    if (barcode) seenBarcodes.add(barcode);
    if (item.priceKurus < item.costKurus) flags.push("Satış fiyatı alış fiyatından düşük");
    if (item.costKurus === 0) flags.push("Alış fiyatı yok");
    if (item.stock >= HIGH_STOCK) flags.push("Stok çok yüksek");
    if (!Number.isInteger(item.stock)) flags.push("Stok ondalıklı");
    const category = result.category ?? "Kırtasiye > Diğer Ürünler";
    const edition = category.startsWith("Hazırlık Kitapları") ? editionOf(item.name) : null;
    return { item, parsed, category, kind: result.kind, name, brand, barcode, flags, edition };
  });

  const toSite = rows.filter((row) => row.edition === null || row.edition === "guncel");
  const undated = rows.filter((row) => row.edition === "tarihsiz");
  const oldEdition = rows.filter((row) => row.edition === "eski");
  const statusOf = (row: Row) => (row.edition === "tarihsiz" ? "Hazırlık: yıl yok (hazirliktarihsiz.xlsx)" : row.edition === "eski" ? "Hazırlık: eski baskı, siteye girmez" : "Siteye");

  mkdirSync(outDir, { recursive: true });

  // 1) İçe aktarma dosyası: başlıklar içe aktarmanın tanıdığı adlardır; "Alış Fiyatı" şimdilik yok sayılır (sütun eşlenmez).
  const importLine = (row: Row) => [row.item.code, row.barcode || null, row.name, row.item.priceKurus / 100, Math.floor(row.item.stock), row.category, row.brand, row.item.costKurus > 0 ? row.item.costKurus / 100 : null];
  const importHeader = ["Stok Kodu", "Barkod", "Ürün Adı", "Satış Fiyatı", "Stok", "Kategori", "Marka", "Alış Fiyatı"];
  save("stok-hazir.xlsx", await writeXlsxFile([importHeader, ...toSite.map(importLine)] as never).toBuffer());

  // Yılsız hazırlık kitapları: aynı biçim (istenenler olduğu gibi yüklenebilir) + en sonda Turna adı.
  save("hazirliktarihsiz.xlsx", await writeXlsxFile([[...importHeader, "Turna Adı"], ...undated.map((row) => [...importLine(row), row.item.name])] as never).toBuffer());

  // 2) Ayıklananlar.
  const removedRows = [
    ["Turna Kodu", "Barkod", "Ad", "Stok", "Satış Fiyatı", "Neden"],
    ...removed.map(({ item, reason }) => [item.code, item.barcode, item.name, item.stock, item.priceKurus / 100, reason]),
    ...oldEdition.map((row) => [row.item.code, row.item.barcode, row.item.name, row.item.stock, row.item.priceKurus / 100, "Hazırlık kitabı: adında 2026-27 yok (eski baskı)"]),
  ];
  save("stok-ayiklanan.xlsx", await writeXlsxFile(removedRows as never).toBuffer());

  // 3) İnceleme dosyası.
  const reviewRows = [
    ["Turna Kodu", "Turna Adı", "Sitedeki Ad", "Kategori", "Marka", "Tür", "Durum", "Stok", "Satış Fiyatı", "Alış Fiyatı", "KDV %", "Uyarılar"],
    ...rows.map((row) => [row.item.code, row.item.name, row.name, row.category, row.brand, row.kind, statusOf(row), row.item.stock, row.item.priceKurus / 100, row.item.costKurus / 100, row.item.vat, row.flags.join("; ")]),
  ];
  save("stok-inceleme.xlsx", await writeXlsxFile(reviewRows as never).toBuffer());

  // Özet.
  const counts = new Map<string, number>();
  for (const row of toSite) counts.set(row.category, (counts.get(row.category) ?? 0) + 1);
  console.log(`Toplam ${items.length}, hizmet/kasa olarak ayıklanan ${removed.length}`);
  console.log(`Hazırlık kitabı: siteye (2026-27) ${rows.filter((row) => row.edition === "guncel").length}, yılsız ${undated.length}, eski baskı ${oldEdition.length}`);
  console.log(`Siteye giden toplam: ${toSite.length}`);
  for (const [category, count] of [...counts].sort()) console.log(String(count).padStart(6), category);
  console.log(`Marka: ${new Set(toSite.flatMap((row) => (row.brand ? [foldTr(row.brand)] : []))).size} farklı, markasız ${toSite.filter((row) => !row.brand).length}`);
  const flagCounts = new Map<string, number>();
  for (const row of rows) for (const flag of row.flags) flagCounts.set(flag.replace(/\d{8,}/, "…"), (flagCounts.get(flag.replace(/\d{8,}/, "…")) ?? 0) + 1);
  for (const [flag, count] of flagCounts) console.log("  uyarı:", count, flag);

  if (process.env.TURNA_DEBUG) {
    writeFileSync(join(outDir, "_dagilim.json"), JSON.stringify(rows.map((row) => [row.item.name, row.category, row.brand, row.name, row.item.vat])), "utf8");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});


