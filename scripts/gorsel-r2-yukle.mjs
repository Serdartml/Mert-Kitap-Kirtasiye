// İndirilen ürün görsellerini (gorsel-veri/basari ve gorsel-veri/guclu) Cloudflare R2'ye yükler ve her ürüne ProductImage satırı yazar.
// R2 anahtarı: urunler/<ürün-kimliği>/<barkod>.jpg. Veritabanına yazılan adres src/lib/r2.ts'deki urlForKey ile aynı kurala uyar
// (R2_PUBLIC_URL yoksa ya da *.r2.dev ise sitenin /gorsel/... adresi).
//
// Durdurup devam etme: yüklenen her barkod gorsel-veri/r2-durum.jsonl dosyasına yazılır, tekrar çalıştırınca atlanır.
// Zaten görseli olan ürüne ikinci görsel eklenmez (yönetimden elle eklenenlere dokunulmaz).
//
// Kullanım: npm run gorsel:r2                 (hepsi)
//           npm run gorsel:r2 -- --limit 10   (deneme)
//           npm run gorsel:r2 -- --kaynak basari   (yalnızca Başarı'dan inen kitap görselleri; "guclu" da olur)
import { appendFileSync, existsSync, readdirSync, readFileSync } from "node:fs";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";

const DIR = "gorsel-veri";
const STATE = `${DIR}/r2-durum.jsonl`;
const CONCURRENCY = 6;

for (const file of [".env", ".env.local"]) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const i = line.indexOf("=");
    if (i < 1 || line.trim().startsWith("#")) continue;
    const k = line.slice(0, i).trim().replace(/^﻿/, "");
    process.env[k] ??= line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
}
const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL } = process.env;
if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) throw new Error("R2 ayarları eksik (.env)");

let publicUrl = R2_PUBLIC_URL?.replace(/\/+$/, "") || null;
try {
  if (publicUrl && new URL(publicUrl).hostname.endsWith(".r2.dev")) publicUrl = null;
} catch {
  publicUrl = null;
}
const urlForKey = (key) => (publicUrl ? `${publicUrl}/${key}` : `/gorsel/${key}`);

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

const limitArg = process.argv.indexOf("--limit");
const limit = limitArg > -1 ? Number(process.argv[limitArg + 1]) : Infinity;

const done = new Set();
if (existsSync(STATE)) {
  for (const line of readFileSync(STATE, "utf8").split("\n")) {
    try {
      const r = JSON.parse(line);
      if (r.s === "ok") done.add(r.b);
    } catch {
      // yarım satır
    }
  }
}

// Dosyalar: Başarı (kitap) öncelikli; aynı barkod iki kaynakta varsa Başarı kullanılır.
const files = new Map();
const sourceArg = process.argv.indexOf("--kaynak");
const sources = sourceArg > -1 ? [process.argv[sourceArg + 1]] : ["guclu", "basari"];
for (const src of sources) {
  if (!existsSync(`${DIR}/${src}`)) continue;
  for (const f of readdirSync(`${DIR}/${src}`)) if (f.endsWith(".jpg")) files.set(f.slice(0, -4), `${DIR}/${src}/${f}`);
}
const todo = [...files.keys()].filter((b) => !done.has(b)).sort().slice(0, limit);
console.log(`Yerelde ${files.size} görsel, daha önce yüklenen ${done.size}, işlenecek ${todo.length}.`);

const db = new PrismaClient();
let stopping = false;
process.on("SIGINT", () => {
  stopping = true;
  console.log("\nDurduruluyor (ilerleme kayıtlı)...");
});

const counts = { ok: 0, urunyok: 0, vardi: 0, hata: 0 };
let next = 0;
const started = Date.now();

async function one(b) {
  const product = await db.product.findUnique({ where: { barcode: b }, select: { id: true, name: true, _count: { select: { images: true } } } });
  if (!product) return "urunyok";
  // /gorsel route'u yalnızca urunler/<ürün-kimliği>/<dosya> biçimini sunar; dosya adı barkod olarak kalır.
  const key = `urunler/${product.id}/${b}.jpg`;
  await s3.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: readFileSync(files.get(b)),
      ContentType: "image/jpeg",
      CacheControl: "public, max-age=2592000",
    }),
  );
  if (product._count.images > 0) return "vardi";
  await db.productImage.create({ data: { productId: product.id, url: urlForKey(key), alt: product.name, sortOrder: 0 } });
  return "ok";
}

async function worker() {
  while (!stopping) {
    const i = next++;
    if (i >= todo.length) return;
    const b = todo[i];
    let s;
    try {
      s = await one(b);
    } catch (e) {
      s = "hata";
      console.log(`  hata ${b}: ${e.message}`);
    }
    counts[s]++;
    if (s !== "hata") appendFileSync(STATE, JSON.stringify({ b, s: "ok", durum: s }) + "\n");
    const n = Object.values(counts).reduce((a, c) => a + c, 0);
    if (n % 200 === 0 || n === todo.length) {
      console.log(`${n}/${todo.length}  eklendi=${counts.ok} gorseliVardi=${counts.vardi} urunYok=${counts.urunyok} hata=${counts.hata}  (${((Date.now() - started) / 60000).toFixed(1)} dk)`);
    }
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));
await db.$disconnect();
console.log(`Bitti${stopping ? " (durduruldu, tekrar çalıştırınca devam eder)" : ""}: eklendi=${counts.ok} gorseliVardi=${counts.vardi} urunYok=${counts.urunyok} hata=${counts.hata}`);
