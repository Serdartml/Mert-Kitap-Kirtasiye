// gorsel-veri/ek/<barkod>-<n>.jpg dosyalarını (gorsel-ek.mjs çıktısı) R2'ye yükler ve ürüne ek ProductImage satırı yazar.
// R2 anahtarı: urunler/<ürün-kimliği>/<barkod>-<n>.jpg; sortOrder = n (ana görsel 0). Yalnızca ana görseli olan ürünlere eklenir.
// Aynı adresli satır varsa tekrar yazılmaz; her yükleme gorsel-veri/ek-r2-durum.jsonl dosyasına kaydedilir.
//
// Kullanım: npm run gorsel:ek-yukle                 (hepsi)
//           npm run gorsel:ek-yukle -- --limit 10   (deneme)
import { appendFileSync, existsSync, readdirSync, readFileSync } from "node:fs";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";

const DIR = "gorsel-veri";
const STATE = `${DIR}/ek-r2-durum.jsonl`;
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
      done.add(JSON.parse(line).f);
    } catch {
      // yarım satır
    }
  }
}

// --kaynak akgun,dunya: yalnızca o kaynakların (ek-durum.jsonl'de "ok") barkodlarını yükler; verilmezse hepsi.
const sourceArg = process.argv.indexOf("--kaynak");
let allowed = null;
if (sourceArg > -1) {
  const sources = process.argv[sourceArg + 1].split(",");
  allowed = new Set();
  for (const line of readFileSync(`${DIR}/ek-durum.jsonl`, "utf8").split("\n")) {
    try {
      const r = JSON.parse(line);
      if (r.s === "ok" && sources.includes(r.src)) allowed.add(r.b);
    } catch {
      // yarım satır
    }
  }
}

const todo = readdirSync(`${DIR}/ek`)
  .filter((f) => /^\d+-\d+\.jpg$/.test(f) && !done.has(f) && (!allowed || allowed.has(f.split("-")[0])))
  .sort()
  .slice(0, limit);
console.log(`Yerelde ek görsel dosyası var, işlenecek ${todo.length} (daha önce işlenen ${done.size}).`);

const db = new PrismaClient();
let stopping = false;
process.on("SIGINT", () => {
  stopping = true;
  console.log("\nDurduruluyor (ilerleme kayıtlı)...");
});

const counts = { ok: 0, urunyok: 0, anagorselyok: 0, vardi: 0, hata: 0 };
let next = 0;

async function one(f) {
  const [, b, n] = f.match(/^(\d+)-(\d+)\.jpg$/);
  const product = await db.product.findUnique({ where: { barcode: b }, select: { id: true, name: true, _count: { select: { images: true } } } });
  if (!product) return "urunyok";
  if (product._count.images === 0) return "anagorselyok";
  const key = `urunler/${product.id}/${b}-${n}.jpg`;
  const url = urlForKey(key);
  if (await db.productImage.findFirst({ where: { productId: product.id, url }, select: { id: true } })) return "vardi";
  await s3.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: readFileSync(`${DIR}/ek/${f}`),
      ContentType: "image/jpeg",
      CacheControl: "public, max-age=2592000",
    }),
  );
  await db.productImage.create({ data: { productId: product.id, url, alt: product.name, sortOrder: Number(n) } });
  return "ok";
}

async function worker() {
  while (!stopping) {
    const i = next++;
    if (i >= todo.length) return;
    let s;
    try {
      s = await one(todo[i]);
    } catch (e) {
      s = "hata";
      console.log(`  hata ${todo[i]}: ${e.message}`);
    }
    counts[s]++;
    if (s !== "hata") appendFileSync(STATE, JSON.stringify({ f: todo[i], durum: s }) + "\n");
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));
await db.$disconnect();
console.log(`Bitti${stopping ? " (durduruldu)" : ""}: eklendi=${counts.ok} vardı=${counts.vardi} ürünYok=${counts.urunyok} anaGörselYok=${counts.anagorselyok} hata=${counts.hata}`);
