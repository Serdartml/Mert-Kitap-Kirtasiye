// Görseli olmayan ürünleri yeni toptancı sitelerinde barkodla sırayla arar (bir sitede bulunan ürün sonraki sitede aranmaz).
// Gerekli (package.json'a eklenmedi): npm install --no-save puppeteer-core  ve kurulu Edge.
// Giriş bilgileri .env.local içinden (<SİTE>_USER / <SİTE>_PASS) okunur; hiçbir yere yazdırılmaz.
//
// Akış, her site için:
//   1) Görselsiz ürünler veritabanından alınır; bu çalışmanın önceki sitelerinde görseli bulunmuş (gorsel-veri/<site>/<barkod>.jpg)
//      ve bu sitede daha önce bakılmış ("ok"/"yok") barkodlar çıkarılır.
//   2) Her barkod sitede aranır; eşleşme yalnızca barkod birebir doğrulanınca ya da arama TEK sonuç döndürünce kabul edilir.
//   3) Görsel 800 px JPEG olarak gorsel-veri/<site>/<barkod>.jpg dosyasına yazılır.
//   4) Site sonunda AYIKLAMA: aynı görsel 3+ farklı barkoda inmişse (yer tutucu), çok küçük ya da düz renkli görseller silinir,
//      o barkodlar "yok" sayılır. Kalanlar "bulundu" olur ve sonraki sitelerde aranmaz.
// Yükleme ayrıdır: npm run gorsel:r2 -- --kaynak <site>
//
// Durdurup devam etme: gorsel-veri/<site>-durum.jsonl ("ok", "yok" kalır; "hata" tekrar denenir).
// Kullanım: node scripts/gorsel-toptanci.mjs                      (tüm siteler sırayla)
//           node scripts/gorsel-toptanci.mjs --site rich,redka    (yalnızca bunlar, verilen sırayla)
//           node scripts/gorsel-toptanci.mjs --site rich --limit 30 --deneme   (eşit aralıklı 30 ürünle; dosyalar deneme klasörüne)
//           node scripts/gorsel-toptanci.mjs --ayikla rich        (yalnızca ayıklama)
import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import puppeteer from "puppeteer-core";
import sharp from "sharp";
import { PrismaClient } from "@prisma/client";

const DIR = "gorsel-veri";
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 Edg/130.0";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const md5 = (buf) => createHash("md5").update(buf).digest("hex");
const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : null;
};

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.split("=")[0].trim().replace(/^\uFEFF/, ""), l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")]),
);
// .env.local'deki yazım hataları: e-postadaki boşluk ve noktasız ı ("kırtasıye") giriş adında düzeltilir.
const cred = (key) => {
  let user = env[`${key}_USER`] ?? "";
  if (user.includes("@") || /kirtas/i.test(user.replace(/ı/g, "i"))) user = user.replace(/\s+/g, "").replace(/ı/g, "i");
  return { user, pass: env[`${key}_PASS`] ?? "" };
};

const decode = (s) =>
  (s ?? "")
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

// ---------------- Tarayıcı oturumu (site başına tek sekme; düşerse yeniden giriş) ----------------
let browser = null;
async function getBrowser() {
  browser ??= await puppeteer.launch({ executablePath: EDGE, headless: true, args: ["--ignore-certificate-errors"] });
  return browser;
}

function makeSession(login) {
  let session = null;
  let opening = null;
  const get = () => {
    if (session) return session;
    opening ??= (async () => {
      for (let attempt = 1; ; attempt++) {
        const page = await (await getBrowser()).newPage();
        await page.setUserAgent(UA);
        page.on("dialog", (d) => d.dismiss().catch(() => {}));
        try {
          await login(page);
          session = page;
          return page;
        } catch (e) {
          page.close().catch(() => {});
          if (attempt >= 3) throw e;
          console.log(`  giriş denemesi ${attempt} başarısız (${e.message.slice(0, 80)}), tekrar...`);
          await sleep(4000 * attempt);
        }
      }
    })().finally(() => (opening = null));
    return opening;
  };
  const drop = (page) => {
    if (session === page) session = null;
    page.close().catch(() => {});
  };
  // Oturumlu sayfa içinden istek: { status, url, text } ya da ikili için { status, type, b64 }
  const request = async (url, { method = "GET", body = null, headers = {}, binary = false, check = null } = {}) => {
    for (let attempt = 1; attempt <= 4; attempt++) {
      const page = await get();
      let r;
      try {
        r = await page.evaluate(
          async (url, method, body, headers, binary) => {
            const res = await fetch(url, { method, body, headers, credentials: "include" });
            if (binary) {
              const buf = new Uint8Array(await res.arrayBuffer());
              let s = "";
              for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
              return { status: res.status, url: res.url, type: res.headers.get("content-type") ?? "", b64: btoa(s) };
            }
            return { status: res.status, url: res.url, text: await res.text() };
          },
          url,
          method,
          body,
          headers,
          binary,
        );
      } catch {
        drop(page);
        await sleep(1000);
        continue;
      }
      if (r.status === 429 || r.status >= 500) {
        await sleep(3000 * attempt);
        continue;
      }
      // Oturum düştüyse (giriş sayfasına yönlendi) yeniden giriş
      if (check && !binary && !check(r)) {
        drop(page);
        continue;
      }
      return r;
    }
    throw new Error("istek tamamlanamadı");
  };
  return { get, request };
}

async function typeLogin(page, url, userSel, passSel, submitSel, key) {
  const { user, pass } = cred(key);
  if (!user || !pass) throw new Error(`.env.local içinde ${key}_USER / ${key}_PASS yok`);
  await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
  await page.waitForSelector(userSel, { timeout: 20000 });
  await page.$eval(userSel, (e) => (e.value = ""));
  await page.type(userSel, user, { delay: 15 });
  await page.$eval(passSel, (e) => (e.value = ""));
  await page.type(passSel, pass, { delay: 15 });
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 }).catch(() => {}),
    submitSel ? page.click(submitSel) : page.keyboard.press("Enter"),
  ]);
  await sleep(2500);
}

// Herkese açık adresten görsel (giriş gerekmez)
async function publicImage(url, referer) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    let res;
    try {
      res = await fetch(url, { headers: { "User-Agent": UA, Accept: "image/*", ...(referer ? { Referer: referer } : {}) }, signal: AbortSignal.timeout(30000) });
    } catch (e) {
      if (attempt === 3) throw e;
      await sleep(1500 * attempt);
      continue;
    }
    if (res.status === 404 || res.status === 403 || res.status === 410) return null;
    if (res.status >= 500 || res.status === 429) {
      await sleep(2000 * attempt);
      continue;
    }
    if (!res.ok) return null;
    if (!(res.headers.get("content-type") ?? "").startsWith("image/")) return null;
    return Buffer.from(await res.arrayBuffer());
  }
  return null;
}

// Adres listesinden ilk inen görsel (büyük boydan küçüğe denenir)
async function firstImage(urls, referer) {
  for (const u of [...new Set(urls.filter(Boolean))]) {
    const buf = await publicImage(u, referer);
    if (buf && buf.length > 1500) return buf;
  }
  return null;
}

// OpenCart önbellek adresinden (image/cache/catalog/x-300x300.jpg) özgün dosya adresi
const opencartOriginal = (src) => src.replace(/\/image\/cache\/(.*)-\d+x\d+(\.\w+)$/, "/image/$1$2");

// ---------------- Siteler (sıra .env.local'deki sırayla aynı) ----------------
// search(row) => { s: "ok", buf, n } | { s: "yok", neden, n? }
const SITES = {};

SITES.universal = () => {
  const SITE = "https://b2buniversalelt.com";
  const sess = makeSession((page) => typeLogin(page, `${SITE}/b2b`, "#username", "#password", "form button[type=submit]", "UNIVERSAL"));
  return {
    concurrency: 1,
    delay: 1500,
    async search({ b }) {
      const r = await sess.request(`${SITE}/api/tr/v1/layouts/b2b/products/search.json?q=${b}`);
      if (r.status !== 200) throw new Error(`HTTP ${r.status}`);
      const items = JSON.parse(r.text).products?.data ?? [];
      if (items.length === 0) return { s: "yok", neden: "universalda ürün yok" };
      const hit = items.find((p) => JSON.stringify(p.attributes).includes(b)) ?? (items.length === 1 ? items[0] : null);
      if (!hit) return { s: "yok", neden: "birden çok sonuç, barkod doğrulanamadı", n: items.length };
      const a = hit.attributes;
      const img = a.image_path ?? a.image_url ?? a.cover_image ?? a.images?.[0]?.url ?? a.images?.[0];
      if (!img || typeof img !== "string") return { s: "yok", n: a.name, neden: "görsel alanı yok" };
      const buf = await firstImage([new URL(img, SITE).href]);
      return buf ? { s: "ok", buf, n: a.name } : { s: "yok", n: a.name, neden: "görsel inmedi" };
    },
  };
};

SITES.emin = () => {
  const SITE = "https://www.eminisegitimi.com";
  const sess = makeSession((page) =>
    typeLogin(page, `${SITE}/index.php?route=account/login`, "#input-email", "#input-password", "form[action*=login] [type=submit]", "EMIN"),
  );
  return {
    concurrency: 3,
    delay: 300,
    async search({ b }) {
      const r = await sess.request(`${SITE}/index.php?route=product/search&search=${b}`);
      const content = r.text.split('id="content"')[1] ?? "";
      const cards = content.split('class="product-thumb').slice(1);
      if (cards.length === 0) return { s: "yok", neden: "eminde ürün yok" };
      if (cards.length > 1) return { s: "yok", neden: "birden çok sonuç", n: cards.length };
      const src = decode(cards[0].match(/<img src="([^"]+)"/)?.[1]);
      const n = decode(cards[0].match(/<h4><a[^>]*>([^<]*)</)?.[1]);
      if (!src || /placeholder|no_image/i.test(src)) return { s: "yok", n, neden: "görseli yok" };
      const buf = await firstImage([opencartOriginal(src), src]);
      return buf ? { s: "ok", buf, n } : { s: "yok", n, neden: "görsel inmedi" };
    },
  };
};

SITES.hiz = () => ({
  // Görsel adresi barkoda bağlı ve girişsiz: /Assets/urun_pic/<barkod>.jpg
  concurrency: 4,
  delay: 150,
  async search({ b }) {
    const buf = await firstImage([`https://enhizlibayi.com/Assets/urun_pic/${b}.jpg`]);
    return buf ? { s: "ok", buf } : { s: "yok", neden: "hızda görsel yok" };
  },
});

SITES.esen = () => {
  // Güçlü ile aynı altyapı (Stokpic); arama sonucu kısmi HTML ucundan alınır.
  const SITE = "https://b2b.esenkirtasiye.com";
  const sess = makeSession((page) => typeLogin(page, `${SITE}/Giris`, "#Kullanici_Adi", "#Sifre", "button[name=Giris]", "ESEN"));
  return {
    concurrency: 3,
    delay: 300,
    async search({ b }) {
      const r = await sess.request(`${SITE}/Arama/_Prbx?q=${b}&page=&Cat=&_StokBoxCount=&Paging=true`, { check: (x) => !x.url.includes("/Giris") });
      const items = r.text.split('class="prbx-item"').slice(1);
      if (items.length === 0) return { s: "yok", neden: "esende ürün yok" };
      const names = items.map((it) => decode(it.match(/class="prbx-ad[^"]*"[^>]*>([^<]*)</)?.[1]));
      if (items.length > 1) return { s: "yok", neden: "birden çok sonuç", n: names.slice(0, 3) };
      const id = items[0].match(/Stokpic\/(?:Midi|Normal|Mini)\/(\d+)\.(?:png|jpg)/)?.[1];
      if (!id || id === "0") return { s: "yok", n: names[0], neden: "görseli yok" };
      const buf = await firstImage([`${SITE}/Content/img/Stokpic/Normal/${id}.png`, `${SITE}/Content/img/Stokpic/Midi/${id}.png`]);
      return buf ? { s: "ok", buf, n: names[0] } : { s: "yok", n: names[0], neden: "görsel inmedi" };
    },
  };
};

SITES.indigo = () => {
  const SITE = "https://www.indigodukkan.com";
  const sess = makeSession((page) => typeLogin(page, `${SITE}/uye-girisi`, "#user-login-email", "#user-login-pass", null, "INDIGO"));
  return {
    concurrency: 3,
    delay: 300,
    async search({ b }) {
      const r = await sess.request(`${SITE}/arama?q=${b}`);
      // IdeaSoft vitrin kartları: data-id'li showcase öğeleri
      const cards = r.text.split(/class="showcase(?:-item)?\b/).slice(1);
      if (cards.length === 0) return { s: "yok", neden: "indigoda ürün yok" };
      if (cards.length > 1) return { s: "yok", neden: "birden çok sonuç", n: cards.length };
      const src = decode(cards[0].match(/<img[^>]+(?:data-src|src)="([^"]+)"/)?.[1]);
      const n = decode(cards[0].match(/title="([^"]+)"/)?.[1]);
      if (!src || /noimage|no-image|placeholder/i.test(src)) return { s: "yok", n, neden: "görseli yok" };
      const abs = new URL(src, SITE).href;
      const buf = await firstImage([abs.replace(/\/(\d+)\/(\d+)\//, "/1000/1000/"), abs]);
      return buf ? { s: "ok", buf, n } : { s: "yok", n, neden: "görsel inmedi" };
    },
  };
};

SITES.kadioglu = () => {
  const SITE = "https://www.kirtasiyem.com.tr";
  const sess = makeSession((page) => typeLogin(page, `${SITE}/`, "#bayiKodu", "#Sifre", null, "KADIOGLU"));
  return {
    concurrency: 3,
    delay: 300,
    async search({ b }) {
      const r = await sess.request(`${SITE}/Ara?q=${b}`, { check: (x) => x.text.includes("Mert Kitap") || x.text.includes("Çıkış") || x.text.includes("Hesabım") });
      const cards = r.text.split('class="urun-ana-satir"').slice(1);
      if (cards.length === 0) return { s: "yok", neden: "kadıoğlunda ürün yok" };
      const card = cards.find((c) => new RegExp(`Barkodu</span>\\s*<span[^>]*>\\s*:\\s*${b}\\s*<`).test(c));
      if (!card) return { s: "yok", neden: "barkod birebir eşleşmedi", n: cards.length };
      const src = decode(card.match(/class="UrunResimDiv"[^>]*src="([^"]+)"/)?.[1] ?? card.match(/<img[^>]+src="([^"]+)"/)?.[1]);
      const n = decode(card.match(/title="([^"]+)"/)?.[1]);
      if (!src || /resimHazirlaniyor|noimage|resimyok/i.test(src)) return { s: "yok", n, neden: "görseli yok" };
      const abs = new URL(src, SITE).href;
      const buf = await firstImage([abs.replace("/orta/", "/buyuk/"), abs]);
      return buf ? { s: "ok", buf, n } : { s: "yok", n, neden: "görsel inmedi" };
    },
  };
};

SITES.mnk = () => {
  const SITE = "https://www.mnkhome.com";
  const sess = makeSession((page) =>
    typeLogin(page, `${SITE}/uye-girisi-sayfasi`, "#login-email", "#login-password", "button[id^=customer-login-btn]", "MNK"),
  );
  return {
    concurrency: 3,
    delay: 300,
    async search({ b }) {
      const r = await sess.request(`${SITE}/arama?q=${b}`);
      // Sayfaya gömülü ürün verisi (kaçışlı JSON): ..."name":"..","barcode":"<barkod>",..."image":"<adres>-O.jpg"...
      const text = r.text.replace(/\\\//g, "/").replace(/\\"/g, '"');
      const m = text.match(new RegExp(`"name":"([^"]*)"[^{}]*?"barcode":"${b}"[^{}]*?"image":"([^"]+)"`));
      if (!m) return { s: "yok", neden: "mnkde ürün yok" };
      const n = decode(m[1].replace(/\\+u([0-9a-f]{4})/gi, (_, h) => String.fromCharCode(parseInt(h, 16))));
      const src = m[2];
      if (!src || /noimage|no-image|resimyok/i.test(src)) return { s: "yok", n, neden: "görseli yok" };
      const abs = new URL(src, SITE).href;
      const buf = await firstImage([abs.replace(/-[KO]\.(\w+)$/, "-B.$1"), abs.replace(/-[KB]\.(\w+)$/, "-O.$1"), abs]);
      return buf ? { s: "ok", buf, n } : { s: "yok", n, neden: "görsel inmedi" };
    },
  };
};

SITES.ozkol = () => {
  const SITE = "https://b2b.ozkolkirtasiye.com.tr";
  const sess = makeSession((page) =>
    typeLogin(page, `${SITE}/index.php?route=account/login`, "#input-email", "#input-password", "form[action*='account/login'] button[type=submit]", "OZKOL"),
  );
  return {
    concurrency: 3,
    delay: 300,
    async search({ b }) {
      const r = await sess.request(`${SITE}/index.php?route=product/search&search=${b}`, { check: (x) => !x.url.includes("account/login") });
      const content = r.text.split('id="content"')[1] ?? "";
      const cards = content.split('class="product-layout').slice(1);
      if (cards.length === 0) return { s: "yok", neden: "özkolda ürün yok" };
      if (cards.length > 1) return { s: "yok", neden: "birden çok sonuç", n: cards.length };
      const m = cards[0].match(/<img[^>]+src="([^"]+)"[^>]*alt="([^"]*)"/);
      const src = decode(m?.[1]);
      const n = decode(m?.[2]);
      if (!src || /placeholder/i.test(src)) return { s: "yok", n, neden: "görseli yok" };
      const buf = await firstImage([opencartOriginal(src), src.replace(/-\d+x\d+(\.\w+)$/, "-800x800$1"), src]);
      return buf ? { s: "ok", buf, n } : { s: "yok", n, neden: "görsel inmedi" };
    },
  };
};

SITES.pastel = () => ({
  // Görsel adresi barkoda bağlı ve girişsiz: /content/images/product/<barkod>.jpg|.png
  concurrency: 4,
  delay: 150,
  async search({ b }) {
    const base = "https://www.pastelkitapkirtasiye.com/content/images/product";
    const buf = await firstImage([`${base}/${b}.jpg`, `${base}/${b}.png`]);
    return buf ? { s: "ok", buf } : { s: "yok", neden: "pastelde görsel yok" };
  },
});

SITES.redka = () => {
  const SITE = "https://b2b.redka.com.tr";
  const sess = makeSession((page) =>
    typeLogin(page, `${SITE}/b2b/giris`, "input[name=username]", "input[name=password]", "form[action*=girisyap] button[type=submit]", "REDKA"),
  );
  return {
    concurrency: 2,
    delay: 400,
    async search({ b }) {
      const r = await sess.request(`${SITE}/b2b/search?searchType=barkodu&searchValue=${b}`, { check: (x) => !x.url.includes("/giris") });
      const cards = r.text.split('class="card shadow').slice(1);
      const card = cards.find((c) => c.includes(`Bar kodu: ${b}<`));
      if (!card) return { s: "yok", neden: cards.length ? "barkod birebir eşleşmedi" : "redkada ürün yok" };
      const src = decode(card.match(/<img class="img-fluid" src="([^"]+)"[^>]*style="height: 220px/)?.[1] ?? card.match(/<img[^>]+src="(https:\/\/entegroid[^"]+)"/)?.[1]);
      const n = decode(card.match(/<h4>([^<]*)</)?.[1]);
      if (!src || /gorsel-yok/i.test(src)) return { s: "yok", n, neden: "görseli yok" };
      const buf = await firstImage([src]);
      return buf ? { s: "ok", buf, n } : { s: "yok", n, neden: "görsel inmedi" };
    },
  };
};

SITES.rich = () => {
  // Dünya ile aynı altyapı: POST /search/get_live -> barkod alanı "e", görseller "f" (CDN b2b_rich)
  const SITE = "https://b2b.richhobby.com";
  const CDN = "https://d1y8qveuwztoxr.cloudfront.net/b2b_rich";
  const sess = makeSession(async (page) => {
    await typeLogin(page, `${SITE}/login#!/signin`, "#mail", "#password", null, "RICH");
    if (page.url().includes("/login")) throw new Error("Rich girişi başarısız");
  });
  return {
    concurrency: 3,
    delay: 300,
    async search({ b }) {
      const r = await sess.request(`${SITE}/search/get_live`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", "X-Requested-With": "XMLHttpRequest" },
        body: "q=" + encodeURIComponent(b),
        check: (x) => x.text.trim().startsWith("{"),
      });
      const json = JSON.parse(r.text);
      const hit = (json.result === true ? (json.data?.product ?? []) : []).find((p) => String(p.e).trim() === b);
      if (!hit) return { s: "yok", neden: "richte ürün yok" };
      const file = (hit.f ?? []).map((x) => x?.a).find(Boolean);
      if (!file) return { s: "yok", n: hit.b, neden: "görseli yok" };
      const buf = await firstImage([`${CDN}/${file}`]);
      return buf ? { s: "ok", buf, n: hit.b } : { s: "yok", n: hit.b, neden: "görsel inmedi" };
    },
  };
};

SITES.timas = () => {
  const SITE = "https://timasdagitim.com";
  const sess = makeSession((page) => typeLogin(page, `${SITE}/Auth/Login`, "#Username", "#txtSifre", "form[action='/Auth/Login'] input[type=submit]", "TIMAS"));
  return {
    concurrency: 3,
    delay: 300,
    async search({ b }) {
      const r = await sess.request(`${SITE}/search/SearchTerm?searchTerm=${b}`);
      const groups = JSON.parse(r.text || "[]");
      const hit = groups.flatMap((g) => g.searchDetails ?? [])[0];
      if (!hit) return { s: "yok", neden: "timaşta ürün yok" };
      // Denemede (kültür kitabı 146 + rastgele 150) hiç eşleşme çıkmadı; eşleşme olursa görsel çekmek yerine kayda düşülür.
      return { s: "yok", n: hit.value, neden: `timaşta var (${hit.queryString}), görsel elle alınmalı` };
    },
  };
};

const ORDER = ["emin", "hiz", "esen", "kadioglu", "mnk", "ozkol", "pastel", "redka", "rich", "timas"];
// Sıraya alınmayanlar:
//   bilgikare (kalitimdagitim.com.tr'ye yönleniyor, şifre hatalı), kida (şifre hatalı), unnamed/Yanıt (şifre hatalı),
//   timon (girişte telefon/e-posta doğrulama kodu; girişsiz katalogda barkod yok), sinankuzucu (güvenlik kodu),
//   universal (yabancı dil kitapları; arama ucu sürekli 429 döndürüyor, --site universal ile ayrıca denenebilir),
//   indigo (arama sonuçları sayfaya JavaScript ile geliyor, ayrıştırıcı doğrulanmadı; --site indigo ile denenebilir).

// ---------------- Görsel işleme ve ayıklama ----------------
async function toJpg(raw) {
  const img = sharp(raw, { failOn: "none" });
  const meta = await img.metadata();
  if (!meta.width || !meta.height) throw new Error("görsel okunamadı");
  if (Math.max(meta.width, meta.height) < 150) return { bad: `çok küçük (${meta.width}x${meta.height})` };
  const jpg = await sharp(raw, { failOn: "none" })
    .flatten({ background: "#ffffff" })
    .resize({ width: 800, height: 800, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();
  const stats = await sharp(jpg).stats();
  if (stats.channels.every((c) => c.stdev < 6)) return { bad: "düz renk / boş görsel" };
  return { jpg };
}

function readState(file) {
  const map = new Map();
  if (!existsSync(file)) return map;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      const r = JSON.parse(line);
      map.set(r.b, r.s);
    } catch {
      // yarım satır
    }
  }
  return map;
}

// Site sonunda: aynı görsel 3+ barkoda inmişse yer tutucudur; silinir ve "yok" yazılır.
function ayikla(site, imgDir, stateFile) {
  if (!existsSync(imgDir)) return { kalan: 0, silinen: 0 };
  const files = readdirSync(imgDir).filter((f) => f.endsWith(".jpg"));
  const byHash = new Map();
  for (const f of files) {
    const h = md5(readFileSync(`${imgDir}/${f}`));
    byHash.set(h, [...(byHash.get(h) ?? []), f]);
  }
  let silinen = 0;
  for (const [, group] of byHash) {
    if (group.length < 3) continue;
    for (const f of group) {
      unlinkSync(`${imgDir}/${f}`);
      appendFileSync(stateFile, JSON.stringify({ b: f.slice(0, -4), s: "yok", neden: `yer tutucu (aynı görsel ${group.length} üründe)` }) + "\n");
      silinen++;
    }
  }
  const kalan = files.length - silinen;
  console.log(`[${site}] ayıklama: ${files.length} görselden ${silinen} yer tutucu silindi, ${kalan} görsel kaldı.`);
  return { kalan, silinen };
}

// Bu çalışmanın sitelerinde bulunmuş barkodlar (ayıklamadan geçmiş dosyalar)
function foundSoFar() {
  const found = new Set();
  for (const s of ORDER) {
    const d = `${DIR}/${s}`;
    if (existsSync(d)) for (const f of readdirSync(d)) if (f.endsWith(".jpg")) found.add(f.slice(0, -4));
  }
  return found;
}

// ---------------- Çalıştırma ----------------
const onlyAyikla = arg("--ayikla");
if (onlyAyikla) {
  for (const s of onlyAyikla.split(",")) ayikla(s, `${DIR}/${s}`, `${DIR}/${s}-durum.jsonl`);
  process.exit(0);
}

const siteArg = arg("--site");
const sites = siteArg ? siteArg.split(",").map((s) => s.trim().toLowerCase()) : ORDER;
for (const s of sites) if (!SITES[s]) throw new Error(`bilinmeyen site: ${s} (olanlar: ${ORDER.join(", ")})`);
const limit = Number(arg("--limit") ?? Infinity);
const trial = process.argv.includes("--deneme");

const db = new PrismaClient();
let stopping = false;
process.on("SIGINT", () => {
  stopping = true;
  console.log("\nDurduruluyor, o anki istekler bitince çıkılacak (ilerleme kayıtlı)...");
});

const ozet = [];
for (const site of sites) {
  if (stopping) break;
  const imgDir = trial ? `${DIR}/deneme-${site}` : `${DIR}/${site}`;
  const stateFile = trial ? `${DIR}/deneme-${site}-durum.jsonl` : `${DIR}/${site}-durum.jsonl`;
  mkdirSync(imgDir, { recursive: true });

  const products = await db.product.findMany({ where: { images: { none: {} }, barcode: { not: null } }, select: { barcode: true, name: true } });
  const found = foundSoFar();
  const done = readState(stateFile);
  let todo = products
    .map((p) => ({ b: p.barcode.trim(), ad: p.name }))
    .filter((r) => /^\d{8,14}$/.test(r.b) && !found.has(r.b) && !["ok", "yok"].includes(done.get(r.b)));
  const only = arg("--barkod");
  if (only) todo = only.split(",").map((b) => ({ b: b.trim() }));
  if (Number.isFinite(limit) && todo.length > limit) {
    const step = todo.length / limit;
    todo = Array.from({ length: limit }, (_, i) => todo[Math.floor(i * step)]);
  }
  console.log(`\n===== ${site.toUpperCase()}: görselsiz ${products.length}, önceki sitelerde bulunan ${found.size}, bu sitede bakılacak ${todo.length}`);

  let adapter;
  try {
    adapter = SITES[site]();
  } catch (e) {
    console.log(`[${site}] başlatılamadı: ${e.message}`);
    ozet.push({ site, hata: e.message });
    continue;
  }
  const counts = { ok: 0, yok: 0, hata: 0 };
  let failStreak = 0;
  let next = 0;
  let siteStop = false;
  const started = Date.now();

  async function worker() {
    while (!stopping && !siteStop) {
      const i = next++;
      if (i >= todo.length) return;
      const row = todo[i];
      let r;
      try {
        r = await adapter.search(row);
        if (r.s === "ok") {
          const { jpg, bad } = await toJpg(r.buf);
          if (bad) r = { s: "yok", n: r.n, neden: bad };
          else {
            writeFileSync(`${imgDir}/${row.b}.jpg`, jpg);
            r = { s: "ok", n: r.n };
          }
        }
      } catch (e) {
        r = { s: "hata", e: e.message.slice(0, 200) };
        if (counts.hata < 20) console.log(`  [${site}] hata ${row.b}: ${e.message.slice(0, 120)}`);
      }
      counts[r.s]++;
      appendFileSync(stateFile, JSON.stringify({ b: row.b, ...r }) + "\n");
      failStreak = r.s === "hata" ? failStreak + 1 : 0;
      if (failStreak >= 15 && !siteStop) {
        siteStop = true;
        console.log(`[${site}] üst üste 15 hata: bu site durduruldu, sıradakine geçiliyor (tekrar çalıştırınca devam eder).`);
      }
      const n = counts.ok + counts.yok + counts.hata;
      if (n % 200 === 0 || n === todo.length) {
        console.log(`[${site}] ${n}/${todo.length}  bulundu=${counts.ok} yok=${counts.yok} hata=${counts.hata}  (${((Date.now() - started) / 60000).toFixed(1)} dk)`);
      }
      await sleep(adapter.delay ?? 300);
    }
  }
  await Promise.all(Array.from({ length: adapter.concurrency ?? 3 }, worker));
  const ay = ayikla(site, imgDir, stateFile);
  ozet.push({ site, bakilan: counts.ok + counts.yok + counts.hata, bulunan: counts.ok, yerTutucu: ay.silinen, kalan: ay.kalan, hata: counts.hata, durduruldu: siteStop });
  // Site değişince tarayıcıyı kapat (sekmeler ve oturumlar temizlenir)
  await browser?.close().catch(() => {});
  browser = null;
}

await db.$disconnect();
await browser?.close().catch(() => {});
console.log("\n===== ÖZET");
for (const o of ozet) console.log(JSON.stringify(o));
if (!trial) writeFileSync(`${DIR}/toptanci-ozet.json`, JSON.stringify({ tarih: new Date().toISOString(), ozet }, null, 2));
