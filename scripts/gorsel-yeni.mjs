// Haftalık aktarımdan sonra görseli olmayan ürünleri çalışan toptancı sitelerinde arar, bulunanları R2'ye yükler.
// Daha önce bakılmış barkodlar tekrar aranmaz (gorsel-veri/<site>-durum.jsonl), yani her hafta yalnızca yeni ürünlere bakılır.
// Giriş bilgileri .env.local'de olduğu ve tarayıcı gerektirdiği için sunucuda değil, bu bilgisayarda çalışır.
// Kullanım: npm run gorsel:yeni
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const SITES = ["kadioglu", "ozkol", "esen", "rich", "mnk", "pastel", "hiz", "redka", "yargi"];
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

if (!existsSync("node_modules/puppeteer-core")) {
  console.log("puppeteer-core kuruluyor (package.json değişmez)...");
  const installed = spawnSync(npm, ["install", "--no-save", "puppeteer-core"], { stdio: "inherit", shell: process.platform === "win32" });
  if (installed.status !== 0) process.exit(installed.status ?? 1);
}

const failed = [];
for (const site of SITES) {
  const search = spawnSync(process.execPath, ["--env-file=.env", "scripts/gorsel-toptanci.mjs", "--site", site], { stdio: "inherit" });
  if (search.status !== 0) {
    failed.push(`${site} (arama)`);
    continue;
  }
  const upload = spawnSync(process.execPath, ["scripts/gorsel-r2-yukle.mjs", "--kaynak", site], { stdio: "inherit" });
  if (upload.status !== 0) failed.push(`${site} (yükleme)`);
}

console.log(failed.length ? `\nBitti, sorun olan siteler: ${failed.join(", ")}` : "\nBitti.");
console.log("Görsellerin mağazada görünmesi için panelde herhangi bir ürünü bir kez kaydedin.");
process.exit(failed.length ? 1 : 0);
