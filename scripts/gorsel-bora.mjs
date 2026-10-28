// Görseli olmayan ürünlerin görsellerini Bora Dağıtım'dan barkodla indirir (varsayılan: Kültür Kitapları).
// Görsel adresi barkoda bağlıdır: /Icerik/Gorsel/Urun/Bora/<barkod>.jpg (giriş gerekmez); olmayan barkod 404 verir.
// Görsel dosyası barkod numarasıyla adlandırılır: gorsel-veri/bora/<barkod>.jpg (800 px JPEG).
//
// Başka kaynaktan (basari, guclu, isler, prefix...) zaten inmiş barkodlar atlanır.
// Durdurup devam etme: sonuçlar gorsel-veri/bora-durum.jsonl dosyasına eklenir ("ok", "yok" kalır; "hata" tekrar denenir).
//
// Kullanım: npm run gorsel:bora                 (hepsi)
//           npm run gorsel:bora -- --limit 30   (deneme)
//           npm run gorsel:bora -- --kok "Hazırlık Kitapları,Kültür Kitapları"
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { PrismaClient } from "@prisma/client";

const DIR = "gorsel-veri";
const IMG_DIR = `${DIR}/bora`;
const STATE = `${DIR}/bora-durum.jsonl`;
const BASE = "https://www.boradagitim.com/Icerik/Gorsel/Urun/Bora";
const CONCURRENCY = 3;
const DELAY_MS = 250;

const rootArg = process.argv.indexOf("--kok");
const ROOTS = (rootArg > -1 ? process.argv[rootArg + 1] : "Kültür Kitapları").split(",").map((s) => s.trim());
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

const todo = products
  .map((p) => p.barcode.trim())
  .filter((b) => /^\d{8,14}$/.test(b) && !have.has(b) && !["ok", "yok"].includes(done.get(b)))
  .slice(0, limit);
console.log(`${ROOTS.join(", ")} (görselsiz): ${products.length} ürün, işlenecek: ${todo.length} (diğerleri başka kaynaktan inmiş ya da önceden bitti).`);

async function get(barcode) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(`${BASE}/${barcode}.jpg`, { signal: AbortSignal.timeout(30000) });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (!(res.headers.get("content-type") ?? "").startsWith("image/")) return null;
      return Buffer.from(await res.arrayBuffer());
    } catch (e) {
      if (attempt === 3) throw e;
      await sleep(1500 * attempt);
    }
  }
}

let stopping = false;
process.on("SIGINT", () => {
  stopping = true;
  console.log("\nDurduruluyor, o anki istekler bitince çıkılacak (ilerleme kayıtlı)...");
});

const counts = { ok: 0, yok: 0, hata: 0 };
let next = 0;
const started = Date.now();

async function worker() {
  while (!stopping) {
    const i = next++;
    if (i >= todo.length) return;
    const b = todo[i];
    let s;
    try {
      const raw = await get(b);
      if (!raw || raw.length < 2000) {
        s = "yok";
      } else {
        const jpg = await sharp(raw)
          .flatten({ background: "#ffffff" })
          .resize({ width: 800, height: 800, fit: "inside", withoutEnlargement: true })
          .jpeg({ quality: 85, mozjpeg: true })
          .toBuffer();
        writeFileSync(`${IMG_DIR}/${b}.jpg`, jpg);
        s = "ok";
      }
    } catch (e) {
      s = "hata";
      console.log(`  hata ${b}: ${e.message}`);
    }
    counts[s]++;
    appendFileSync(STATE, JSON.stringify({ b, s }) + "\n");
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
