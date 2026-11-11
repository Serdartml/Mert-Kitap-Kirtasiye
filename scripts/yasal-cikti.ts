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
  `İş modeli: Site üzerinden sipariş alınıyor. Teslimat iki yolla yapılıyor: (1) adrese teslim: kargo firması değil, mağazanın kendi kuryesiyle, yalnızca İzmir'in ${shippingTerms.districts} ilçelerine, haftanın her günü; saat ${shippingTerms.sameDayCutoff}'den önce verilen sipariş aynı gün, sonrakiler ertesi gün, mağazanın kapanış saatine kadar; (2) mağazadan teslim. Ödeme iki yolla alınıyor: (1) ${paymentProvider.name} altyapısıyla online kart ödemesi (3D Secure); (2) yalnızca mağazadan teslimde, teslim sırasında mağazada nakit/kart. Adrese teslim siparişlerinde ödeme her zaman online; kapıda ödeme yok. Tüm siparişlerde (mağazadan teslim ve mağazada ödeme dahil) Mesafeli Sözleşmeler Yönetmeliği'nin uygulanacağı varsayıldı. Bu yaklaşım doğru mu?`,
  "İade yolu ve masrafı (KARAR, avukatla görüşüldü): Cayma hakkıyla iade iki yolla yapılıyor: ürün mağazaya getiriliyor (ücretsiz) ya da müşteri kendi seçtiği kargo firmasıyla, ücretini kendisi ödeyerek mağaza adresine gönderiyor. Satıcı ayrıca iade masrafı talep etmiyor, karşı ödemeli gönderi kabul edilmiyor; kurye iade almıyor. Bu hüküm teslimat yönteminden bağımsız olarak tüm siparişlerde geçerli.",
  "Cayma hakkının koşulsuzluğu: İşletme “müşteri dükkâna gelip danışır, uygunsa iade alınır” şeklinde bir uygulama düşünüyordu. Cayma hakkı (m. 15 istisnaları dışında) satıcının onayına bağlanamayacağı için metne böyle bir şart YAZILMADI. Doğrulayın.",
  "Onay akışı: Sipariş sayfasında “Ön Bilgilendirme Formu'nu ve Mesafeli Satış Sözleşmesi'ni okudum, onaylıyorum” kutusu işaretlenmeden sipariş verilemiyor (sunucu tarafında da kontrol ediliyor). Düğme metni “Siparişi Onayla”; altında “Siparişi onaylayınca ödeme yükümlülüğü doğar” açıklaması var. Online ödemede ardından PayTR ödeme sayfası açılıyor; ödeme onaylanmazsa sipariş kurulmamış sayılıyor. Onay zamanı olarak siparişin oluşturulma zamanı kayıtlı; onayın ayrıca (ör. metin sürümüyle) kaydedilmesi gerekir mi? Düğme metni “Siparişi Onayla ve Öde” gibi ödeme yükümlülüğünü daha açık belirten bir ifade mi olmalı?",
  "Kalıcı veri saklayıcısı (KARAR: PDF eki): Sipariş onayı e-postasının gövdesinde alıcı bilgileri, sipariş özeti ve Ön Bilgilendirme Formu ile Mesafeli Satış Sözleşmesi'nin tam metni yer alıyor; ayrıca aynı içerik (alıcı ve sipariş bilgileriyle) e-postaya PDF dosyası olarak ekleniyor.",
  `Teslim alınmayan sipariş (mağazadan teslim): Hazır olduğu bildirilen siparişin ${PICKUP_WAIT_DAYS} gün içinde alınmaması halinde siparişin iptal edilebileceği; online ödenmişse tutarın 14 gün içinde iade edileceği yazıldı. Süre ve ifade uygun mu?`,
  `Adrese teslim (KARAR: ikinci teslimat denemesi kaldırıldı, teslimat kodu eklendi): Ürün alıcıya teslim edilene kadar kayıp ve hasardan satıcı sorumlu. Sipariş yola çıkınca alıcının e-postasına teslimat kodu gidiyor; kurye ürünü yalnızca kodu bildirene teslim ediyor ve kodun bildirilmesiyle ürün teslim edilmiş sayılıyor. Adreste ulaşılamazsa kurye telefonla arıyor; yine ulaşılamazsa ikinci deneme yapılmıyor, ürün mağazaya dönüyor ve alıcı ${PICKUP_WAIT_DAYS} gün içinde mağazadan alabiliyor; alınmazsa sipariş iptal edilip tutar 14 gün içinde iade ediliyor. Paket açıkça hasarlıysa alıcının teslim almayabileceği yazıldı. Teslimat süresi (KARAR): ${shippingTerms.sameDayCutoff}'den önce verilen sipariş aynı gün, sonrakiler ertesi gün, mağazanın kapanış saatine kadar (Pazartesi–Cumartesi 21:00, Pazar 20:00). Gecikmede telefonla bilgilendirme yeterli bulundu.`,
  `Teslimat bölgesi: Adrese teslim yalnızca İzmir'in ${shippingTerms.districts} ilçelerine yapılıyor; diğer adreslere adrese teslim seçilemiyor (mağazadan teslim herkese açık). Bölge sınırlamasının ön bilgilendirmede bu şekilde belirtilmesi yeterli mi?`,
  "Cayma hakkı (KARAR: iade şartı eklendi): Cayma hakkıyla iade edilecek ürünün ambalajının açılmamış olması, ürünün yırtık, kirli veya hasarlı olmaması ve faturası ile aksesuarlarıyla eksiksiz iade edilmesi şartı Ön Bilgilendirme Formu, Mesafeli Satış Sözleşmesi ve İade ve Değişim sayfasına yazıldı. Ürün hasarlı veya ayıplı teslim edildiyse bu şartlar aranmıyor. Olağan incelemenin ötesindeki kullanımdan doğan değer kaybı maddesi de duruyor.",
  "İade edilecek bedel: Cayma halinde ürün bedeli ile birlikte ödenen teslimat ücretinin de iade edileceği yazıldı. Ödeme yöntemleri: mağazada nakit veya banka/kredi kartı kabul edildiği yazıldı; iade aynı yöntemle (kartla ödemede aynı karta) yapılıyor. İşletmenin gerçekte kabul ettiği yöntemlerle teyit edilecek.",
  `Ödeme kuruluşu: ${paymentProvider.name} metinde “sözleşmenin ifası için veri aktarılan kuruluş” olarak, yurt dışındaki altyapı sağlayıcılarından (veri işleyen) ayrı yazıldı. Veri işleyen mi, ayrı veri sorumlusu mu sayılmalı; aydınlatma metninde farklı bir ifade gerekir mi? Teslimatı mağazanın kendi çalışanı (kurye) yaptığından teslimat bilgisinin üçüncü kişiye aktarılmadığı yazıldı; kurye bir şirket çalışanı değil de dışarıdan hizmet alınan biri olursa metin değişmeli.`,
  "Yurt dışına aktarım (KVKK m. 9): Veriler Hetzner (Almanya) sunucusunda ve Neon veritabanında (Frankfurt veri merkezi, ABD merkezli şirket) tutuluyor; Cloudflare (ABD) DNS/ağ güvenliği ve görsel depolama, Resend (ABD) e-posta gönderimi için kullanılıyor. Metinde aktarımın “m. 9'daki uygun güvencelerden biri (standart sözleşme)” ile yapıldığı yazıldı. Standart sözleşmenin (Kurul'un ilan ettiği metin) bu sağlayıcılarla imzalanması ve Kurul'a süresi içinde bildirilmesi gerekiyor mu, yoksa başka bir dayanak mı önerilir?",
  "VERBİS (KARAR: kayıt zorunlu): İşletme VERBİS'e kaydolacak; metinlerde ayrıca bir değişiklik gerekmiyor.",
  "Ticari elektronik ileti: Yalnızca işlemle ilgili e-postalar (sipariş onayı, sipariş durumu, parola sıfırlama, e-posta doğrulama) gönderiliyor; kampanya iletisi yok. Bu nedenle İYS kaydı ve ileti onayı alınmadığı varsayıldı.",
  "Çerezler (KARAR: şimdilik böyle kalacak): Yalnızca zorunlu çerezler kullanılıyor (oturum, sepet, üyeliksiz sipariş görüntüleme, yönetim paneli tercihleri, Cloudflare güvenlik çerezi; ödeme adımında PayTR'nin kendi güvenlik çerezleri). Analiz/reklam çerezi yok, çerez onay bandı konmadı. İleride reklam veya analiz eklenirse çerez onayı ve metin güncellenecek.",
  "Saklama süreleri: sipariş/fatura kayıtları 10 yıl, mesafeli sözleşme kayıtları 3 yıl, iletişim formu mesajları 2 yıl, oturum ve güvenlik kayıtları süreleri dolunca otomatik siliniyor. Kişisel veri saklama ve imha politikası ayrıca hazırlanmalı mı?",
  "Üyelik: Üyelik için 18 yaş veya veli/vasi onayı şartı yazıldı (okul ürünleri nedeniyle küçük kullanıcı olabilir). Ürün yorumları mağaza onayından sonra ad ve soyadın baş harfiyle (“Ayşe Y.”) yayımlanıyor.",
  "Uyuşmazlık: Tüketici Hakem Heyeti parasal sınırı ve tüketici mahkemesinden önce zorunlu arabuluculuk genel ifadeyle yazıldı. Tacir olmayan üyeler için yetkili mahkeme İzmir olarak belirtildi.",
  "E-ticaret bilgileri: 6563 sayılı Kanun ve ilgili yönetmelik kapsamında unvan, adres, iletişim, vergi ve MERSİS/sicil bilgileri sitenin altbilgisinde ve yasal metinlerde gösterilecek. ETBİS kaydı alan adı alındıktan sonra yapılacak; ETBİS doğrulama karekodu sitenin altına eklenecek.",
  "Yeni eklenen maddeler (KARAR: mücbir sebep eklendi; fiyat hatası ve ödeme iptali maddeleri uygun bulundu): Mesafeli Satış Sözleşmesi'ne “8. Tarafların diğer yükümlülükleri” (ürünün sağlam, eksiksiz, siparişe uygun ve varsa garanti belgesiyle teslimi; alıcının onayı olmadan başka ürün gönderilmemesi; açık fiyat hatasında siparişin o ürünle ilgili kısmının iptali ve 14 gün içinde iade; ödemenin yapılmaması veya iptalinde teslim yükümlülüğünün sona ermesi, teslimden sonra kartın yetkisiz kullanımı nedeniyle bedel ödenmezse ürünün 3 gün içinde iadesi), “9. Mücbir sebep” (yükümlülüklerin askıya alınması, 30 günü aşarsa alıcının fesih hakkı ve 14 gün içinde iade; cayma ve ayıp hakları saklı) ve “10. Bildirimler” maddeleri eklendi. Pazaryeri sözleşmelerinde bulunan “satıcı kayıtları kesin delildir” (delil sözleşmesi) maddesi tüketici aleyhine haksız şart sayılabileceği için EKLENMEDİ. Hâlâ eklenmeyenler: kampanya/indirim koşulları metni, taksitli satış koşulları (PayTR taksit sunarsa).",
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
  <p>Bu belge, internet sitesinde yayımlanacak yasal metinlerin tamamını içerir. Metinler sitenin hedeflenen satış modeline göredir: İzmir merkez ilçelerine mağazanın kendi kuryesiyle adrese teslim ve PayTR ile online ödeme, mağazadan teslim ve mağazada ödeme seçenekleriyle birlikte. (Site şu an yalnızca mağazadan teslim ve mağazada ödemeyle çalışıyor; adrese teslim ve online ödeme açıldığında sitede bu metinler yayımlanacak.)</p>
  <p>Sarı işaretli yerler varsa işletme bilgileri kesinleşince doldurulacaktır. Düzeltmeler doğrudan bu metin üzerine işaretlenebilir.</p>
  <p>İçindekiler: ${infoPages.map((p) => esc(p.title)).join(" · ")}</p>
</div>

<h2>Satıcı bilgileri</h2>
${ownerTable()}
${missing.length ? `<p><mark>Eksik: ${missing.map(esc).join(", ")}</mark></p>` : ""}

<h2 style="margin-top:22px">Teslimat ve ödeme koşulları</h2>
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
if (missingShipping.length) console.log(`Eksik teslimat koşulları: ${missingShipping.join(", ")}`);
