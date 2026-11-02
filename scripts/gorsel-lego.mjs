// LEGO ürünlerinin görsellerini lego.com'dan çeker.
//   node scripts/gorsel-lego.mjs --liste      -> görselsiz LEGO ürünlerini ve çıkarılan set numaralarını gösterir
//   node scripts/gorsel-lego.mjs [--limit N]  -> gorsel-veri/lego/<barkod>.jpg
// Set numarası ürün adından (4-6 haneli sayı) alınır; lego.com tr-tr ürün sayfasından ana görsel çekilir.
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import puppeteer from "puppeteer-core";
import sharp from "sharp";
import { PrismaClient } from "@prisma/client";

const DIR = "gorsel-veri/lego";
const STATE = "gorsel-veri/lego-durum.jsonl";
const arg = (n) => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : null; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const db = new PrismaClient();
const products = await db.product.findMany({
  where: {
    images: { none: {} },
    OR: [{ name: { contains: "lego", mode: "insensitive" } }, { brand: { name: { contains: "lego", mode: "insensitive" } } }],
  },
  select: { barcode: true, name: true, sku: true, brand: { select: { name: true } } },
});
await db.$disconnect();

// Gerçek LEGO: barkod 5702 ile başlar (LEGO A/S, Danimarka). Loz/Cada/Bricks gibi uyumlu ürünler dışarıda kalır.
const setNo = (p) => {
  const m = [...`${p.name} ${p.sku ?? ""}`.matchAll(/(?<!\d)(\d{4,6})(?!\d)(?!\s*(?:parça|parca|pcs))/gi)].map((x) => x[1]);
  return m.find((x) => !/^20[0-3]\d$/.test(x)) ?? null;
};
const rows = products
  .map((p) => ({ b: p.barcode?.trim(), ad: p.name, set: setNo(p), marka: p.brand?.name }))
  .filter((r) => r.b?.startsWith("5702"));

if (process.argv.includes("--liste")) {
  console.log(`görselsiz LEGO ürünü: ${rows.length}, set numarası çıkan: ${rows.filter((r) => r.set).length}, barkodsuz: ${rows.filter((r) => !r.b).length}`);
  for (const r of rows.slice(0, Number(arg("--limit") ?? 40))) console.log(`${(r.set ?? "-").padEnd(7)} ${(r.b ?? "-").padEnd(14)} ${r.marka ?? ""} | ${r.ad}`);
  process.exit(0);
}

mkdirSync(DIR, { recursive: true });
const done = new Map();
if (existsSync(STATE)) for (const l of readFileSync(STATE, "utf8").split("\n").filter(Boolean)) { const j = JSON.parse(l); done.set(j.b, j.s); }
let todo = rows.filter((r) => r.b && r.set && !["ok", "yok"].includes(done.get(r.b)));
if (arg("--limit")) todo = todo.slice(0, Number(arg("--limit")));
console.log(`bakılacak: ${todo.length}`);

// lego.com düz fetch'i 403 ile engelliyor: gerçek Edge sekmesiyle açılır.
const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  headless: !process.argv.includes("--goster"),
  args: ["--window-size=1366,900"],
});
const page = (await browser.pages())[0] ?? (await browser.newPage());
await page.setExtraHTTPHeaders({ "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8" });
async function legoImage(set) {
  for (const loc of ["tr-tr", "en-us"]) {
    const r = await page.goto(`https://www.lego.com/${loc}/product/${set}`, { waitUntil: "domcontentloaded", timeout: 45000 });
    if (r?.status() === 404) continue;
    if (!r || r.status() >= 400) throw new Error(`sayfa ${r?.status()}`);
    const html = await page.content();
    if (!html.includes(set)) continue;
    const og = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/)?.[1] ?? html.match(/content="([^"]+)"[^>]+property="og:image"/)?.[1];
    const url = og && og.includes(set) ? og : html.match(new RegExp(`https://www\\.lego\\.com/cdn/cs/set/assets/[^"\\s]*${set}[^"\\s]*?\\.(?:png|jpg)`))?.[0];
    if (!url) continue;
    const clean = url.replace(/&amp;/g, "&").split("?")[0];
    const b64 = await page.evaluate(async (u) => {
      const r = await fetch(u);
      if (!r.ok) return "ERR" + r.status;
      const a = new Uint8Array(await r.arrayBuffer());
      let s = "";
      for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode(...a.subarray(i, i + 0x8000));
      return btoa(s);
    }, `${clean}?format=png&width=1200&fit=bounds`);
    if (b64.startsWith("ERR")) throw new Error(`görsel ${b64.slice(3)}`);
    return { buf: Buffer.from(b64, "base64"), url: clean, loc };
  }
  return null;
}

const counts = { ok: 0, yok: 0, hata: 0 };
for (const r of todo) {
  let s;
  try {
    const got = await legoImage(r.set);
    if (!got) s = { s: "yok" };
    else {
      const jpg = await sharp(got.buf).flatten({ background: "#ffffff" }).resize(800, 800, { fit: "contain", background: "#ffffff" }).jpeg({ quality: 88 }).toBuffer();
      writeFileSync(`${DIR}/${r.b}.jpg`, jpg);
      s = { s: "ok", url: got.url, loc: got.loc };
    }
  } catch (e) { s = { s: "hata", e: e.message }; }
  counts[s.s]++;
  appendFileSync(STATE, JSON.stringify({ b: r.b, set: r.set, ...s }) + "\n");
  console.log(`${r.set} ${r.b} ${s.s}${s.e ? " " + s.e : ""}`);
  await sleep(700);
}
await browser.close();
console.log("özet", counts);
