// Doğru Kaynak (Tonguç) B2B sitesindeki ürünlerin görsellerini indirir ve veritabanındaki görselsiz ürünlerle eşleştirir.
// Gerekli (package.json'a eklenmedi): npm install --no-save puppeteer-core  ve kurulu Edge.
// Giriş bilgileri .env.local içinden (DOGRUKAYNAK_USERNAME, DOGRUKAYNAK_PASSWORD) okunur; hiçbir yere yazdırılmaz.
// Sitede barkodla arama çalışmadığı için akış ters: ürün sitemap'i -> her ürünün detay sayfası (barkod, ad, görsel) ->
// gorsel-veri/dogrukaynak-katalog.jsonl; sonra katalogdaki barkodu veritabanındaki görselsiz ürünlerle eşleştirip
// gorsel-veri/dogrukaynak/<barkod>.jpg olarak (800 px JPEG) indirir. Barkodu eşleşmeyen ürünler eşleşme raporuna yazılır.
//
// Durdurup devam etme: detay sayfaları katalog dosyasına tek tek eklenir, yeniden çalıştırınca okunanlar atlanır.
// Kullanım: npm run gorsel:dogrukaynak
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import puppeteer from "puppeteer-core";
import sharp from "sharp";
import { PrismaClient } from "@prisma/client";

const DIR = "gorsel-veri";
const IMG_DIR = `${DIR}/dogrukaynak`;
const CATALOG = `${DIR}/dogrukaynak-katalog.jsonl`;
const SITE = "https://b2b.dogrukaynak.com";
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const DELAY_MS = 1500; // robots.txt genel botlara 30 sn bekleme ister; hesaplı, tek istek, 1,5 sn aralıkla gidilir.

mkdirSync(IMG_DIR, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("="))
    .map((l) => [l.split("=")[0].trim().replace(/^\uFEFF/, ""), l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")]),
);
if (!env.DOGRUKAYNAK_USERNAME || !env.DOGRUKAYNAK_PASSWORD) throw new Error(".env.local içinde DOGRUKAYNAK_USERNAME / DOGRUKAYNAK_PASSWORD yok");

const known = new Map();
if (existsSync(CATALOG)) {
  for (const line of readFileSync(CATALOG, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      const r = JSON.parse(line);
      known.set(r.u, r);
    } catch {
      // yarım kalmış son satır: yok say
    }
  }
}

const browser = await puppeteer.launch({ executablePath: EDGE, headless: true });
const page = await browser.newPage();
await page.goto(`${SITE}/`, { waitUntil: "networkidle2", timeout: 45000 });
await page.type("#user-login-email", env.DOGRUKAYNAK_USERNAME, { delay: 15 });
await page.type("#user-login-pass", env.DOGRUKAYNAK_PASSWORD, { delay: 15 });
await Promise.all([
  page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 }).catch(() => {}),
  page.$eval("form[name=login-form]", (f) => (f.querySelector("[type=submit]") ?? f.querySelector("button"))?.click()),
]);
const loggedIn = await page.evaluate(() => !document.querySelector("form[name=login-form]"));
if (!loggedIn) throw new Error("Doğru Kaynak girişi başarısız");
console.log("Doğru Kaynak girişi tamam.");

const getText = (url) => page.evaluate(async (u) => (await fetch(u, { credentials: "include" })).text(), url);

const smIndex = await getText(`${SITE}/sitemap.xml`);
const smUrl = smIndex.match(/<loc>([^<]*sitemap_product_1[^<]*)<\/loc>/)?.[1];
if (!smUrl) throw new Error("ürün sitemap'i bulunamadı");
const urls = [...(await getText(smUrl)).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
console.log(`Sitemap: ${urls.length} ürün, ${known.size} tanesi önceden okunmuş.`);

let stopping = false;
process.on("SIGINT", () => {
  stopping = true;
  console.log("\nDurduruluyor (ilerleme kayıtlı)...");
});

const decode = (s) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .trim();

let n = 0;
for (const u of urls) {
  if (stopping) break;
  if (known.has(u)) continue;
  let html;
  try {
    html = await getText(u);
  } catch (e) {
    console.log(`  hata ${u}: ${e.message.slice(0, 60)}`);
    await sleep(3000);
    continue;
  }
  const barcode = html.match(/Barkod Kodu<\/div>\s*<div class="product-list-content">\s*([^<]*?)\s*</)?.[1] ?? "";
  const sku = html.match(/Stok Kodu<\/div>\s*<div class="product-list-content">\s*([^<]*?)\s*</)?.[1] ?? "";
  const name = decode(html.match(/<h1[^>]*>\s*([^<]*?)\s*</)?.[1] ?? "");
  const img = html.match(/myassets\/products\/\d+\/\d+\.(?:png|jpg|jpeg|webp)(?:\?revision=\d+)?/i)?.[0] ?? "";
  const rec = { u, barcode, sku, name, img };
  known.set(u, rec);
  appendFileSync(CATALOG, JSON.stringify(rec) + "\n");
  if (++n % 25 === 0) console.log(`  ${n} yeni ürün okundu (${known.size}/${urls.length})`);
  await sleep(DELAY_MS);
}

// Eşleştirme: katalogdaki barkod veritabanındaki görselsiz bir ürünün barkoduna eşitse indir.
const db = new PrismaClient();
const missing = await db.product.findMany({ where: { barcode: { not: null }, images: { none: {} } }, select: { barcode: true, name: true } });
const all = await db.product.findMany({ where: { barcode: { not: null } }, select: { barcode: true } });
await db.$disconnect();
const missingSet = new Set(missing.map((p) => p.barcode.trim()));
const allSet = new Set(all.map((p) => p.barcode.trim()));

// Sitede ISBN'ler tireli yazılı (978-625-422-103-3); veritabanındaki barkodlar yalnızca rakam.
const catalog = [...known.values()].map((r) => ({ ...r, barcode: r.barcode.replace(/\D/g, "") })).filter((r) => r.barcode);
const inDb = catalog.filter((r) => allSet.has(r.barcode));
const wanted = catalog.filter((r) => missingSet.has(r.barcode) && r.img);
console.log(`Katalog: ${known.size} ürün, barkodlu ${catalog.length}, veritabanında barkodu olan ${inDb.length}, görseli eksik olup indirilecek ${wanted.length}.`);

let ok = 0;
for (const r of wanted) {
  if (stopping) break;
  const file = `${IMG_DIR}/${r.barcode}.jpg`;
  if (existsSync(file)) continue;
  try {
    const res = await fetch(`${SITE}/idea/sf/84/${r.img}`, { signal: AbortSignal.timeout(30000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const jpg = await sharp(Buffer.from(await res.arrayBuffer()))
      .flatten({ background: "#ffffff" })
      .resize({ width: 800, height: 800, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();
    writeFileSync(file, jpg);
    ok++;
  } catch (e) {
    console.log(`  indirilemedi ${r.barcode}: ${e.message}`);
  }
  await sleep(300);
}
console.log(`Bitti: ${ok} görsel indirildi.`);
await browser.close();
