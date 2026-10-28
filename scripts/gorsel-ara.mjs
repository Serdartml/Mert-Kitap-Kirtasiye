// Görseli olmayan ürünleri barkodla görsel arama API'lerinde arar; ücretsiz kotaları doldurur ama aşmaz.
// Sağlayıcılar (anahtarı .env'de tanımlı olanlar kullanılır): Brave (BRAVE_API_KEY), Serper (SERPER_API_KEY), Google Özel Arama (GOOGLE_CSE_KEY + GOOGLE_CSE_CX).
// Kota sayacı gorsel-veri/ara-kota.json dosyasında tutulur; sağlayıcının kotası bitince sıradakine geçilir, hepsi bitince durur.
// Güvenlik: yalnızca başlığında ya da adresinde ürünün barkodu GEÇEN sonuç otomatik eklenir (R2'ye kopyalanır, ProductImage yazılır).
// Diğer sonuçlar gorsel-veri/ara-adaylar.jsonl dosyasına yazılır, kendiliğinden eklenmez.
// Aranan barkod gorsel-veri/ara-durum.jsonl'a yazılır, tekrar aranmaz (kota harcanmasın).
//
// Kullanım: npm run gorsel:ara -- --limit 20     (deneme)
//           npm run gorsel:ara                   (kota bitene kadar)
// Kota üst sınırları ortam değişkeniyle ayarlanır: BRAVE_AYLIK (vars. 1800), SERPER_TOPLAM (vars. 2400), GOOGLE_GUNLUK (vars. 95).
import { randomUUID } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";

const DIR = "gorsel-veri";
const STATE = `${DIR}/ara-durum.jsonl`;
const CANDIDATES = `${DIR}/ara-adaylar.jsonl`;
const QUOTA = `${DIR}/ara-kota.json`;
mkdirSync(DIR, { recursive: true });

for (const file of [".env", ".env.local"]) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const i = line.indexOf("=");
    if (i < 1 || line.trim().startsWith("#")) continue;
    const k = line.slice(0, i).trim().replace(/^﻿/, "");
    process.env[k] ??= line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
}
const env = process.env;
const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL } = env;
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

const today = new Date().toISOString().slice(0, 10);
// Her sağlayıcı: kota penceresi (dönem anahtarı), üst sınır ve arama işlevi; sonuç { title, page, image } listesidir.
const providers = [
  {
    name: "brave",
    enabled: !!env.BRAVE_API_KEY,
    period: today.slice(0, 7),
    cap: Number(env.BRAVE_AYLIK || 1800),
    async search(q) {
      const r = await fetch(`https://api.search.brave.com/res/v1/images/search?${new URLSearchParams({ q, count: "10", country: "tr", safesearch: "off" })}`, {
        headers: { "X-Subscription-Token": env.BRAVE_API_KEY, Accept: "application/json" },
      });
      if (r.status === 429) throw Object.assign(new Error("Brave oran sınırı"), { rate: true });
      if (!r.ok) throw new Error(`Brave ${r.status}`);
      const j = await r.json();
      return (j.results ?? []).map((x) => ({ title: x.title ?? "", page: x.url ?? "", image: x.properties?.url ?? "" }));
    },
  },
  {
    name: "serper",
    enabled: !!env.SERPER_API_KEY,
    period: "toplam",
    cap: Number(env.SERPER_TOPLAM || 2400),
    async search(q) {
      const r = await fetch("https://google.serper.dev/images", {
        method: "POST",
        headers: { "X-API-KEY": env.SERPER_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ q, gl: "tr", hl: "tr", num: 10 }),
      });
      if (r.status === 429) throw Object.assign(new Error("Serper oran sınırı"), { rate: true });
      if (!r.ok) throw new Error(`Serper ${r.status}`);
      const j = await r.json();
      return (j.images ?? []).map((x) => ({ title: x.title ?? "", page: x.link ?? "", image: x.imageUrl ?? "" }));
    },
  },
  {
    name: "google",
    enabled: !!env.GOOGLE_CSE_KEY && !!env.GOOGLE_CSE_CX,
    period: today,
    cap: Number(env.GOOGLE_GUNLUK || 95),
    async search(q) {
      const r = await fetch(`https://www.googleapis.com/customsearch/v1?${new URLSearchParams({ key: env.GOOGLE_CSE_KEY, cx: env.GOOGLE_CSE_CX, q, searchType: "image", num: "10", gl: "tr" })}`);
      if (r.status === 429) throw Object.assign(new Error("Google günlük kota"), { rate: true });
      if (!r.ok) throw new Error(`Google ${r.status}`);
      const j = await r.json();
      return (j.items ?? []).map((x) => ({ title: x.title ?? "", page: x.image?.contextLink ?? "", image: x.link ?? "" }));
    },
  },
].filter((p) => p.enabled);

if (providers.length === 0) throw new Error("Hiç sağlayıcı anahtarı yok: .env'e BRAVE_API_KEY, SERPER_API_KEY veya GOOGLE_CSE_KEY+GOOGLE_CSE_CX ekleyin.");

const quota = existsSync(QUOTA) ? JSON.parse(readFileSync(QUOTA, "utf8")) : {};
const saveQuota = () => writeFileSync(QUOTA, JSON.stringify(quota, null, 2));
const used = (p) => (quota[p.name]?.period === p.period ? quota[p.name].used : 0);
const spend = (p) => {
  quota[p.name] = { period: p.period, used: used(p) + 1 };
  saveQuota();
};
const available = () => providers.filter((p) => used(p) < p.cap && !p.blocked);

const limitArg = process.argv.indexOf("--limit");
const limit = limitArg > -1 ? Number(process.argv[limitArg + 1]) : Infinity;

const done = new Set();
if (existsSync(STATE)) {
  for (const line of readFileSync(STATE, "utf8").split("\n")) {
    try {
      done.add(JSON.parse(line).b);
    } catch {
      // yarım satır
    }
  }
}

const db = new PrismaClient();
const todo = (
  await db.product.findMany({
    where: { images: { none: {} }, barcode: { not: null } },
    select: { id: true, name: true, barcode: true },
    orderBy: { id: "asc" },
  })
).filter((p) => /^\d{8,14}$/.test(p.barcode) && !done.has(p.barcode));
console.log(`Görselsiz ve aranmamış ${todo.length} ürün. Sağlayıcılar: ${providers.map((p) => `${p.name} (${used(p)}/${p.cap})`).join(", ")}`);

const TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
async function download(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(15000), headers: { "User-Agent": "Mozilla/5.0", Accept: "image/*" } });
  if (!r.ok) return null;
  const type = (r.headers.get("content-type") ?? "").split(";")[0].trim();
  const ext = TYPES[type];
  if (!ext) return null;
  const bytes = new Uint8Array(await r.arrayBuffer());
  // Çok küçük dosyalar yer tutucu/simge olur; çok büyükler gereksiz.
  if (bytes.length < 8000 || bytes.length > 8_000_000) return null;
  return { bytes, type, ext };
}

let stopping = false;
process.on("SIGINT", () => {
  stopping = true;
  console.log("\nDurduruluyor (ilerleme kayıtlı)...");
});
const counts = { eklendi: 0, aday: 0, sonucyok: 0, hata: 0 };
let processed = 0;
let lastCall = 0;

for (const product of todo) {
  if (stopping || processed >= limit) break;
  const provider = available()[0];
  if (!provider) {
    console.log("Tüm sağlayıcıların kotası doldu; durdu.");
    break;
  }
  // Brave ücretsiz planı saniyede 1 istek; hepsine uyan yavaşlatma.
  const wait = 1100 - (Date.now() - lastCall);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();

  let results;
  try {
    results = await provider.search(`"${product.barcode}"`);
    spend(provider);
  } catch (e) {
    if (e.rate) {
      provider.blocked = true;
      console.log(`${provider.name}: ${e.message}; bu çalıştırmada atlanıyor.`);
    } else {
      counts.hata++;
      console.log(`  hata ${product.barcode}: ${e.message}`);
    }
    continue;
  }
  processed++;

  const hit = results.find((x) => x.image && `${x.title} ${x.page} ${x.image}`.includes(product.barcode));
  let outcome = "sonucyok";
  if (hit) {
    try {
      const file = await download(hit.image);
      if (file) {
        const key = `urunler/${product.id}/${randomUUID()}.${file.ext}`;
        await s3.send(new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, Body: file.bytes, ContentType: file.type, CacheControl: "public, max-age=31536000, immutable" }));
        const exists = await db.productImage.count({ where: { productId: product.id } });
        if (!exists) await db.productImage.create({ data: { productId: product.id, url: urlForKey(key), alt: product.name, sortOrder: 0 } });
        outcome = "eklendi";
      }
    } catch (e) {
      console.log(`  indirme/yükleme hatası ${product.barcode}: ${e.message}`);
    }
  }
  if (outcome !== "eklendi" && results.length > 0) {
    appendFileSync(CANDIDATES, JSON.stringify({ b: product.barcode, ad: product.name, adaylar: results.slice(0, 5) }) + "\n");
    outcome = "aday";
  }
  counts[outcome]++;
  appendFileSync(STATE, JSON.stringify({ b: product.barcode, s: outcome, k: provider.name }) + "\n");
  if (processed % 50 === 0) console.log(`${processed}  eklendi=${counts.eklendi} aday=${counts.aday} sonucYok=${counts.sonucyok} hata=${counts.hata}  ${providers.map((p) => `${p.name} ${used(p)}/${p.cap}`).join(" ")}`);
}

await db.$disconnect();
console.log(`Bitti: aranan=${processed} eklendi=${counts.eklendi} aday=${counts.aday} sonucYok=${counts.sonucyok} hata=${counts.hata}`);
