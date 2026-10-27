// Kültür Kitapları ürünlerinin görsellerini Başarı Dağıtım'dan barkodla indirir.
// Görsel adresi barkoda bağlıdır: /content/images/product/<barkod>.jpg (giriş gerekmez). Görseli olmayan barkoda site
// 404 yerine aynı "resim yok" yer tutucusunu döndürür; başta iki uydurma barkodla yer tutucunun özeti çıkarılır, eşleşenler "yok" sayılır.
//
// Durdurup devam etme: her ürünün sonucu gorsel-veri/basari-durum.jsonl dosyasına eklenir. Ctrl+C, pencereyi kapatmak ya da
// bilgisayarı kapatmak sorun değildir; yeniden çalıştırınca "ok" ve "yok" olanlar atlanır, "hata" olanlar tekrar denenir.
//
// Kullanım: npm run gorsel:basari            (hepsi)
//           npm run gorsel:basari -- --limit 30   (deneme)
//           npm run gorsel:basari -- --kok "Hazırlık Kitapları"   (başka bir ana kategori; varsayılan Kültür Kitapları)
import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const DIR = "gorsel-veri";
const IMG_DIR = `${DIR}/basari`;
const STATE = `${DIR}/basari-durum.jsonl`;
const BASE = "https://basaridagitim.com/content/images/product";
const CONCURRENCY = 3;
const DELAY_MS = 250;

const rootArg = process.argv.indexOf("--kok");
const ROOT = rootArg > -1 ? process.argv[rootArg + 1] : "Kültür Kitapları";
const limitArg = process.argv.indexOf("--limit");
const limit = limitArg > -1 ? Number(process.argv[limitArg + 1]) : Infinity;

mkdirSync(IMG_DIR, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const md5 = (buf) => createHash("md5").update(buf).digest("hex");

// Önceki çalıştırmalardan kalan sonuçlar
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

async function get(barcode) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(`${BASE}/${barcode}.jpg`, { signal: AbortSignal.timeout(30000) });
      if (res.status === 404) return { status: 404 };
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const type = res.headers.get("content-type") ?? "";
      if (!type.startsWith("image/")) throw new Error(`tür ${type}`);
      return { status: 200, buf: Buffer.from(await res.arrayBuffer()) };
    } catch (e) {
      if (attempt === 3) throw e;
      await sleep(1500 * attempt);
    }
  }
}

// Yer tutucunun özeti
const placeholders = new Set();
for (const fake of ["0000000000001", "0000000000002"]) {
  const r = await get(fake);
  if (r.status === 200) placeholders.add(md5(r.buf));
}
console.log(`Yer tutucu özeti: ${[...placeholders].join(", ") || "yok (site 404 veriyor)"}`);

const db = new PrismaClient();
const products = await db.product.findMany({
  where: { barcode: { not: null }, category: { parent: { name: ROOT } } },
  select: { barcode: true },
  orderBy: { barcode: "asc" },
});
await db.$disconnect();

const todo = products
  .map((p) => p.barcode.trim())
  .filter((b) => /^\d{8,14}$/.test(b) && !["ok", "yok"].includes(done.get(b)))
  .slice(0, limit);
console.log(`${ROOT}: ${products.length} ürün, ${products.length - todo.length} atlandı/önceden bitti, ${todo.length} işlenecek.`);

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
      const r = await get(b);
      if (r.status === 404 || placeholders.has(md5(r.buf)) || r.buf.length < 2000) {
        s = "yok";
      } else {
        writeFileSync(`${IMG_DIR}/${b}.jpg`, r.buf);
        s = "ok";
      }
    } catch (e) {
      s = "hata";
      console.log(`  hata ${b}: ${e.message}`);
    }
    counts[s]++;
    appendFileSync(STATE, JSON.stringify({ b, s }) + "\n");
    const n = counts.ok + counts.yok + counts.hata;
    if (n % 100 === 0) {
      const dk = (Date.now() - started) / 60000;
      console.log(`${n}/${todo.length}  ok=${counts.ok} yok=${counts.yok} hata=${counts.hata}  (${dk.toFixed(1)} dk)`);
    }
    await sleep(DELAY_MS);
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));
console.log(`Bitti${stopping ? " (durduruldu, tekrar çalıştırınca devam eder)" : ""}: ok=${counts.ok} yok=${counts.yok} hata=${counts.hata}`);
