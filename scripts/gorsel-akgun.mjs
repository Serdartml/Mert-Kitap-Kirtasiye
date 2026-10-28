// Kitap dışı ürünlerin görsellerini Akgün Dağıtım B2B sitesinden barkodla bulup indirir.
// Tarayıcı gerekmez: site tek sayfa uygulaması, JSON API'si var. Giriş bilgileri .env.local içinden
// (AKGUN_USERNAME, AKGUN_PASSWORD) okunur; hiçbir yere yazdırılmaz.
// Akış: POST /api/vitrin/oturum -> Bearer token -> GET /api/vitrin/arama?q=<barkod> -> barkodu (alan "barkod") aranan barkodla
// BİREBİR aynı olan, resimVar=true ürün -> GET /api/vitrin/urun/<id>/resim -> 800 px JPEG.
// Görsel dosyası barkod numarasıyla adlandırılır: gorsel-veri/akgun/<barkod>.jpg
//
// Başka kaynaktan (guclu, dunya...) zaten inmiş barkodlar atlanır. Durdurup devam etme: gorsel-veri/akgun-durum.jsonl
// ("ok", "yok" kalır; "hata" tekrar denenir).
//
// Kullanım: npm run gorsel:akgun                  (hepsi)
//           npm run gorsel:akgun -- --limit 40    (listeye eşit aralıkla dağıtılmış 40 ürünle deneme)
//           npm run gorsel:akgun -- --kok "Kırtasiye,Sanatsal"
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { PrismaClient } from "@prisma/client";

const DIR = "gorsel-veri";
const IMG_DIR = `${DIR}/akgun`;
const STATE = `${DIR}/akgun-durum.jsonl`;
const SITE = "https://b2b.akgundagitim.com";
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
    .map((l) => [l.split("=")[0].trim().replace(/^﻿/, ""), l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")]),
);
if (!env.AKGUN_USERNAME || !env.AKGUN_PASSWORD) throw new Error(".env.local içinde AKGUN_USERNAME / AKGUN_PASSWORD yok");

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

let todo = products.map((p) => p.barcode.trim()).filter((b) => /^\d{8,14}$/.test(b) && !have.has(b) && !["ok", "yok"].includes(done.get(b)));
if (Number.isFinite(limit) && todo.length > limit) {
  const step = todo.length / limit;
  todo = Array.from({ length: limit }, (_, i) => todo[Math.floor(i * step)]);
}
console.log(`Hedef ürün: ${products.length}, başka kaynaktan inmiş ${products.filter((p) => have.has(p.barcode?.trim())).length}, işlenecek: ${todo.length}`);

let token = null;
let loggingIn = null;
async function login() {
  const res = await fetch(`${SITE}/api/vitrin/oturum`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ kullaniciAdi: env.AKGUN_USERNAME, sifre: env.AKGUN_PASSWORD, beniHatirla: false }),
  });
  const j = await res.json().catch(() => null);
  if (!res.ok || !j?.token) throw new Error(`Akgün girişi başarısız (HTTP ${res.status})`);
  token = j.token;
}
function relogin(old) {
  if (token !== old) return Promise.resolve();
  loggingIn ??= login().finally(() => (loggingIn = null));
  return loggingIn;
}
await login();
console.log("Akgün girişi tamam.");

// Yetkili istek: 401 gelirse (token süresi dolmuş) yeniden giriş yapıp tekrar dener.
async function api(path, binary = false) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    const used = token;
    const res = await fetch(`${SITE}${path}`, {
      headers: { Accept: binary ? "image/*" : "application/json", Authorization: `Bearer ${used}` },
      signal: AbortSignal.timeout(30000),
    });
    if (res.status === 401) {
      await relogin(used);
      continue;
    }
    if (res.status >= 500) {
      await sleep(1500 * attempt);
      continue;
    }
    return res;
  }
  throw new Error("istek tamamlanamadı");
}

async function process_(b) {
  const res = await api(`/api/vitrin/arama?q=${b}`);
  if (!res.ok) throw new Error(`arama HTTP ${res.status}`);
  const list = (await res.json()).urunler ?? [];
  if (list.length === 0) return { s: "yok", neden: "akgünde ürün yok" };
  const hit = list.find((u) => String(u.barkod) === b);
  if (!hit) return { s: "yok", neden: `barkod birebir eşleşmedi (${list.length} sonuç)` };
  if (!hit.resimVar) return { s: "yok", n: hit.ad, neden: "akgünde ürün var ama görseli yok" };
  const img = await api(`/api/vitrin/urun/${hit.id}/resim`, true);
  if (img.status === 404) return { s: "yok", n: hit.ad, neden: "görsel dosyası yok" };
  if (!img.ok) throw new Error(`resim HTTP ${img.status}`);
  const raw = Buffer.from(await img.arrayBuffer());
  if (raw.length < 1500) return { s: "yok", n: hit.ad, neden: "görsel çok küçük" };
  const jpg = await sharp(raw)
    .flatten({ background: "#ffffff" })
    .resize({ width: 800, height: 800, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();
  writeFileSync(`${IMG_DIR}/${b}.jpg`, jpg);
  return { s: "ok", n: hit.ad };
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
    if (n % 100 === 0 || n === todo.length) {
      const dk = (Date.now() - started) / 60000;
      console.log(`${n}/${todo.length}  ok=${counts.ok} yok=${counts.yok} hata=${counts.hata}  (${dk.toFixed(1)} dk)`);
    }
    await sleep(DELAY_MS);
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));
console.log(`Bitti${stopping ? " (durduruldu, tekrar çalıştırınca devam eder)" : ""}: ok=${counts.ok} yok=${counts.yok} hata=${counts.hata}`);
