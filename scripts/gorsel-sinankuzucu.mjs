// Sinan Kuzucu bayi sitesinden görselsiz ürünlerin görsellerini barkodla indirir.
// Girişte güvenlik kodu (captcha) olduğu için tarayıcı GÖRÜNÜR açılır: kullanıcı adı/şifre otomatik dolar,
// güvenlik kodunu siz yazıp "Giriş"e basarsınız; giriş olunca script aynı oturumla kendiliğinden devam eder.
// Akış sonrası gorsel-toptanci.mjs ile aynı: gorsel-veri/sinankuzucu/<barkod>.jpg, sinankuzucu-durum.jsonl, ayıklama.
//
// Kullanım: node scripts/gorsel-sinankuzucu.mjs                (keşif: giriş + ilk barkodun arama sayfasını kaydeder)
//           node scripts/gorsel-sinankuzucu.mjs --tara         (tüm görselsiz Sinan Kuzucu/Hazırlık ürünleri)
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import puppeteer from "puppeteer-core";
import sharp from "sharp";
import { PrismaClient } from "@prisma/client";

const SITE = "https://bayi.sinankuzucuyayinlari.com";
const DIR = "gorsel-veri";
const IMG_DIR = `${DIR}/sinankuzucu`;
const STATE = `${DIR}/sinankuzucu-durum.jsonl`;
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("="))
    .map((l) => [l.split("=")[0].trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
mkdirSync(IMG_DIR, { recursive: true });

const browser = await puppeteer.launch({ executablePath: EDGE, headless: false, defaultViewport: null, args: ["--window-size=1100,850"] });
const page = (await browser.pages())[0] ?? (await browser.newPage());
await page.goto(`${SITE}/login`, { waitUntil: "networkidle2", timeout: 60000 });
await page.type("#cb_txt_mail", env.SINANKUZUCU_USER, { delay: 10 });
await page.type("#cb_txt_password", env.SINANKUZUCU_PASS, { delay: 10 });
await page.focus("#cb_GuvenlikKodu");
console.log("Tarayıcıda güvenlik kodunu yazıp Giriş'e basın (10 dakika beklenir)...");
for (let i = 0; i < 600 && page.url().includes("/login"); i++) await sleep(1000);
if (page.url().includes("/login")) {
  console.log("Giriş yapılmadı, çıkılıyor.");
  await browser.close();
  process.exit(1);
}
await sleep(2000);
console.log("Giriş tamam:", page.url());

const db = new PrismaClient();
const products = await db.product.findMany({
  where: { images: { none: {} }, barcode: { not: null }, OR: [{ brand: { name: { contains: "Sinan" } } }, { category: { parent: { name: "Hazırlık Kitapları" } } }] },
  select: { barcode: true, name: true },
});
await db.$disconnect();

if (!process.argv.includes("--tara")) {
  // Keşif: sayfadaki bağlantılar/formlar ve ilk barkodun arama denemesi
  const info = await page.evaluate(() => ({
    links: [...new Set([...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href")))].slice(0, 80),
    inputs: [...document.querySelectorAll("input")].map((i) => `${i.type}:${i.name}#${i.id} ph=${i.placeholder}`),
  }));
  writeFileSync(`${DIR}/sinankuzucu-kesif.json`, JSON.stringify({ url: page.url(), ...info, ornek: products.slice(0, 5) }, null, 2));
  const html = await page.content();
  writeFileSync(`${DIR}/sinankuzucu-anasayfa.html`, html);
  const cookies = await page.cookies();
  writeFileSync(`${DIR}/sinankuzucu-cerez.json`, JSON.stringify(cookies));
  console.log(`Keşif kaydedildi (${products.length} aday ürün). Tarayıcı 20 sn sonra kapanacak.`);
  await sleep(20000);
  await browser.close();
  process.exit(0);
}

console.log("--tara: arama yapısı keşiften sonra eklenecek.");
await browser.close();
