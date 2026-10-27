// Kırtasiye ve diğer kitap dışı ürünlerin görsellerini Güçlü Kırtasiye B2B sitesinden barkodla bulup indirir.
// Gerekli (package.json'a eklenmedi): npm install --no-save puppeteer-core  ve kurulu Edge.
// Giriş bilgileri .env.local içinden (GUCLU_USER, GUCLU_PASS) okunur; hiçbir yere yazdırılmaz.
// Akış: giriş -> /Arama/Arama?q=<barkod> -> sonuçtaki tek ürünün Stokpic numarası -> Normal boyutlu görsel -> 800 px JPEG.
// Görsel dosyası barkod numarasıyla adlandırılır: gorsel-veri/guclu/<barkod>.jpg
//
// Durdurup devam etme: her ürünün sonucu gorsel-veri/guclu-durum.jsonl dosyasına eklenir ("ok", "yok", "coklu" kalır;
// "hata" olanlar bir sonraki çalıştırmada tekrar denenir). Ctrl+C ya da bilgisayarı kapatmak sorun değildir.
//
// Kullanım: npm run gorsel:guclu                  (hepsi)
//           npm run gorsel:guclu -- --limit 40    (listeye eşit aralıkla dağıtılmış 40 ürünle deneme)
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import puppeteer from "puppeteer-core";
import sharp from "sharp";
import { PrismaClient } from "@prisma/client";

const DIR = "gorsel-veri";
const IMG_DIR = `${DIR}/guclu`;
const STATE = `${DIR}/guclu-durum.jsonl`;
const SITE = "https://b2b.guclukirtasiye.com";
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const rootArg = process.argv.indexOf("--kok");
// Varsayılan: kitap dışı ana kategoriler. --kok "Kültür Kitapları,Hazırlık Kitapları" ile kitaplar da denenebilir.
const ROOTS = rootArg > -1
  ? process.argv[rootArg + 1].split(",").map((s) => s.trim())
  : ["Kırtasiye", "Sanatsal", "Hediyelik", "Elektronik", "Oyuncak", "Çanta & Beslenme"];
const CONCURRENCY = 3;
const DELAY_MS = 400;

const limitArg = process.argv.indexOf("--limit");
const limit = limitArg > -1 ? Number(process.argv[limitArg + 1]) : Infinity;

mkdirSync(IMG_DIR, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("="))
    .map((l) => [l.split("=")[0].trim().replace(/^\uFEFF/, ""), l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")]),
);
if (!env.GUCLU_USER || !env.GUCLU_PASS) throw new Error(".env.local içinde GUCLU_USER / GUCLU_PASS yok");

const done = new Map();
if (existsSync(STATE)) {
  for (const line of readFileSync(STATE, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      const r = JSON.parse(line);
      done.set(r.b, r.s);
    } catch {
      // yarım kalmış son satır: yok say
    }
  }
}

const db = new PrismaClient();
const products = await db.product.findMany({
  where: { barcode: { not: null }, category: { parent: { name: { in: ROOTS } } }, images: { none: {} } },
  select: { barcode: true },
  orderBy: { barcode: "asc" },
});
await db.$disconnect();

let todo = products.map((p) => p.barcode.trim()).filter((b) => /^\d{6,14}$/.test(b) && !["ok", "yok", "coklu"].includes(done.get(b)));
if (Number.isFinite(limit) && todo.length > limit) {
  const step = todo.length / limit;
  todo = Array.from({ length: limit }, (_, i) => todo[Math.floor(i * step)]);
}
console.log(`Hedef ürün: ${products.length}, işlenecek: ${todo.length}`);

const browser = await puppeteer.launch({ executablePath: EDGE, headless: true });

// Oturum açık tek bir sekme tutulur. Sekme kopar ya da oturum düşerse (tüm işçiler aynı sekmeyi kullandığından) yeni sekme
// açılıp giriş yenilenir; bu sırada başka işçiler getSession() ile aynı yenilemeyi bekler.
let session = null;
let opening = null;

function getSession() {
  if (session) return session;
  opening ??= openSession().finally(() => (opening = null));
  return opening;
}

async function openSession() {
  for (let attempt = 1; ; attempt++) {
    const page = await browser.newPage();
    try {
      await login(page);
      session = page;
      return page;
    } catch (e) {
      page.close().catch(() => {});
      if (attempt >= 4) throw e;
      console.log(`  giriş denemesi ${attempt} başarısız (${e.message.slice(0, 60)}), tekrar deneniyor...`);
      await sleep(5000 * attempt);
    }
  }
}

function dropSession(page) {
  if (session === page) session = null;
  page.close().catch(() => {});
}

async function login(page) {
  await page.goto(`${SITE}/Giris`, { waitUntil: "networkidle2", timeout: 45000 });
  await page.waitForSelector("#Kullanici_Adi", { timeout: 20000 });
  await page.$eval("#Kullanici_Adi", (e) => (e.value = ""));
  await page.type("#Kullanici_Adi", env.GUCLU_USER, { delay: 15 });
  await page.type("#Sifre", env.GUCLU_PASS, { delay: 15 });
  await page.click("input[name=Giris]");
  await sleep(5000);
  if (page.url().includes("/Giris")) throw new Error("Güçlü girişi başarısız (kullanıcı adı/şifre ya da SMS doğrulaması?)");
}
await getSession();
console.log("Güçlü girişi tamam.");

async function search(barcode) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    const page = await getSession();
    let r;
    try {
      r = await page.evaluate(async (url) => {
        const res = await fetch(url, { credentials: "include" });
        return { url: res.url, status: res.status, html: await res.text() };
      }, `${SITE}/Arama/Arama?q=${barcode}`);
    } catch (e) {
      // sekme koptu (detached frame, target closed vb.): yeni sekme + giriş ile tekrar dene
      dropSession(page);
      await sleep(1000);
      continue;
    }
    if (r.url.includes("/Giris")) {
      dropSession(page);
      continue;
    }
    if (r.status >= 500) {
      await sleep(1500 * attempt);
      continue;
    }
    return r.html;
  }
  throw new Error("arama yanıtı alınamadı");
}

async function download(id) {
  for (const size of ["Normal", "Midi"]) {
    const res = await fetch(`${SITE}/Content/img/Stokpic/${size}/${id}.png`, { signal: AbortSignal.timeout(30000) });
    if (res.status === 404) continue;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }
  return null;
}

const decode = (s) =>
  s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .trim();

async function process_(b) {
  const html = await search(b);
  // "Sonuç bulunamadı" yazısı ham HTML'de her zaman (gizli) bulunur; ürün kartı olup olmadığına bakılır.
  const items = html.split('class="prbx-item"').slice(1);
  if (items.length === 0) {
    if (html.includes("Sonuç bulunamadı")) return { s: "yok" };
    throw new Error("sonuç yapısı tanınmadı");
  }
  const names = items.map((it) => decode(it.match(/class="prbx-ad[^"]*"[^>]*>([^<]*)</)?.[1] ?? ""));
  if (items.length > 1) return { s: "coklu", n: names.slice(0, 5) };
  const id = items[0].match(/Stokpic\/(?:Midi|Normal|Mini)\/(\d+)\.png/)?.[1];
  if (!id || id === "0") return { s: "yok", n: names[0], neden: "güçlüde ürün var ama görseli yok" };
  const raw = await download(id);
  if (!raw || raw.length < 1500) return { s: "yok", n: names[0], id, neden: "görsel dosyası yok" };
  const jpg = await sharp(raw)
    .flatten({ background: "#ffffff" })
    .resize({ width: 800, height: 800, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();
  writeFileSync(`${IMG_DIR}/${b}.jpg`, jpg);
  return { s: "ok", n: names[0], id };
}

let stopping = false;
process.on("SIGINT", () => {
  stopping = true;
  console.log("\nDurduruluyor, o anki istekler bitince çıkılacak (ilerleme kayıtlı)...");
});

const counts = { ok: 0, yok: 0, coklu: 0, hata: 0 };
let failStreak = 0;
let next = 0;
const started = Date.now();

async function worker() {
  while (!stopping) {
    const i = next++;
    if (i >= todo.length) return;
    const b = todo[i];
    let r;
    try {
      r = await process_(b);
    } catch (e) {
      r = { s: "hata", e: e.message };
      console.log(`  hata ${b}: ${e.message}`);
    }
    counts[r.s]++;
    appendFileSync(STATE, JSON.stringify({ b, ...r }) + "\n");
    // Üst üste çok hata: kalan ürünleri boşuna "hata" yapma, dur (sonra tekrar çalıştırılınca devam eder).
    failStreak = r.s === "hata" ? failStreak + 1 : 0;
    if (failStreak >= 15 && !stopping) {
      stopping = true;
      console.log("Üst üste 15 hata: sorun var, tarama durduruldu. Tekrar çalıştırınca devam eder.");
    }
    const n = counts.ok + counts.yok + counts.coklu + counts.hata;
    if (n % 50 === 0 || n === todo.length) {
      const dk = (Date.now() - started) / 60000;
      console.log(`${n}/${todo.length}  ok=${counts.ok} yok=${counts.yok} coklu=${counts.coklu} hata=${counts.hata}  (${dk.toFixed(1)} dk)`);
    }
    await sleep(DELAY_MS);
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));
await browser.close();
console.log(`Bitti${stopping ? " (durduruldu, tekrar çalıştırınca devam eder)" : ""}: ok=${counts.ok} yok=${counts.yok} coklu=${counts.coklu} hata=${counts.hata}`);
