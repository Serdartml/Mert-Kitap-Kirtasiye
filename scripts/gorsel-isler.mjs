// Görseli olmayan ürünlerin görsellerini İşler Toptan B2B sitesinden barkodla bulup indirir (varsayılan: Hazırlık Kitapları).
// Gerekli (package.json'a eklenmedi): npm install --no-save puppeteer-core  ve kurulu Edge.
// Giriş bilgileri .env.local içinden (ISLER_USERNAME, ISLER_PASSWORD) okunur; hiçbir yere yazdırılmaz.
// Akış: giriş (/Login/UserLogin) -> /Urun?search=<barkod> -> kartın barkodu aranan barkodla birebir aynıysa görsel -> 800 px JPEG.
// Görsel dosyası barkod numarasıyla adlandırılır: gorsel-veri/isler/<barkod>.jpg
//
// Durdurup devam etme: her ürünün sonucu gorsel-veri/isler-durum.jsonl dosyasına eklenir ("ok", "yok" kalır;
// "hata" olanlar bir sonraki çalıştırmada tekrar denenir).
//
// Kullanım: npm run gorsel:isler                  (hepsi)
//           npm run gorsel:isler -- --limit 40    (listeye eşit aralıkla dağıtılmış 40 ürünle deneme)
//           npm run gorsel:isler -- --kok "Kültür Kitapları"
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import puppeteer from "puppeteer-core";
import sharp from "sharp";
import { PrismaClient } from "@prisma/client";

const DIR = "gorsel-veri";
const IMG_DIR = `${DIR}/isler`;
const STATE = `${DIR}/isler-durum.jsonl`;
const SITE = "https://www.islertoptan.com";
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const rootArg = process.argv.indexOf("--kok");
const ROOTS = (rootArg > -1 ? process.argv[rootArg + 1] : "Hazırlık Kitapları").split(",").map((s) => s.trim());
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
if (!env.ISLER_USERNAME || !env.ISLER_PASSWORD) throw new Error(".env.local içinde ISLER_USERNAME / ISLER_PASSWORD yok");

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

let todo = products.map((p) => p.barcode.trim()).filter((b) => /^\d{6,14}$/.test(b) && !["ok", "yok"].includes(done.get(b)));
if (Number.isFinite(limit) && todo.length > limit) {
  const step = todo.length / limit;
  todo = Array.from({ length: limit }, (_, i) => todo[Math.floor(i * step)]);
}
console.log(`${ROOTS.join(", ")} (görselsiz): ${products.length} ürün, işlenecek: ${todo.length}`);

const browser = await puppeteer.launch({ executablePath: EDGE, headless: true });

// Oturum açık tek sekme; kopar ya da düşerse yeniden açılıp giriş yenilenir (Güçlü scriptiyle aynı düzen).
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
  await page.goto(`${SITE}/`, { waitUntil: "networkidle2", timeout: 45000 });
  const r = await page.evaluate(
    async (u, p) => {
      const token = document.querySelector("#loginFormDesktop input[name=__RequestVerificationToken]").value;
      const body = new URLSearchParams({ __RequestVerificationToken: token, GirisAdi: u, GirisKey: p, BeniHatirla: "false" });
      const res = await fetch("/Login/UserLogin", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
        credentials: "include",
      });
      return res.json();
    },
    env.ISLER_USERNAME,
    env.ISLER_PASSWORD,
  );
  if (r.Sonuc !== "success") throw new Error("İşler girişi başarısız");
}
await getSession();
console.log("İşler girişi tamam.");

async function search(barcode) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    const page = await getSession();
    let r;
    try {
      r = await page.evaluate(async (url) => {
        const res = await fetch(url, { credentials: "include" });
        return { status: res.status, html: await res.text() };
      }, `${SITE}/Urun?search=${barcode}`);
    } catch {
      dropSession(page);
      await sleep(1000);
      continue;
    }
    if (r.status >= 500) {
      await sleep(1500 * attempt);
      continue;
    }
    // Oturum düşmüşse sayfada giriş formu "Giriş" bağlantısı olarak kalır; ürün listesi kabuğu yoksa yeniden giriş yap.
    if (!r.html.includes("productListContent")) {
      dropSession(page);
      continue;
    }
    return r.html;
  }
  throw new Error("arama yanıtı alınamadı");
}

const decode = (s) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .trim();

async function download(src) {
  const res = await fetch(new URL(encodeURI(src), SITE), { signal: AbortSignal.timeout(30000) });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  if (!(res.headers.get("content-type") ?? "").startsWith("image/")) return null;
  return Buffer.from(await res.arrayBuffer());
}

async function process_(b) {
  const html = await search(b);
  const items = html.split('<li class="product col"').slice(1);
  if (items.length === 0) {
    if (html.includes("Sonuç bulunamadı")) return { s: "yok", neden: "işlerde ürün yok" };
    throw new Error("sonuç yapısı tanınmadı");
  }
  // Arama ad/kod içinde de eşleşir; yalnızca barkodu birebir aynı olan kart alınır.
  const item = items.find((it) => decode(it.match(/text-muted">\s*([^<]*?)\s*</)?.[1] ?? "") === b);
  if (!item) return { s: "yok", neden: "barkod birebir eşleşmedi", n: items.length };
  const name = decode(item.match(/product__title[^>]*>\s*<a[^>]*>([^<]*)</)?.[1] ?? "");
  const src = decode(item.match(/<img src="([^"]*)"/)?.[1] ?? "");
  if (!src || /no-image/i.test(src)) return { s: "yok", n: name, neden: "işlerde ürün var ama görseli yok" };
  const raw = await download(src);
  if (!raw || raw.length < 1500) return { s: "yok", n: name, neden: "görsel dosyası yok" };
  const jpg = await sharp(raw)
    .flatten({ background: "#ffffff" })
    .resize({ width: 800, height: 800, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();
  writeFileSync(`${IMG_DIR}/${b}.jpg`, jpg);
  return { s: "ok", n: name };
}

let stopping = false;
process.on("SIGINT", () => {
  stopping = true;
  console.log("\nDurduruluyor, o anki istekler bitince çıkılacak (ilerleme kayıtlı)...");
});

const counts = { ok: 0, yok: 0, hata: 0 };
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
    const n = counts.ok + counts.yok + counts.hata;
    if (n % 50 === 0 || n === todo.length) {
      const dk = (Date.now() - started) / 60000;
      console.log(`${n}/${todo.length}  ok=${counts.ok} yok=${counts.yok} hata=${counts.hata}  (${dk.toFixed(1)} dk)`);
    }
    await sleep(DELAY_MS);
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));
await browser.close();
console.log(`Bitti${stopping ? " (durduruldu, tekrar çalıştırınca devam eder)" : ""}: ok=${counts.ok} yok=${counts.yok} hata=${counts.hata}`);
