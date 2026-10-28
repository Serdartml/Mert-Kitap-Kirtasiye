// Kitap dışı ürünlerin görsellerini Dünya Ambalaj B2B sitesinden barkodla bulup indirir.
// Gerekli (package.json'a eklenmedi): npm install --no-save puppeteer-core  ve kurulu Edge.
// Giriş bilgileri .env.local içinden (DUNYA_USERNAME, DUNYA_PASSWORD) okunur; hiçbir yere yazdırılmaz.
// Akış: giriş -> POST /search/get_live (q=<barkod>) -> sonuçlardan barkodu (alan "e") aranan barkodla BİREBİR aynı olan ürün
// -> ilk görseli CDN'den (cloudfront.net/b2b_bayidunya/<dosya>) -> 800 px JPEG.
// Arama başka alanlarda da (alternatif barkod, stok kodu) eşleşir; barkodu farklı çıkan tek sonuçlar "aday" olarak
// kaydedilir ama İNDİRİLMEZ (yanlış ürünün görseli sitede görünmesin diye); adaylar elle bakılmak üzere durum dosyasındadır.
// Görsel dosyası barkod numarasıyla adlandırılır: gorsel-veri/dunya/<barkod>.jpg
//
// Başka kaynaktan zaten inmiş barkodlar atlanır. Durdurup devam etme: gorsel-veri/dunya-durum.jsonl
// ("ok", "yok", "aday" kalır; "hata" tekrar denenir).
//
// Kullanım: npm run gorsel:dunya                  (hepsi)
//           npm run gorsel:dunya -- --limit 40    (listeye eşit aralıkla dağıtılmış 40 ürünle deneme)
//           npm run gorsel:dunya -- --kok "Kırtasiye,Sanatsal"
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import puppeteer from "puppeteer-core";
import sharp from "sharp";
import { PrismaClient } from "@prisma/client";

const DIR = "gorsel-veri";
const IMG_DIR = `${DIR}/dunya`;
const STATE = `${DIR}/dunya-durum.jsonl`;
const SITE = "https://b2b.bayidunya.com";
const CDN = "https://d1y8qveuwztoxr.cloudfront.net/b2b_bayidunya";
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const rootArg = process.argv.indexOf("--kok");
const ROOTS = (rootArg > -1 ? process.argv[rootArg + 1] : "Kırtasiye,Sanatsal,Hediyelik,Elektronik,Oyuncak,Çanta & Beslenme").split(",").map((s) => s.trim());
const CONCURRENCY = 3;
const DELAY_MS = 300;

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
if (!env.DUNYA_USERNAME || !env.DUNYA_PASSWORD) throw new Error(".env.local içinde DUNYA_USERNAME / DUNYA_PASSWORD yok");

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

const have = new Set();
for (const d of readdirSync(DIR, { withFileTypes: true })) {
  if (d.isDirectory()) for (const f of readdirSync(`${DIR}/${d.name}`)) have.add(f.replace(/\.jpg$/, ""));
}

const db = new PrismaClient();
const products = await db.product.findMany({
  where: { barcode: { not: null }, category: { parent: { name: { in: ROOTS } } }, images: { none: {} } },
  select: { barcode: true },
  orderBy: { barcode: "asc" },
});
await db.$disconnect();

let todo = products.map((p) => p.barcode.trim()).filter((b) => /^\d{8,14}$/.test(b) && !have.has(b) && !["ok", "yok", "aday"].includes(done.get(b)));
if (Number.isFinite(limit) && todo.length > limit) {
  const step = todo.length / limit;
  todo = Array.from({ length: limit }, (_, i) => todo[Math.floor(i * step)]);
}
console.log(`Hedef ürün: ${products.length}, başka kaynaktan inmiş ${products.filter((p) => have.has(p.barcode?.trim())).length}, işlenecek: ${todo.length}`);

const browser = await puppeteer.launch({ executablePath: EDGE, headless: true });

// Oturum açık tek sekme (Güçlü/İşler scriptleriyle aynı düzen).
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
  await page.goto(`${SITE}/login#!/signin`, { waitUntil: "networkidle2", timeout: 45000 });
  await page.waitForSelector("#mail", { timeout: 20000 });
  await page.type("#mail", env.DUNYA_USERNAME, { delay: 15 });
  await page.type("#password", env.DUNYA_PASSWORD, { delay: 15 });
  await Promise.all([page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 }).catch(() => {}), page.click("#login-btn")]);
  await sleep(3000);
  if (page.url().includes("/login")) throw new Error("Dünya girişi başarısız");
}
await getSession();
console.log("Dünya girişi tamam.");

async function search(barcode) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    const page = await getSession();
    let r;
    try {
      r = await page.evaluate(async (q) => {
        const res = await fetch("/search/get_live", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", "X-Requested-With": "XMLHttpRequest" },
          body: "q=" + encodeURIComponent(q),
          credentials: "include",
        });
        return { status: res.status, text: await res.text() };
      }, barcode);
    } catch {
      dropSession(page);
      await sleep(1000);
      continue;
    }
    if (r.status >= 500) {
      await sleep(1500 * attempt);
      continue;
    }
    let json;
    try {
      json = JSON.parse(r.text);
    } catch {
      dropSession(page); // oturum düşmüş olabilir (HTML giriş sayfası döner)
      continue;
    }
    return json;
  }
  throw new Error("arama yanıtı alınamadı");
}

async function process_(b) {
  const res = await search(b);
  const list = res.result === true ? (res.data?.product ?? []) : [];
  if (list.length === 0) return { s: "yok", neden: "dünyada ürün yok" };
  const hit = list.find((p) => String(p.e) === b);
  if (!hit) {
    if (list.length === 1) return { s: "aday", n: list[0].b, dunyaBarkod: String(list[0].e), neden: "tek sonuç ama barkodu farklı (alternatif barkod olabilir)" };
    return { s: "yok", neden: `barkod birebir eşleşmedi (${list.length} sonuç)` };
  }
  const file = hit.f?.[0]?.a;
  if (!file) return { s: "yok", n: hit.b, neden: "dünyada ürün var ama görseli yok" };
  const imgRes = await fetch(`${CDN}/${file}`, { signal: AbortSignal.timeout(30000) });
  if (imgRes.status === 404 || imgRes.status === 403) return { s: "yok", n: hit.b, neden: "görsel dosyası yok" };
  if (!imgRes.ok) throw new Error(`HTTP ${imgRes.status}`);
  const raw = Buffer.from(await imgRes.arrayBuffer());
  if (raw.length < 1500) return { s: "yok", n: hit.b, neden: "görsel çok küçük" };
  const jpg = await sharp(raw)
    .flatten({ background: "#ffffff" })
    .resize({ width: 800, height: 800, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();
  writeFileSync(`${IMG_DIR}/${b}.jpg`, jpg);
  return { s: "ok", n: hit.b };
}

let stopping = false;
process.on("SIGINT", () => {
  stopping = true;
  console.log("\nDurduruluyor, o anki istekler bitince çıkılacak (ilerleme kayıtlı)...");
});

const counts = { ok: 0, yok: 0, aday: 0, hata: 0 };
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
    failStreak = r.s === "hata" ? failStreak + 1 : 0;
    if (failStreak >= 15 && !stopping) {
      stopping = true;
      console.log("Üst üste 15 hata: sorun var, tarama durduruldu. Tekrar çalıştırınca devam eder.");
    }
    const n = counts.ok + counts.yok + counts.aday + counts.hata;
    if (n % 100 === 0 || n === todo.length) {
      const dk = (Date.now() - started) / 60000;
      console.log(`${n}/${todo.length}  ok=${counts.ok} yok=${counts.yok} aday=${counts.aday} hata=${counts.hata}  (${dk.toFixed(1)} dk)`);
    }
    await sleep(DELAY_MS);
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));
await browser.close();
console.log(`Bitti${stopping ? " (durduruldu, tekrar çalıştırınca devam eder)" : ""}: ok=${counts.ok} yok=${counts.yok} aday=${counts.aday} hata=${counts.hata}`);
