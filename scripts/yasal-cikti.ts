// Avukata gidecek yasal metin çıktısı: sitedeki metinlerin (lib/legal-content.ts) aynısını, inceleme notları ve eksik
// ticari bilgilerle birlikte tek bir HTML + PDF dosyasına yazar. Çıktı depoya girmez (yasal-inceleme/, .gitignore).
//
//   npm run yasal:cikti
//
// PDF için kurulu Microsoft Edge (ya da Chrome) kullanılır; bulunamazsa yalnızca HTML yazılır (tarayıcıda açıp
// "Yazdır > PDF olarak kaydet" ile de alınabilir).
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  PICKUP_WAIT_DAYS,
  dataProcessors,
  getLegalDocument,
  legalOwner,
  legalOwnerFields,
  legalReviewed,
  missingOwnerInfo,
  missingShippingInfo,
  paymentProvider,
  plannedCommerce,
  shippingTermFields,
  shippingTerms,
  transferRecipients,
} from "@/lib/legal-content";
import { infoPages, site } from "@/lib/site";

const esc = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// Doldurulacak yerler çıktıda sarı vurgulanır.
const mark = (value: string) => esc(value).replace(/\[DOLDURULACAK: [^\]]+\]/g, (m) => `<mark>${m}</mark>`);

// Çıktı, sitenin hedeflenen satış modelini (kargo + online ödeme) anlatır; sitede şu an yayımlanan metin
// `liveCommerce`'e göredir (lib/legal-content.ts).
const mode = plannedCommerce;

// Avukatın değerlendirmesi istenen varsayımlar ve sorular. Metinlerde bir karar değişince burası da güncellenmeli.
const reviewNotes: string[] = [
  `İş modeli: Site üzerinden sipariş alınıyor. Teslimat iki yolla yapılıyor: (1) kargo ile, yalnızca ${shippingTerms.area} adreslere; (2) mağazadan teslim. Ödeme iki yolla alınıyor: (1) ${paymentProvider.name} altyapısıyla online kart ödemesi (3D Secure); (2) yalnızca mağazadan teslimde, teslim sırasında mağazada nakit/kart. Kargo siparişlerinde ödeme her zaman online; kapıda ödeme yok. Tüm siparişlerde (mağazadan teslim ve mağazada ödeme dahil) Mesafeli Sözleşmeler Yönetmeliği'nin uygulanacağı varsayıldı. Bu yaklaşım doğru mu?`,
  "İade kargo ücreti (işletmenin tercihiyle çelişebilir, lütfen özellikle değerlendirin): İşletme, cayma hakkıyla yapılan iadelerde kargo ücretinin müşteriye ait olmasını istiyor. Metinde ise, Mesafeli Sözleşmeler Yönetmeliği'nin iade masrafına ilişkin hükmü dikkate alınarak, müşterinin ürünü mağazaya getirerek veya satıcının bildirdiği anlaşmalı kargo firması ve iade koduyla ÜCRETSİZ iade edebileceği, başka bir kargo firmasıyla gönderirse ücretin kendisine ait olduğu yazıldı. İade masrafının ön bilgilendirmede açıkça belirtilerek tüketiciye yükletilmesi mümkün mü, yoksa metindeki hali mi zorunlu?",
  "Cayma hakkının koşulsuzluğu: İşletme “müşteri dükkâna gelip danışır, uygunsa iade alınır” şeklinde bir uygulama düşünüyordu. Cayma hakkı (m. 15 istisnaları dışında) satıcının onayına bağlanamayacağı için metne böyle bir şart YAZILMADI. Doğrulayın.",
  "Onay akışı: Sipariş sayfasında “Ön Bilgilendirme Formu'nu ve Mesafeli Satış Sözleşmesi'ni okudum, onaylıyorum” kutusu işaretlenmeden sipariş verilemiyor (sunucu tarafında da kontrol ediliyor). Düğme metni “Siparişi Onayla”; altında “Siparişi onaylayınca ödeme yükümlülüğü doğar” açıklaması var. Online ödemede ardından PayTR ödeme sayfası açılıyor; ödeme onaylanmazsa sipariş kurulmamış sayılıyor. Onay zamanı olarak siparişin oluşturulma zamanı kayıtlı; onayın ayrıca (ör. metin sürümüyle) kaydedilmesi gerekir mi? Düğme metni “Siparişi Onayla ve Öde” gibi ödeme yükümlülüğünü daha açık belirten bir ifade mi olmalı?",
  "Kalıcı veri saklayıcısı: Sipariş onayı e-postasında alıcı bilgileri, sipariş özeti ve Ön Bilgilendirme Formu ile Mesafeli Satış Sözleşmesi'nin tam metni gönderiliyor. Yeterli mi, yoksa PDF eki mi tercih edilmeli?",
  `Teslim alınmayan sipariş (mağazadan teslim): Hazır olduğu bildirilen siparişin ${PICKUP_WAIT_DAYS} gün içinde alınmaması halinde siparişin iptal edilebileceği; online ödenmişse tutarın 14 gün içinde iade edileceği yazıldı. Süre ve ifade uygun mu?`,
  "Kargo: Ürün alıcıya teslim edilene kadar kayıp ve hasardan satıcının sorumlu olduğu; hasarlı paketin tutanakla teslim alınmasının yalnızca önerildiği (hakları sınırlamadığı); teslim edilemeyip geri dönen gönderide alıcının isterse yeniden gönderim veya iade seçebileceği yazıldı. Geri dönen gönderide ikinci gönderim ücreti alınabilir mi?",
  "Gönderim bölgesi: Kargo yalnızca İzmir il sınırları içine yapılıyor; diğer illerden kargo siparişi verilemiyor (mağazadan teslim herkese açık). Bölge sınırlamasının ön bilgilendirmede bu şekilde belirtilmesi yeterli mi?",
  "Cayma hakkı: Ambalajın açılmamış olması genel bir iade şartı olarak YAZILMADI (yönetmelikteki istisnalar dışında cayma bu şarta bağlanamayacağı düşünüldü); yalnızca olağan incelemenin ötesindeki kullanımdan doğan değer kaybı belirtildi. Kitap ve kırtasiye ürünleri için istisna listesi yeterli mi?",
  "İade edilecek bedel: Cayma halinde ürün bedeli ile birlikte ödenen teslimat (kargo) ücretinin de iade edileceği yazıldı. Ödeme yöntemleri: mağazada nakit veya banka/kredi kartı kabul edildiği yazıldı; iade aynı yöntemle (kartla ödemede aynı karta) yapılıyor. İşletmenin gerçekte kabul ettiği yöntemlerle teyit edilecek.",
  `Ödeme kuruluşu ve kargo firması: ${paymentProvider.name} ve kargo firması metinde “sözleşmenin ifası için veri aktarılan kuruluşlar” olarak, yurt dışındaki altyapı sağlayıcılarından (veri işleyen) ayrı yazıldı. Bu kuruluşlar veri işleyen mi, ayrı veri sorumlusu mu sayılmalı; aydınlatma metninde farklı bir ifade gerekir mi?`,
  "Yurt dışına aktarım (KVKK m. 9): Veriler Hetzner (Almanya) sunucusunda ve Neon veritabanında (Frankfurt veri merkezi, ABD merkezli şirket) tutuluyor; Cloudflare (ABD) DNS/ağ güvenliği ve görsel depolama, Resend (ABD) e-posta gönderimi için kullanılıyor. Metinde aktarımın “m. 9'daki uygun güvencelerden biri (standart sözleşme)” ile yapıldığı yazıldı. Standart sözleşmenin (Kurul'un ilan ettiği metin) bu sağlayıcılarla imzalanması ve Kurul'a süresi içinde bildirilmesi gerekiyor mu, yoksa başka bir dayanak mı önerilir?",
  "VERBİS: İşletmenin yıllık çalışan sayısı ve mali bilanço büyüklüğüne göre VERBİS kayıt yükümlülüğünden muaf olup olmadığı değerlendirilmeli.",
  "Ticari elektronik ileti: Yalnızca işlemle ilgili e-postalar (sipariş onayı, sipariş durumu, parola sıfırlama, e-posta doğrulama) gönderiliyor; kampanya iletisi yok. Bu nedenle İYS kaydı ve ileti onayı alınmadığı varsayıldı.",
  "Çerezler: Yalnızca zorunlu çerezler kullanılıyor (oturum, sepet, üyeliksiz sipariş görüntüleme, yönetim paneli tercihleri, Cloudflare güvenlik çerezi; ödeme adımında PayTR'nin kendi güvenlik çerezleri). Analiz/reklam çerezi yok; bu yüzden çerez onay bandı konmadı. Uygun mu?",
  "Saklama süreleri: sipariş/fatura kayıtları 10 yıl, mesafeli sözleşme kayıtları 3 yıl, iletişim formu mesajları 2 yıl, oturum ve güvenlik kayıtları süreleri dolunca otomatik siliniyor. Kişisel veri saklama ve imha politikası ayrıca hazırlanmalı mı?",
  "Üyelik: Üyelik için 18 yaş veya veli/vasi onayı şartı yazıldı (okul ürünleri nedeniyle küçük kullanıcı olabilir). Ürün yorumları mağaza onayından sonra ad ve soyadın baş harfiyle (“Ayşe Y.”) yayımlanıyor.",
  "Uyuşmazlık: Tüketici Hakem Heyeti parasal sınırı ve tüketici mahkemesinden önce zorunlu arabuluculuk genel ifadeyle yazıldı. Tacir olmayan üyeler için yetkili mahkeme İzmir olarak belirtildi.",
  "E-ticaret bilgileri: 6563 sayılı Kanun ve ilgili yönetmelik kapsamında unvan, adres, iletişim, vergi ve MERSİS/sicil bilgileri sitenin altbilgisinde ve yasal metinlerde gösterilecek. ETBİS kaydı alan adı alındıktan sonra yapılacak; ETBİS doğrulama karekodu sitenin altına eklenecek.",
  "Eklenmeyenler (gerekirse belirtin): açık fiyat hatası halinde siparişin iptali maddesi, mücbir sebep maddesi, kampanya/indirim koşulları metni, taksitli satış koşulları (PayTR taksit sunarsa).",
];

function documentsHtml(): string {
  return infoPages
    .map((page) => {
      const doc = getLegalDocument(page.slug, mode)!;
      const sections = doc.sections
        .map((s) => `<h3>${esc(s.heading)}</h3>${s.paragraphs.map((p) => `<p>${mark(p)}</p>`).join("")}`)
        .join("");
      return `<section class="doc"><h2>${esc(page.title)}</h2><p class="url">Sitedeki adresi: /bilgi/${page.slug}</p>${doc.intro ? `<p class="intro">${mark(doc.intro)}</p>` : ""}${sections}</section>`;
    })
    .join("");
}

function ownerTable(): string {
  const rows = legalOwnerFields
    .map((f) => {
      const value = legalOwner[f.key];
      return `<tr><td>${esc(f.label)}${f.required ? "" : " <small>(varsa)</small>"}</td><td>${value ? esc(value) : "<mark>doldurulacak</mark>"}</td></tr>`;
    })
    .join("");
  return `<table><tbody>${rows}<tr><td>Adres</td><td>${esc(site.address.full)}</td></tr><tr><td>Telefon / e-posta</td><td>${esc(site.phone)} · ${esc(site.email)}</td></tr></tbody></table>`;
}

function shippingTable(): string {
  const rows = shippingTermFields
    .map((f) => `<tr><td>${esc(f.label)}</td><td>${shippingTerms[f.key] ? esc(shippingTerms[f.key]) : "<mark>doldurulacak</mark>"}</td></tr>`)
    .join("");
  return `<table><tbody>${rows}<tr><td>Online ödeme kuruluşu</td><td>${esc(paymentProvider.name)}</td></tr></tbody></table>`;
}

const today = new Date().toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
const missing = missingOwnerInfo();
const missingShipping = missingShippingInfo();

const html = `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><title>${esc(site.name)} - Yasal Metinler (Taslak)</title>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  body { font-family: "Segoe UI", Arial, sans-serif; font-size: 10.5pt; line-height: 1.5; color: #1c1917; max-width: 820px; margin: 0 auto; padding: 24px; }
  h1 { font-size: 20pt; margin: 0 0 4px; }
  h2 { font-size: 14pt; margin: 0 0 2px; border-bottom: 2px solid #1c1917; padding-bottom: 4px; }
  h3 { font-size: 11pt; margin: 14px 0 4px; }
  p { margin: 0 0 6px; }
  .meta { color: #57534e; margin-bottom: 18px; }
  .box { border: 1px solid #d6d3d1; border-radius: 8px; padding: 12px 16px; margin: 16px 0; }
  .doc { page-break-before: always; }
  .url { color: #78716c; font-size: 9pt; margin-bottom: 10px; }
  .intro { font-style: italic; }
  ol li { margin-bottom: 8px; }
  mark { background: #fde047; padding: 0 2px; }
  table { border-collapse: collapse; width: 100%; } td { border: 1px solid #d6d3d1; padding: 4px 8px; vertical-align: top; } td:first-child { width: 40%; }
</style></head><body>
<h1>${esc(site.name)} — Yasal Metinler</h1>
<p class="meta">${legalReviewed ? "Onaylanmış metinler" : "TASLAK — hukuki inceleme için"} · ${esc(today)}</p>

<div class="box">
  <p>Bu belge, internet sitesinde yayımlanacak yasal metinlerin tamamını içerir. Metinler sitenin hedeflenen satış modeline göredir: İzmir içi kargo ve PayTR ile online ödeme, mağazadan teslim ve mağazada ödeme seçenekleriyle birlikte. (Site şu an yalnızca mağazadan teslim ve mağazada ödemeyle çalışıyor; kargo ve online ödeme açıldığında sitede bu metinler yayımlanacak.)</p>
  <p>Sarı işaretli yerler işletmenin ticari bilgileri ve kargo koşulları kesinleşince doldurulacaktır. Düzeltmeler doğrudan bu metin üzerine işaretlenebilir.</p>
  <p>İçindekiler: ${infoPages.map((p) => esc(p.title)).join(" · ")}</p>
</div>

<h2>Satıcı bilgileri</h2>
${ownerTable()}
${missing.length ? `<p><mark>Eksik: ${missing.map(esc).join(", ")}</mark></p>` : ""}

<h2 style="margin-top:22px">Kargo ve ödeme koşulları</h2>
${shippingTable()}
${missingShipping.length ? `<p><mark>Eksik: ${missingShipping.map(esc).join(", ")}</mark></p>` : ""}

<h2 style="margin-top:22px">Değerlendirilmesi istenen konular</h2>
<ol>${reviewNotes.map((n) => `<li>${esc(n)}</li>`).join("")}</ol>

<h2 style="margin-top:22px">Veri aktarılan kuruluşlar</h2>
<p>Siparişin ifası için (Türkiye):</p>
<ul>${transferRecipients(mode).map((r) => `<li><strong>${mark(r.name)}</strong>: ${esc(r.data)}; ${esc(r.purpose)}</li>`).join("")}</ul>
<p>Altyapı sağlayıcıları (veri işleyen):</p>
<ul>${dataProcessors.map((p) => `<li><strong>${esc(p.name)}</strong> (${esc(p.country)}): ${esc(p.purpose)}</li>`).join("")}</ul>

${documentsHtml()}
</body></html>`;

const outDir = path.resolve("yasal-inceleme");
mkdirSync(outDir, { recursive: true });
const htmlPath = path.join(outDir, "yasal-metinler.html");
const pdfPath = path.join(outDir, "yasal-metinler.pdf");
writeFileSync(htmlPath, html, "utf8");
console.log(`HTML: ${htmlPath}`);

const browsers = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
];
const browser = browsers.find((b) => existsSync(b));
if (browser) {
  execFileSync(browser, [
    "--headless",
    "--disable-gpu",
    "--no-pdf-header-footer",
    `--print-to-pdf=${pdfPath}`,
    pathToFileURL(htmlPath).href,
  ], { stdio: "ignore" });
  console.log(`PDF:  ${pdfPath}`);
} else {
  console.log("Edge/Chrome bulunamadı; PDF için HTML'i tarayıcıda açıp PDF olarak yazdırın.");
}
if (missing.length) console.log(`Eksik ticari bilgiler: ${missing.join(", ")}`);
if (missingShipping.length) console.log(`Eksik kargo koşulları: ${missingShipping.join(", ")}`);
