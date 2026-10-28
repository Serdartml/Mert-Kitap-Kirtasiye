// Görseli olmayan ürünlerin görsellerini Prefix'ten barkodla bulup indirir (varsayılan: Kültür Kitapları).
// Giriş gerekmez: Prefix'in herkese açık arama servisi (solr/SearchProxy.aspx) barkodla birebir arar; yanıttaki görsel
// adresi idefix önbellek klasörüne işaret eder, aynı dosyanın tam boyutu "originals/" altındadır -> 800 px JPEG.
// Görsel dosyası barkod numarasıyla adlandırılır: gorsel-veri/prefix/<barkod>.jpg
//
// Başka kaynaktan (basari, guclu, isler, dogrukaynak...) zaten inmiş barkodlar atlanır.
// Durdurup devam etme: sonuçlar gorsel-veri/prefix-durum.jsonl dosyasına eklenir ("ok", "yok" kalır; "hata" tekrar denenir).
//
// Kullanım: npm run gorsel:prefix                  (hepsi)
//           npm run gorsel:prefix -- --limit 40    (listeye eşit aralıkla dağıtılmış 40 ürünle deneme)
//           npm run gorsel:prefix -- --kok "Hazırlık Kitapları,Kırtasiye"
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { PrismaClient } from "@prisma/client";

const DIR = "gorsel-veri";
const IMG_DIR = `${DIR}/prefix`;
const STATE = `${DIR}/prefix-durum.jsonl`;
const SEARCH = "https://www.prefix.com.tr/solr/SearchProxy.aspx?fq=&defType=dismax&qf=barcode%5E100+isbn%5E100&mm=100%25&start=0&wt=json&q=";
const rootArg = process.argv.indexOf("--kok");
const ROOTS = (rootArg > -1 ? process.argv[rootArg + 1] : "Kültür Kitapları").split(",").map((s) => s.trim());
const CONCURRENCY = 4;
const DELAY_MS = 200;

const limitArg = process.argv.indexOf("--limit");
const limit = limitArg > -1 ? Number(process.argv[limitArg + 1]) : Infinity;

mkdirSync(IMG_DIR, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

// Başka kaynaklardan inmiş görseller
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

let todo = products.map((p) => p.barcode.trim()).filter((b) => /^\d{6,14}$/.test(b) && !have.has(b) && !["ok", "yok"].includes(done.get(b)));
if (Number.isFinite(limit) && todo.length > limit) {
  const step = todo.length / limit;
  todo = Array.from({ length: limit }, (_, i) => todo[Math.floor(i * step)]);
}
console.log(`${ROOTS.join(", ")} (görselsiz): ${products.length} ürün, başka kaynaktan inmiş ${products.filter((p) => have.has(p.barcode?.trim())).length}, işlenecek: ${todo.length}`);

async function getJson(url) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      if (attempt === 3) throw e;
      await sleep(1500 * attempt);
    }
  }
}

async function process_(b) {
  const data = await getJson(SEARCH + b);
  const doc = data.response?.docs?.find((d) => d.barcode === b);
  if (!doc) return { s: "yok", neden: "prefixte ürün yok" };
  const m = doc.imageurl?.match(/originals\/([^/?]+)$/);
  if (!m) return { s: "yok", n: doc.title?.[0], neden: "prefixte ürün var ama görseli yok" };
  let raw = null;
  for (const url of [`http://i.idefix.com/originals/${m[1]}`, `http://i.idefix.com/cache/600x600-0/originals/${m[1]}`]) {
    const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (res.status === 404 || res.status === 403) continue;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    raw = Buffer.from(await res.arrayBuffer());
    break;
  }
  if (!raw || raw.length < 3000) return { s: "yok", n: doc.title?.[0], neden: "görsel dosyası yok ya da yer tutucu" };
  const jpg = await sharp(raw)
    .flatten({ background: "#ffffff" })
    .resize({ width: 800, height: 800, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();
  writeFileSync(`${IMG_DIR}/${b}.jpg`, jpg);
  return { s: "ok", n: doc.title?.[0] };
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
console.log(`Bitti${stopping ? " (durduruldu, tekrar çalıştırınca devam eder)" : ""}: ok=${counts.ok} yok=${counts.yok} hata=${counts.hata}`);
