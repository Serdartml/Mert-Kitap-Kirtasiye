// Daha önce ilk görseli inen ürünler için toptancılarda varsa EK görselleri (2., 3., ...) indirir.
// Kaynaklar: akgun (resim?i=N), dunya (aramadaki "f" görsel listesi), guclu (ürün detayındaki alt-image galerisi).
// Başarı, Bora, Prefix ve Doğru Kaynak ürün başına tek görsel sunar; atlandı.
// Dosyalar: gorsel-veri/ek/<barkod>-<n>.jpg (n=1,2,...; ilk görsel gorsel-veri/<kaynak>/<barkod>.jpg olarak kalır).
// Ana görselle ya da önceki ekle birebir aynı olan görseller kaydedilmez.
//
// Durdurup devam etme: gorsel-veri/ek-durum.jsonl ("ok", "yok" kalır; "hata" tekrar denenir).
// Kullanım: npm run gorsel:ek -- --kaynak akgun|dunya|guclu [--limit 20]
import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import puppeteer from "puppeteer-core";
import sharp from "sharp";

const DIR = "gorsel-veri";
const OUT = `${DIR}/ek`;
const STATE = `${DIR}/ek-durum.jsonl`;
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const MAX_EXTRA = 5;
const sourceArg = process.argv.indexOf("--kaynak");
const SRC = sourceArg > -1 ? process.argv[sourceArg + 1] : null;
if (!["akgun", "dunya", "guclu"].includes(SRC)) throw new Error("--kaynak akgun|dunya|guclu gerekli");
const limitArg = process.argv.indexOf("--limit");
const limit = limitArg > -1 ? Number(process.argv[limitArg + 1]) : Infinity;
const CONCURRENCY = { akgun: 3, dunya: 3, guclu: 3 }[SRC];
const DELAY_MS = 300;

mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("="))
    .map((l) => [l.split("=")[0].trim().replace(/^﻿/, ""), l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")]),
);

const readJsonl = (file) =>
  existsSync(file)
    ? readFileSync(file, "utf8")
        .split("\n")
        .flatMap((l) => {
          try {
            return l.trim() ? [JSON.parse(l)] : [];
          } catch {
            return []; // yarım kalmış son satır
          }
        })
    : [];

const done = new Set(readJsonl(STATE).filter((r) => r.src === SRC && (r.s === "ok" || r.s === "yok")).map((r) => r.b));
const mainRows = readJsonl(`${DIR}/${SRC}-durum.jsonl`).filter((r) => r.s === "ok" && existsSync(`${DIR}/${SRC}/${r.b}.jpg`));
let todo = mainRows.filter((r) => !done.has(r.b));
if (Number.isFinite(limit) && todo.length > limit) {
  const step = todo.length / limit;
  todo = Array.from({ length: limit }, (_, i) => todo[Math.floor(i * step)]);
}
console.log(`${SRC}: ilk görseli inmiş ${mainRows.length} ürün, daha önce bakılan ${done.size}, işlenecek ${todo.length}`);

const toJpg = (raw) =>
  sharp(raw)
    .flatten({ background: "#ffffff" })
    .resize({ width: 800, height: 800, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();
const md5 = (buf) => createHash("md5").update(buf).digest("hex");

// Ham görselleri sırayla işler; ana görselle/öncekilerle aynı olanları eler, kalanları ek/<barkod>-<n>.jpg yazar.
async function saveExtras(b, raws) {
  const seen = new Set([md5(readFileSync(`${DIR}/${SRC}/${b}.jpg`))]);
  let n = 0;
  for (const raw of raws) {
    if (n >= MAX_EXTRA) break;
    if (!raw || raw.length < 1500) continue;
    let jpg;
    try {
      jpg = await toJpg(raw);
    } catch {
      continue; // görsel olmayan yanıt
    }
    const h = md5(jpg);
    if (seen.has(h)) continue;
    seen.add(h);
    writeFileSync(`${OUT}/${b}-${++n}.jpg`, jpg);
  }
  return n;
}

async function getBuf(url, headers) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(30000) });
    if (res.status === 404 || res.status === 403) return null;
    if (res.status >= 500) {
      await sleep(1500 * attempt);
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (!(res.headers.get("content-type") ?? "").startsWith("image/")) return null;
    return Buffer.from(await res.arrayBuffer());
  }
  throw new Error("görsel alınamadı");
}

// ---- Tarayıcı oturumu (dunya, guclu): tek sekme, düşerse yeniden giriş ----
let browser = null;
let session = null;
let opening = null;
async function getSession(login) {
  if (session) return session;
  opening ??= (async () => {
    for (let attempt = 1; ; attempt++) {
      const page = await browser.newPage();
      try {
        await login(page);
        session = page;
        return page;
      } catch (e) {
        page.close().catch(() => {});
        if (attempt >= 4) throw e;
        await sleep(5000 * attempt);
      }
    }
  })().finally(() => (opening = null));
  return opening;
}
function dropSession(page) {
  if (session === page) session = null;
  page.close().catch(() => {});
}

// ---- Kaynaklar: her biri (satır) => ham görsel listesi (ana görsel dahil olabilir) ----
let extract;

if (SRC === "akgun") {
  const SITE = "https://b2b.akgundagitim.com";
  let token = null;
  let loggingIn = null;
  const login = async () => {
    const res = await fetch(`${SITE}/api/vitrin/oturum`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ kullaniciAdi: env.AKGUN_USERNAME, sifre: env.AKGUN_PASSWORD, beniHatirla: false }),
    });
    const j = await res.json().catch(() => null);
    if (!res.ok || !j?.token) throw new Error(`Akgün girişi başarısız (HTTP ${res.status})`);
    token = j.token;
  };
  await login();
  const api = async (path, binary = false) => {
    for (let attempt = 1; attempt <= 4; attempt++) {
      const used = token;
      const res = await fetch(`${SITE}${path}`, {
        headers: { Accept: binary ? "image/*" : "application/json", Authorization: `Bearer ${used}` },
        signal: AbortSignal.timeout(30000),
      });
      if (res.status === 401) {
        if (token === used) loggingIn ??= login().finally(() => (loggingIn = null));
        await loggingIn;
        continue;
      }
      if (res.status >= 500) {
        await sleep(1500 * attempt);
        continue;
      }
      return res;
    }
    throw new Error("istek tamamlanamadı");
  };
  extract = async ({ b }) => {
    const search = await api(`/api/vitrin/arama?q=${b}`);
    if (!search.ok) throw new Error(`arama HTTP ${search.status}`);
    const hit = ((await search.json()).urunler ?? []).find((u) => String(u.barkod) === b);
    if (!hit) return [];
    const detail = await api(`/api/vitrin/urun/${hit.id}`);
    if (!detail.ok) throw new Error(`detay HTTP ${detail.status}`);
    const count = (await detail.json()).resimSayisi ?? 1;
    const raws = [];
    for (let i = 1; i < Math.min(count, MAX_EXTRA + 3); i++) {
      const img = await api(`/api/vitrin/urun/${hit.id}/resim?i=${i}`, true);
      if (img.ok) raws.push(Buffer.from(await img.arrayBuffer()));
    }
    return raws;
  };
} else if (SRC === "dunya") {
  const SITE = "https://b2b.bayidunya.com";
  const CDN = "https://d1y8qveuwztoxr.cloudfront.net/b2b_bayidunya";
  browser = await puppeteer.launch({ executablePath: EDGE, headless: true });
  const login = async (page) => {
    await page.goto(`${SITE}/login#!/signin`, { waitUntil: "networkidle2", timeout: 45000 });
    await page.waitForSelector("#mail", { timeout: 20000 });
    await page.type("#mail", env.DUNYA_USERNAME, { delay: 15 });
    await page.type("#password", env.DUNYA_PASSWORD, { delay: 15 });
    await Promise.all([page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 }).catch(() => {}), page.click("#login-btn")]);
    await sleep(3000);
    if (page.url().includes("/login")) throw new Error("Dünya girişi başarısız");
  };
  await getSession(login);
  extract = async ({ b }) => {
    for (let attempt = 1; attempt <= 4; attempt++) {
      const page = await getSession(login);
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
        }, b);
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
        dropSession(page);
        continue;
      }
      const hit = (json.result === true ? (json.data?.product ?? []) : []).find((p) => String(p.e) === b);
      const files = (hit?.f ?? []).map((x) => x?.a).filter(Boolean);
      const raws = [];
      for (const file of files.slice(1, MAX_EXTRA + 3)) raws.push(await getBuf(`${CDN}/${file}`));
      return raws;
    }
    throw new Error("arama yanıtı alınamadı");
  };
} else {
  const SITE = "https://b2b.guclukirtasiye.com";
  browser = await puppeteer.launch({ executablePath: EDGE, headless: true });
  const login = async (page) => {
    await page.goto(`${SITE}/Giris`, { waitUntil: "networkidle2", timeout: 45000 });
    await page.waitForSelector("#Kullanici_Adi", { timeout: 20000 });
    await page.$eval("#Kullanici_Adi", (e) => (e.value = ""));
    await page.type("#Kullanici_Adi", env.GUCLU_USER, { delay: 15 });
    await page.type("#Sifre", env.GUCLU_PASS, { delay: 15 });
    await page.click("input[name=Giris]");
    await sleep(5000);
    if (page.url().includes("/Giris")) throw new Error("Güçlü girişi başarısız");
  };
  await getSession(login);
  const getHtml = async (url) => {
    for (let attempt = 1; attempt <= 4; attempt++) {
      const page = await getSession(login);
      let r;
      try {
        r = await page.evaluate(async (u) => {
          const res = await fetch(u, { credentials: "include" });
          return { url: res.url, status: res.status, html: await res.text() };
        }, url);
      } catch {
        dropSession(page);
        await sleep(1000);
        continue;
      }
      if (r.url.includes("/Giris")) {
        dropSession(page);
        continue;
      }
      if (r.status >= 500) {
        await sleep(1500 * attempt);
        continue;
      }
      return r.html;
    }
    throw new Error("sayfa alınamadı");
  };
  extract = async ({ b, id }) => {
    const html = await getHtml(`${SITE}/Arama/Arama?q=${b}`);
    const items = html.split('class="prbx-item"').slice(1);
    if (items.length !== 1) return []; // ilk indirmede de tek sonuç şartı vardı
    const detail = items[0].match(/href="(\/Stok\/StokDetay\/\d+)"/)?.[1];
    if (!detail) return [];
    const page = await getHtml(`${SITE}${detail}`);
    const gallery = page.match(/class="alt-image">([\s\S]*?)<\/div>/)?.[1] ?? "";
    const ids = [...new Set([...gallery.matchAll(/Stokpic\/Normal\/(\d+)\.png/g)].map((m) => m[1]))].filter((x) => x !== "0" && x !== String(id));
    const raws = [];
    for (const sid of ids.slice(0, MAX_EXTRA + 3)) raws.push(await getBuf(`${SITE}/Content/img/Stokpic/Normal/${sid}.png`));
    return raws;
  };
}

let stopping = false;
process.on("SIGINT", () => {
  stopping = true;
  console.log("\nDurduruluyor, o anki istekler bitince çıkılacak (ilerleme kayıtlı)...");
});

const counts = { ok: 0, yok: 0, hata: 0 };
let extras = 0;
let failStreak = 0;
let next = 0;
const started = Date.now();

async function worker() {
  while (!stopping) {
    const i = next++;
    if (i >= todo.length) return;
    const row = todo[i];
    let r;
    try {
      const n = await saveExtras(row.b, await extract(row));
      r = n > 0 ? { s: "ok", n } : { s: "yok" };
      extras += n;
    } catch (e) {
      r = { s: "hata", e: e.message };
      console.log(`  hata ${row.b}: ${e.message}`);
    }
    counts[r.s]++;
    appendFileSync(STATE, JSON.stringify({ b: row.b, src: SRC, ...r }) + "\n");
    failStreak = r.s === "hata" ? failStreak + 1 : 0;
    if (failStreak >= 15 && !stopping) {
      stopping = true;
      console.log("Üst üste 15 hata: sorun var, tarama durduruldu. Tekrar çalıştırınca devam eder.");
    }
    const n = counts.ok + counts.yok + counts.hata;
    if (n % 100 === 0 || n === todo.length) {
      console.log(`${n}/${todo.length}  ekliGörselli=${counts.ok} ek=${extras} yok=${counts.yok} hata=${counts.hata}  (${((Date.now() - started) / 60000).toFixed(1)} dk)`);
    }
    await sleep(DELAY_MS);
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));
await browser?.close();
console.log(`Bitti${stopping ? " (durduruldu, tekrar çalıştırınca devam eder)" : ""}: ekGörselliÜrün=${counts.ok} ekGörsel=${extras} yok=${counts.yok} hata=${counts.hata}`);
