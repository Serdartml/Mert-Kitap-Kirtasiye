import { site } from "@/lib/site";

// Yasal metinlerin TASLAĞIDIR. Bir avukat / hukuk danışmanı onaylayana kadar `legalReviewed` false kalır:
// sayfalarda "taslak" uyarısı görünür ve arama motorlarına kapalıdır (bilgi/[slug]/page.tsx).
// Onaydan sonra true yapın. Avukata gidecek çıktı: `npm run yasal:cikti` (scripts/yasal-cikti.ts).
// `legalReviewed = true` iken zorunlu ticari bilgilerden biri boşsa test kırılır (tests/legal-content.test.ts).
export const legalReviewed = false;

// Satıcının ticari bilgileri: dükkân sahibinden istenecek. Zorunlu olanlar boşken metinlerde
// "[DOLDURULACAK: ...]" görünür; isteğe bağlı olanlar (oda, KEP) boşsa satır hiç çıkmaz.
export const legalOwner = {
  title: "" as string, // ticari unvan, vergi levhasındaki gibi (şahıs işletmesi: "Ad Soyad - Mert Kitap Kırtasiye")
  ownerName: "" as string, // işletme sahibi / yetkili kişinin adı soyadı
  taxOffice: "" as string, // vergi dairesi
  taxNo: "" as string, // vergi kimlik numarası (şahıs işletmesinde T.C. kimlik no olabilir)
  mersis: "" as string, // MERSİS numarası (şirketse / ticaret siciline kayıtlıysa)
  tradeRegistry: "" as string, // ticaret sicil ya da esnaf ve sanatkâr sicil numarası
  chamber: "" as string, // bağlı olunan oda (örn. İzmir Ticaret Odası ya da ilgili esnaf odası); isteğe bağlı
  kep: "" as string, // KEP adresi, varsa; isteğe bağlı
};

// Ticari bilgi alanları ve avukat çıktısında / testte görünen adları.
export const legalOwnerFields: { key: keyof typeof legalOwner; label: string; required: boolean }[] = [
  { key: "title", label: "Ticari unvan", required: true },
  { key: "ownerName", label: "İşletme sahibi / yetkili adı soyadı", required: true },
  { key: "taxOffice", label: "Vergi dairesi", required: true },
  { key: "taxNo", label: "Vergi kimlik numarası", required: true },
  { key: "mersis", label: "MERSİS numarası (şirketse)", required: false },
  { key: "tradeRegistry", label: "Ticaret sicil / esnaf sicil numarası", required: false },
  { key: "chamber", label: "Bağlı olunan meslek odası", required: false },
  { key: "kep", label: "KEP adresi", required: false },
];

// Eksik zorunlu bilgiler. MERSİS ve sicil numarasından en az biri gerekir.
export function missingOwnerInfo(): string[] {
  const missing = legalOwnerFields.filter((f) => f.required && !legalOwner[f.key]).map((f) => f.label);
  if (!legalOwner.mersis && !legalOwner.tradeRegistry) missing.push("MERSİS veya ticaret/esnaf sicil numarası");
  return missing;
}

const fill = (value: string, label: string) => value || `[DOLDURULACAK: ${label}]`;

// Kişisel verilerin işlendiği altyapı sağlayıcıları. Yeni bir servis eklenince (ödeme, kargo, SMS) buraya da eklenmeli;
// KVKK ve gizlilik metinleri listeyi buradan alır.
export const dataProcessors = [
  { name: "Hetzner Online GmbH", country: "Almanya", purpose: "sitenin çalıştığı sunucu (barındırma)" },
  { name: "Neon", country: "veriler Almanya'daki (Frankfurt) veri merkezinde; şirket ABD merkezli", purpose: "veritabanı" },
  { name: "Cloudflare, Inc.", country: "ABD merkezli, küresel ağ", purpose: "alan adı (DNS), ağ güvenliği ve ürün görsellerinin depolanması" },
  { name: "Resend", country: "ABD", purpose: "sipariş, parola sıfırlama ve hesap doğrulama e-postalarının gönderimi" },
] as const;

export interface LegalSection {
  heading: string;
  paragraphs: string[];
}

export interface LegalDocument {
  intro?: string;
  sections: LegalSection[];
}

// Satıcı / veri sorumlusu kimlik satırları.
export function sellerLines(): string[] {
  const o = legalOwner;
  const lines = [
    `Unvan: ${fill(o.title, "ticari unvan")}`,
    `İşletme sahibi / yetkili: ${fill(o.ownerName, "ad soyad")}`,
    `Adres: ${site.address.full}`,
    `Telefon: ${site.phone}`,
    `E-posta: ${site.email}`,
    `Vergi dairesi / numarası: ${fill(o.taxOffice, "vergi dairesi")} / ${fill(o.taxNo, "vergi kimlik no")}`,
  ];
  if (o.mersis) lines.push(`MERSİS numarası: ${o.mersis}`);
  if (o.tradeRegistry) lines.push(`Sicil numarası: ${o.tradeRegistry}`);
  if (!o.mersis && !o.tradeRegistry) lines.push("MERSİS / sicil numarası: [DOLDURULACAK: MERSİS veya ticaret/esnaf sicil no]");
  if (o.chamber) lines.push(`Bağlı olduğu oda: ${o.chamber}`);
  if (o.kep) lines.push(`KEP adresi: ${o.kep}`);
  return lines;
}

const sellerName = () => legalOwner.title || site.name;
const hoursText = () => site.hours.map((h) => `${h.days} ${h.time}`).join(", ");

// Hazır olarak bildirilen siparişin teslim alınması için tanınan süre (gün). İşletme kararıdır; değişirse metinler
// kendiliğinden güncellenir.
export const PICKUP_WAIT_DAYS = 7;

export function getLegalDocument(slug: string): LegalDocument | null {
  switch (slug) {
    case "kvkk":
      return kvkk();
    case "gizlilik":
      return gizlilik();
    case "cerez-politikasi":
      return cerez();
    case "on-bilgilendirme-formu":
      return onBilgilendirme();
    case "mesafeli-satis-sozlesmesi":
      return mesafeliSatis();
    case "iade-ve-degisim":
      return iade();
    case "uyelik-sozlesmesi":
      return uyelik();
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------------------------------------------
// KVKK aydınlatma metni (6698 s. Kanun m. 10, Aydınlatma Yükümlülüğü Tebliği)

function kvkk(): LegalDocument {
  return {
    intro:
      "6698 sayılı Kişisel Verilerin Korunması Kanunu (“KVKK”) m. 10 ve Aydınlatma Yükümlülüğünün Yerine Getirilmesinde Uyulacak Usul ve Esaslar Hakkında Tebliğ uyarınca, internet sitemizi kullanmanız, üye olmanız, sipariş vermeniz veya bizimle iletişime geçmeniz sırasında işlenen kişisel verileriniz hakkında sizi bilgilendiririz.",
    sections: [
      { heading: "1. Veri sorumlusu", paragraphs: sellerLines() },
      {
        heading: "2. İşlenen kişisel veriler",
        paragraphs: [
          "Kimlik ve iletişim: ad soyad, e-posta adresi, telefon numarası.",
          "Müşteri işlem: sipariş numarası, sipariş edilen ürünler, adet ve tutarlar, sipariş tarihi ve durumu, sipariş notunuz, favori ürünleriniz, sepet içeriği, ürün yorumlarınız ve puanlarınız.",
          "Adres: adres defterine kendi isteğinizle kaydettiğiniz adresler.",
          "Üyelik ve işlem güvenliği: parolanızın geri döndürülemez özeti (parolanızın kendisi saklanmaz), oturum bilgisi, kayıt ve son giriş tarihi, e-posta doğrulama durumu, art arda yapılan denemeleri sınırlamak için IP adresinden türetilen ve geri çevrilemeyen kayıtlar.",
          "İletişim: iletişim formuyla gönderdiğiniz ad soyad, e-posta ve mesaj içeriği.",
          "Özel nitelikli kişisel veri (sağlık, din, biyometrik veri vb.) işlenmez; lütfen sipariş notu veya mesajlarda bu tür bilgi paylaşmayın.",
        ],
      },
      {
        heading: "3. Kişisel veri toplamanın yöntemi",
        paragraphs: [
          "Verileriniz, internet sitemizdeki üyelik, sipariş, adres, yorum ve iletişim formlarını doldurmanız ile siteyi kullanmanız sırasında otomatik yollarla (çerezler ve sunucu kayıtları) elektronik ortamda toplanır. Mağazada sipariş teslimi sırasında sözlü veya yazılı olarak da alınabilir.",
        ],
      },
      {
        heading: "4. İşleme amaçları ve hukuki sebepler",
        paragraphs: [
          "Siparişin alınması, hazırlanması, mağazadan teslimi, iade ve değişim işlemleri ile sipariş durumu hakkında bilgilendirme: sözleşmenin kurulması veya ifasıyla doğrudan ilgili olması (KVKK m. 5/2-c).",
          "Üyelik hesabının açılması ve yönetimi, favoriler, adres defteri ve ürün yorumları: sözleşmenin kurulması veya ifası (m. 5/2-c).",
          "Fatura düzenlenmesi, ticari defter ve belgelerin saklanması, yetkili kurumların taleplerinin karşılanması, mesafeli satış kayıtlarının tutulması: veri sorumlusunun hukuki yükümlülüğü (m. 5/2-ç).",
          "İletişim formundan gelen soru ve taleplerin yanıtlanması, olası uyuşmazlıklarda hakların korunması: bir hakkın tesisi, kullanılması veya korunması (m. 5/2-e) ve meşru menfaat (m. 5/2-f).",
          "Site ve hesap güvenliğinin sağlanması, kötüye kullanımın ve yetkisiz erişimin önlenmesi: meşru menfaat (m. 5/2-f).",
          "Kampanya ve tanıtım amaçlı ticari elektronik ileti gönderilmez. İleride gönderilmesi planlanırsa ayrıca açık rızanız ve ileti onayınız alınacaktır.",
        ],
      },
      {
        heading: "5. Kişisel verilerin aktarılması",
        paragraphs: [
          "Kişisel verileriniz satılmaz, kiralanmaz ve pazarlama amacıyla üçüncü kişilerle paylaşılmaz.",
          "Sitenin çalışması için hizmet aldığımız ve verileri yalnızca bizim talimatımızla, hizmeti sunmak amacıyla işleyen altyapı sağlayıcılarına (veri işleyen) aktarılır:",
          ...dataProcessors.map((p) => `${p.name} (${p.country}): ${p.purpose}.`),
          "Bu sağlayıcıların bir kısmı yurt dışında bulunduğundan veya yurt dışından erişim sağladığından, aktarım KVKK m. 9 kapsamında yurt dışına aktarım niteliğindedir ve m. 9'da öngörülen uygun güvencelerden biri (standart sözleşme) sağlanarak yapılır.",
          "Kanunen yetkili kamu kurum ve kuruluşları ile adli makamlara, talep halinde ve hukuki yükümlülüğün gerektirdiği ölçüde aktarılabilir. Muhasebe ve vergi işlemleri için mali müşavirimizle paylaşılabilir.",
        ],
      },
      {
        heading: "6. Saklama süreleri",
        paragraphs: [
          "Sipariş ve fatura kayıtları: ilgili mevzuatın öngördüğü süre boyunca (Vergi Usul Kanunu ve Türk Ticaret Kanunu uyarınca en az on yıl).",
          "Mesafeli sözleşme ve ön bilgilendirme kayıtları: Mesafeli Sözleşmeler Yönetmeliği uyarınca üç yıl.",
          "Üyelik bilgileri: üyelik devam ettiği sürece; üyeliğin sona ermesinden sonra sipariş kayıtları yukarıdaki sürelerle saklanır, diğer bilgiler silinir.",
          "Oturum, parola sıfırlama, e-posta doğrulama ve deneme sınırı kayıtları: geçerlilik süreleri dolunca (en geç birkaç gün içinde) otomatik olarak silinir.",
          "İletişim formu mesajları: talebinizin sonuçlandırılmasından itibaren en fazla iki yıl.",
          "Süresi dolan veriler silinir, yok edilir veya anonim hale getirilir.",
        ],
      },
      {
        heading: "7. Haklarınız (KVKK m. 11)",
        paragraphs: [
          "Kişisel verilerinizin işlenip işlenmediğini öğrenme, işlenmişse buna ilişkin bilgi talep etme, işlenme amacını ve bunların amacına uygun kullanılıp kullanılmadığını öğrenme, yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme, eksik veya yanlış işlenmişse düzeltilmesini isteme, KVKK m. 7'deki şartlar çerçevesinde silinmesini veya yok edilmesini isteme, düzeltme ve silme işlemlerinin verilerin aktarıldığı üçüncü kişilere bildirilmesini isteme, münhasıran otomatik sistemlerle analiz edilmesi suretiyle aleyhinize bir sonucun ortaya çıkmasına itiraz etme ve kanuna aykırı işlenmesi sebebiyle zarara uğramanız halinde zararın giderilmesini talep etme haklarına sahipsiniz.",
        ],
      },
      {
        heading: "8. Başvuru yöntemi",
        paragraphs: [
          `Başvurunuzu, Veri Sorumlusuna Başvuru Usul ve Esasları Hakkında Tebliğ uyarınca; ${site.address.full} adresine yazılı olarak, ${legalOwner.kep ? `${legalOwner.kep} KEP adresine, ` : ""}güvenli elektronik veya mobil imzalı olarak ya da sitemizde kayıtlı e-posta adresinizden ${site.email} adresine iletebilirsiniz. Başvuruda ad soyad, T.C. kimlik numarası (yabancılar için uyruk ve pasaport/kimlik numarası), tebligata esas adres, varsa e-posta ve telefon ile talep konusu yer almalıdır.`,
          "Başvurular niteliğine göre en kısa sürede ve en geç otuz gün içinde ücretsiz olarak sonuçlandırılır. İşlemin ayrıca bir maliyet gerektirmesi halinde Kişisel Verileri Koruma Kurulunca belirlenen tarifedeki ücret alınabilir.",
        ],
      },
    ],
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Gizlilik politikası

function gizlilik(): LegalDocument {
  return {
    intro: `${sellerName()} (“biz”) olarak ziyaretçilerimizin ve müşterilerimizin gizliliğine önem veriyoruz. Bu politika sitemizi kullanırken hangi bilgilerin neden toplandığını ve nasıl korunduğunu özetler. Hukuki ayrıntılar KVKK Aydınlatma Metni'nde, kullanılan çerezler Çerez Politikası'nda yer alır.`,
    sections: [
      {
        heading: "Topladığımız bilgiler",
        paragraphs: [
          "Yalnızca sizin verdiğiniz bilgileri (üyelik, sipariş, adres defteri, ürün yorumu, iletişim formu) ve sitenin güvenli çalışması için gereken teknik bilgileri topluyoruz. Üye olmadan da sipariş verebilirsiniz.",
          "Reklam, profil çıkarma veya davranış izleme amaçlı bilgi toplamıyoruz; üçüncü taraf analiz ya da reklam araçları kullanmıyoruz.",
        ],
      },
      {
        heading: "Bilgileri ne için kullanıyoruz",
        paragraphs: [
          "Siparişinizi hazırlamak ve teslim etmek, hazır olduğunda size haber vermek, hesabınızı yönetmek, sorularınızı yanıtlamak ve yasal yükümlülüklerimizi (fatura, kayıt saklama) yerine getirmek için.",
          "Size yalnızca işlemle ilgili e-postalar (sipariş onayı, sipariş durumu, parola sıfırlama, e-posta doğrulama) gönderiyoruz; kampanya e-postası veya SMS göndermiyoruz.",
        ],
      },
      {
        heading: "Ürün yorumları",
        paragraphs: [
          "Yazdığınız yorumlar onaylandıktan sonra ürün sayfasında adınız ve soyadınızın baş harfiyle (örneğin “Ayşe Y.”) yayımlanır. Yorumlarda kişisel bilgi paylaşmamanızı rica ederiz. Yorumunuzun kaldırılmasını istediğinizde bize yazabilirsiniz.",
        ],
      },
      {
        heading: "Güvenlik",
        paragraphs: [
          "Site yalnızca şifreli bağlantı (HTTPS) üzerinden çalışır. Parolalar düz metin olarak saklanmaz; yalnızca geri döndürülemez bir özet halinde tutulur. Art arda hatalı giriş denemeleri geçici olarak sınırlandırılır. Yönetim paneline yalnızca yetkili mağaza çalışanları erişebilir.",
          "Üyeliksiz verilen siparişin ayrıntıları yalnızca siparişi veren tarayıcıda görünür; sipariş numarasıyla yapılan takipte yalnızca sipariş durumu gösterilir.",
        ],
      },
      {
        heading: "Hizmet sağlayıcılar",
        paragraphs: [
          "Sitenin çalışması için aşağıdaki altyapı hizmetlerinden yararlanıyoruz. Bu sağlayıcılar verileri yalnızca hizmeti sunmak için işler:",
          ...dataProcessors.map((p) => `${p.name}: ${p.purpose}.`),
        ],
      },
      {
        heading: "Çocukların gizliliği",
        paragraphs: [
          "Sitemiz okul ve kırtasiye ürünleri sunsa da üyelik ve sipariş işlemleri yetişkinlere yöneliktir. 18 yaşından küçükler sipariş ve üyelik işlemlerini veli veya vasilerinin bilgisi ve onayıyla yapmalıdır.",
        ],
      },
      {
        heading: "Değişiklikler ve iletişim",
        paragraphs: [
          "Bu politikayı gerektiğinde güncelleyebiliriz; güncel metin her zaman bu sayfada yer alır.",
          `Verilerinizle ilgili her türlü soru, düzeltme veya silme talebi için ${site.email} adresinden veya ${site.phone} numarasından bize ulaşabilirsiniz.`,
        ],
      },
    ],
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Çerez politikası (KVKK Kurumu, Çerez Uygulamaları Hakkında Rehber)

function cerez(): LegalDocument {
  return {
    intro:
      "Çerezler, ziyaret ettiğiniz sitenin tarayıcınıza kaydettiği küçük metin dosyalarıdır. Sitemiz yalnızca hizmetin sunulması için zorunlu olan çerezleri ve tarayıcı belleği kayıtlarını kullanır.",
    sections: [
      {
        heading: "Kullandığımız çerezler",
        paragraphs: [
          "session (zorunlu, 7 gün): üye girişinizin açık kalmasını sağlar. Çıkış yapınca silinir.",
          "cart_id (zorunlu, 30 gün): sepetinizi hatırlar. Üye olmasanız da sepetinizin kaybolmamasını sağlar.",
          "guest_orders (zorunlu, 90 gün): üye olmadan verdiğiniz siparişlerin ayrıntılarını bu tarayıcıda görebilmenizi sağlar.",
          "yonetim-urun-filtre, yonetim-urun-sirala (zorunlu): yalnızca mağaza çalışanlarının kullandığı yönetim panelinde liste tercihlerini hatırlar.",
          "__cf_bm ve benzeri Cloudflare çerezleri (zorunlu, en fazla 30 dakika): site bir saldırı veya kötü amaçlı trafik altındayken ağ güvenliği sağlayıcımız Cloudflare tarafından gerçek ziyaretçiyi otomatik yazılımlardan ayırmak için kullanılabilir.",
        ],
      },
      {
        heading: "Tarayıcı belleği (localStorage)",
        paragraphs: [
          "theme: açık / koyu tema tercihiniz. Yalnızca temayı kendiniz değiştirirseniz kaydedilir.",
          "mk-karsilama: ana sayfadaki karşılama animasyonunun en son ne zaman gösterildiği; animasyonun her ziyarette tekrar oynamaması için.",
          "Bu kayıtlar cihazınızda kalır, sunucumuza gönderilmez.",
        ],
      },
      {
        heading: "Kullanmadığımız çerezler",
        paragraphs: [
          "Reklam, hedefleme, sosyal medya veya üçüncü taraf analiz (ör. ziyaret istatistiği) çerezi kullanmıyoruz. Bu tür bir çerez eklenirse önceden açık rızanız istenecek ve bu metin güncellenecektir.",
        ],
      },
      {
        heading: "Hukuki sebep ve çerezleri yönetme",
        paragraphs: [
          "Yukarıdaki çerezler sitenin ve talep ettiğiniz hizmetin (sepet, üyelik, sipariş) çalışması için zorunlu olduğundan, KVKK m. 5/2-c (sözleşmenin kurulması ve ifası) ve m. 5/2-f (meşru menfaat) kapsamında açık rıza alınmaksızın kullanılır.",
          "Çerezleri tarayıcınızın ayarlarından silebilir veya engelleyebilirsiniz. Bu durumda sepet, giriş ve üyeliksiz sipariş görüntüleme özellikleri çalışmayabilir.",
        ],
      },
    ],
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Ön bilgilendirme formu (Mesafeli Sözleşmeler Yönetmeliği m. 5-6)

function onBilgilendirme(): LegalDocument {
  return {
    intro:
      "6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği uyarınca, siparişinizi onaylamadan önce aşağıdaki konularda bilgilendirilmeniz gerekir. Siparişi onaylamanız, bu formu okuduğunuzu ve teyit ettiğinizi gösterir.",
    sections: [
      { heading: "1. Satıcı bilgileri", paragraphs: sellerLines() },
      {
        heading: "2. Ürünlerin temel nitelikleri ve fiyatı",
        paragraphs: [
          "Ürünlerin adı, temel nitelikleri, adedi, KDV dahil birim ve toplam satış fiyatı ürün sayfalarında ve siparişi tamamlama sayfasındaki sipariş özetinde gösterilir. Sipariş özeti, bu formun ayrılmaz parçasıdır ve sipariş onayı e-postasıyla size ayrıca gönderilir.",
          "Tüm fiyatlar Türk lirası cinsindendir ve KDV dahildir. Fiyatlar sipariş anında geçerli olan fiyatlardır.",
          "Mağazadan teslimde teslimat, kargo veya başka bir ek ücret alınmaz.",
        ],
      },
      {
        heading: "3. Ödeme",
        paragraphs: [
          "Siparişle birlikte internet üzerinden ödeme alınmaz. Ödeme, ürünleri mağazadan teslim alırken nakit veya banka/kredi kartı ile yapılır.",
          "“Siparişi Onayla” düğmesine basmanızla sipariş verilir ve siparişteki ürünler için ödeme yükümlülüğü altına girersiniz; ödemeyi teslim sırasında yaparsınız.",
        ],
      },
      {
        heading: "4. Teslimat",
        paragraphs: [
          `Siparişler ${site.address.full} adresindeki mağazamızdan, mağaza çalışma saatlerinde (${hoursText()}) teslim edilir. Şu an adrese gönderim (kargo) yapılmamaktadır.`,
          "Siparişiniz hazırlandığında size telefon veya e-posta ile haber verilir. Sipariş, her durumda sipariş tarihinden itibaren en geç otuz gün içinde teslime hazır hale getirilir.",
          `Hazır olduğu bildirilen sipariş ${PICKUP_WAIT_DAYS} gün içinde teslim alınmazsa, size haber verilerek iptal edilebilir. Ödeme alınmadığından iptal halinde herhangi bir bedel talep edilmez.`,
          "Stoktaki beklenmedik bir değişiklik nedeniyle siparişin tamamı veya bir kısmı karşılanamazsa, bu durum öğrenildiği anda size bildirilir ve ilgili ürünler siparişten çıkarılır.",
        ],
      },
      {
        heading: "5. Cayma hakkı",
        paragraphs: [
          "Ürünü teslim aldığınız günden itibaren on dört (14) gün içinde hiçbir gerekçe göstermeksizin ve cezai şart ödemeksizin sözleşmeden cayma hakkınız vardır. Birden fazla ürün içeren siparişte süre, son ürünü teslim aldığınız gün başlar. Ürünü teslim almadan önce de cayma hakkınızı kullanabilirsiniz.",
          `Cayma bildiriminizi süre dolmadan ${site.address.full} adresine yazılı olarak, ${site.email} adresine e-posta ile veya ürünü mağazamıza getirerek yapabilirsiniz. Bildirimde ad soyad, sipariş numarası, cayılan ürünler ve tarih yer almalıdır.`,
          "Cayma bildiriminden itibaren on (10) gün içinde ürünü mağazamıza getirmeniz gerekir. Ödediğiniz bedel, cayma bildiriminin bize ulaşmasından itibaren en geç on dört (14) gün içinde, ödemeyi yaptığınız yöntemle (kart ile ödemede aynı karta) iade edilir.",
          "Ürünün niteliğini, özelliklerini ve işleyişini anlamak için gereken incelemenin ötesindeki kullanımlardan kaynaklanan değer kaybından sorumlu olursunuz.",
        ],
      },
      {
        heading: "6. Cayma hakkı kullanılamayan ürünler",
        paragraphs: [
          "Mesafeli Sözleşmeler Yönetmeliği m. 15 uyarınca aşağıdaki ürünlerde cayma hakkı yoktur:",
          "Sizin istekleriniz veya kişisel ihtiyaçlarınız doğrultusunda hazırlanan ürünler (ör. isim baskılı, kişiye özel ürünler).",
          "Ambalajı, bandı, mührü veya paketi açılmış ses ve görüntü kayıtları, yazılım programları ve bilgisayar sarf malzemeleri.",
          "Teslimden sonra ambalaj, bant, mühür veya paketi açılmış olup sağlık ve hijyen açısından iadesi uygun olmayan ürünler.",
          "Gazete ve dergi gibi süreli yayınlar (abonelik sözleşmesi kapsamında sağlananlar dışında).",
          "Elektronik ortamda anında ifa edilen hizmetler ve tüketiciye anında teslim edilen gayrimaddi mallar.",
        ],
      },
      {
        heading: "7. Ayıplı ürün, şikâyet ve başvuru yolları",
        paragraphs: [
          "Teslim edilen ürünün ayıplı olması halinde 6502 sayılı Kanun m. 11 uyarınca sözleşmeden dönme, ayıp oranında bedel indirimi, ücretsiz onarım veya ayıpsız misli ile değiştirme haklarından birini kullanabilirsiniz.",
          `Şikâyet ve talepleriniz için ${site.phone} numarasından, ${site.email} adresinden veya mağazamızdan bize ulaşabilirsiniz.`,
          "Uyuşmazlıklarda, her yıl Ticaret Bakanlığınca ilan edilen parasal sınırlar dahilinde yerleşim yerinizin veya tüketici işleminin yapıldığı yerin Tüketici Hakem Heyetine, bu sınırları aşan uyuşmazlıklarda kanunda öngörülen arabuluculuk sürecinin ardından Tüketici Mahkemesine başvurabilirsiniz.",
        ],
      },
      {
        heading: "8. Sözleşmenin kurulması ve saklanması",
        paragraphs: [
          "Sipariş adımları: ürünleri sepete eklersiniz; sepette adetleri değiştirebilir veya ürünleri çıkarabilirsiniz; siparişi tamamlama sayfasında iletişim bilgilerinizi yazar, sipariş özetini kontrol eder, bu formu ve Mesafeli Satış Sözleşmesi'ni onaylayıp “Siparişi Onayla” düğmesine basarsınız. Onaydan önce “Sepete dön” bağlantısıyla her bilgiyi düzeltebilirsiniz.",
          "Sözleşme ve bu form Türkçe olarak kurulur. Sipariş kaydı satıcı tarafından saklanır; sipariş özeti, bu form ve sözleşme metni sipariş onayı e-postasıyla size gönderilir. Üye iseniz siparişlerinizi “Hesabım” sayfasından da görebilirsiniz.",
        ],
      },
    ],
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Mesafeli satış sözleşmesi (6502 s. Kanun m. 48, Mesafeli Sözleşmeler Yönetmeliği)

function mesafeliSatis(): LegalDocument {
  return {
    intro:
      "Bu sözleşme, 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği hükümlerine göre, internet sitemiz üzerinden sipariş veren alıcı ile aşağıda bilgileri yer alan satıcı arasında, alıcının siparişi onaylamasıyla elektronik ortamda kurulur.",
    sections: [
      { heading: "1. Satıcı", paragraphs: sellerLines() },
      {
        heading: "2. Alıcı",
        paragraphs: [
          "Sipariş formunda adı soyadı, telefon numarası ve e-posta adresi yer alan kişidir. Alıcı bu bilgilerin doğru ve güncel olduğunu kabul eder; bilgilerin yanlış olmasından doğan gecikmelerden satıcı sorumlu değildir.",
        ],
      },
      {
        heading: "3. Sözleşmenin konusu ve ürünler",
        paragraphs: [
          "Sözleşmenin konusu, alıcının sitede sipariş ettiği ürünlerin satışı ve teslimine ilişkin tarafların hak ve yükümlülükleridir.",
          "Ürünlerin cinsi, adedi, KDV dahil birim ve toplam fiyatı ile sipariş tarihi ve numarası, sipariş onayı e-postasındaki sipariş özetinde yer alır ve bu sözleşmenin ayrılmaz parçasıdır. Fiyatlar Türk lirası cinsindendir ve KDV dahildir; teslimat ücreti alınmaz.",
          "Alıcı, sipariş vermeden önce Ön Bilgilendirme Formu'nu okuduğunu ve elektronik ortamda teyit ettiğini kabul eder.",
        ],
      },
      {
        heading: "4. Ödeme",
        paragraphs: [
          "Ödeme, ürünlerin mağazadan teslimi sırasında nakit veya banka/kredi kartı ile yapılır. Siparişle birlikte internet üzerinden ödeme alınmaz.",
          "Ürünlerin faturası teslim sırasında düzenlenir ve alıcıya verilir.",
        ],
      },
      {
        heading: "5. Teslimat",
        paragraphs: [
          `Ürünler ${site.address.full} adresindeki mağazadan, çalışma saatlerinde (${hoursText()}) teslim edilir.`,
          "Satıcı, siparişi en geç otuz gün içinde teslime hazır hale getirir ve alıcıyı telefon veya e-posta ile bilgilendirir.",
          `Hazır olduğu bildirilen sipariş ${PICKUP_WAIT_DAYS} gün içinde teslim alınmazsa satıcı, alıcıyı bilgilendirerek siparişi iptal edebilir. Ödeme alınmadığından alıcıdan herhangi bir bedel talep edilmez.`,
          "Ürünün tamamının veya bir kısmının temin edilememesi halinde satıcı, bunu öğrendiği tarihten itibaren üç gün içinde alıcıyı bilgilendirir ve ilgili kalemi siparişten çıkarır. Ödeme alınmadığından iade söz konusu olmaz; ödeme yapılmışsa bedel en geç on dört gün içinde iade edilir.",
          "Teslim sırasında ürünleri kontrol etmeniz önerilir. Ürünü siparişi veren kişi dışında biri teslim alacaksa sipariş numarasını bildirmesi yeterlidir.",
        ],
      },
      {
        heading: "6. Cayma hakkı",
        paragraphs: [
          "Alıcı, ürünü teslim aldığı tarihten itibaren on dört gün içinde herhangi bir gerekçe göstermeksizin ve cezai şart ödemeksizin sözleşmeden cayma hakkına sahiptir. Birden fazla ürün içeren siparişte süre son ürünün teslimiyle başlar. Alıcı, teslimden önce de cayma hakkını kullanabilir.",
          `Cayma bildirimi süre içinde ${site.address.full} adresine yazılı olarak, ${site.email} adresine e-posta ile veya ürün mağazaya getirilerek yapılır.`,
          "Alıcı, cayma bildiriminden itibaren on gün içinde ürünü mağazaya getirir. Satıcı, cayma bildiriminin kendisine ulaşmasından itibaren en geç on dört gün içinde, ödeme yapılmışsa bedeli alıcının ödemede kullandığı yöntemle iade eder.",
          "Alıcı, ürünün niteliğini, özelliklerini ve işleyişini anlamak için gereken incelemenin ötesindeki kullanımlardan kaynaklanan değer kaybından sorumludur.",
          "Ön Bilgilendirme Formu'nda sayılan ürünlerde (kişiye özel hazırlanan ürünler, ambalajı açılmış ses/görüntü kayıtları, yazılım ve bilgisayar sarf malzemeleri, hijyen nedeniyle iadesi uygun olmayan açılmış ürünler, süreli yayınlar) Mesafeli Sözleşmeler Yönetmeliği m. 15 uyarınca cayma hakkı kullanılamaz.",
        ],
      },
      {
        heading: "7. Ayıplı ürün",
        paragraphs: [
          "Teslim edilen ürün ayıplı ise alıcı, 6502 sayılı Kanun m. 11 uyarınca sözleşmeden dönme, ayıp oranında bedel indirimi, ücretsiz onarım veya ayıpsız misli ile değiştirme haklarından birini kullanabilir. Satıcı, alıcının seçtiği talebi yerine getirir.",
        ],
      },
      {
        heading: "8. Kişisel veriler",
        paragraphs: [
          "Alıcının kişisel verileri, KVKK Aydınlatma Metni'nde açıklanan amaçlarla ve 6698 sayılı Kanun'a uygun olarak işlenir.",
        ],
      },
      {
        heading: "9. Uyuşmazlıkların çözümü",
        paragraphs: [
          "Bu sözleşmeden doğan uyuşmazlıklarda, her yıl Ticaret Bakanlığınca ilan edilen parasal sınırlar dahilinde alıcının yerleşim yerindeki veya tüketici işleminin yapıldığı yerdeki Tüketici Hakem Heyetleri, bu sınırları aşan uyuşmazlıklarda kanunda öngörülen arabuluculuk sürecinin ardından Tüketici Mahkemeleri yetkilidir.",
        ],
      },
      {
        heading: "10. Yürürlük",
        paragraphs: [
          "Sözleşme, alıcının sipariş sayfasında bu sözleşmeyi ve Ön Bilgilendirme Formu'nu onaylayıp “Siparişi Onayla” düğmesine basmasıyla kurulur. Sözleşme metni ve sipariş özeti sipariş onayı e-postasıyla alıcıya gönderilir ve satıcı tarafından en az üç yıl saklanır.",
        ],
      },
    ],
  };
}

// ---------------------------------------------------------------------------------------------------------------
// İade ve değişim (müşteriye sade anlatım; hukuki dayanak ön bilgilendirme ve sözleşmede)

function iade(): LegalDocument {
  return {
    intro: "Siparişinizden memnun kalmazsanız izleyeceğiniz adımlar aşağıdadır. Yasal haklarınızın tamamı Ön Bilgilendirme Formu ve Mesafeli Satış Sözleşmesi'nde yer alır.",
    sections: [
      {
        heading: "İade süresi",
        paragraphs: [
          "Ürünü teslim aldığınız günden itibaren 14 gün içinde, hiçbir gerekçe göstermeden iade edebilirsiniz (cayma hakkı). Ürünü yalnızca incelemek için açmanız iade hakkınızı ortadan kaldırmaz; ancak olağan incelemenin ötesindeki kullanımdan doğan değer kaybından sorumlu olursunuz.",
        ],
      },
      {
        heading: "Nasıl iade ederim?",
        paragraphs: [
          `Ürünü faturasıyla birlikte mağazamıza (${site.address.full}) getirmeniz yeterlidir; bu, cayma bildirimi yerine de geçer. Ürünü hemen getiremeyecekseniz 14 gün içinde ${site.email} adresine sipariş numaranızla yazın ve ürünü bildirimden itibaren 10 gün içinde getirin.`,
          "Ödeme mağazada yapıldığından iade tutarı, ödemeyi yaptığınız yöntemle (nakit ise nakit, kart ise aynı karta) en geç 14 gün içinde ödenir; mağazada genellikle hemen ödenir.",
        ],
      },
      {
        heading: "İade alınamayan ürünler",
        paragraphs: [
          "Kişiye özel hazırlanan ürünler, ambalajı açılmış ses/görüntü kayıtları, yazılımlar ve bilgisayar sarf malzemeleri, açıldıktan sonra hijyen nedeniyle iadesi uygun olmayan ürünler ile gazete ve dergi gibi süreli yayınlar yasal olarak cayma hakkı kapsamı dışındadır. Bu ürünlerde de ayıplı ürün haklarınız saklıdır.",
        ],
      },
      {
        heading: "Değişim",
        paragraphs: [
          "Ürünü aynı koşullarla başka bir ürünle değiştirebilirsiniz. Fiyat farkı varsa mağazada tahsil edilir veya iade edilir.",
        ],
      },
      {
        heading: "Hasarlı, eksik veya hatalı ürün",
        paragraphs: [
          "Hasarlı, eksik, yanlış veya ayıplı bir ürün teslim aldıysanız bize ulaşın. Seçiminize göre ürünü ücretsiz değiştirir, onarır, bedelinden indirim yapar veya bedelini iade ederiz. Bu haklar 14 günlük süreyle sınırlı değildir; kanunda öngörülen süreler (genel olarak iki yıl) içinde kullanılabilir.",
        ],
      },
    ],
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Üyelik sözleşmesi ve kullanım koşulları

function uyelik(): LegalDocument {
  return {
    intro: `Bu sözleşme, ${sellerName()} (“satıcı”) ile sitemize üye olan kişi (“üye”) arasında, üyelik formunun doldurulup onaylanmasıyla elektronik ortamda kurulur. Siteyi üye olmadan kullananlar için de “Kullanım kuralları” ve “Fikri haklar” bölümleri geçerlidir.`,
    sections: [
      { heading: "1. Taraflar", paragraphs: [...sellerLines(), "Üye: üyelik formunda bilgileri yer alan kişi."] },
      {
        heading: "2. Üyelik",
        paragraphs: [
          "Üyelik ücretsizdir ve sipariş vermek için zorunlu değildir. Üyelik; sipariş geçmişi, favoriler, adres defteri ve ürün yorumu yazma imkânı sağlar.",
          "Üye olmak için 18 yaşını doldurmuş olmak gerekir. 18 yaşından küçükler veli veya vasilerinin onayıyla üye olabilir; bu durumda işlemlerden veli veya vasi sorumludur.",
          "Üye, verdiği bilgilerin doğru ve güncel olduğunu kabul eder. Her kişi yalnızca bir üyelik açabilir.",
        ],
      },
      {
        heading: "3. Hesap güvenliği",
        paragraphs: [
          "Parolanın gizli tutulmasından üye sorumludur. Hesabın yetkisiz kullanıldığından şüphelenen üye parolasını değiştirmeli ve satıcıya haber vermelidir. Parola değiştirildiğinde diğer cihazlardaki oturumlar kapanır.",
        ],
      },
      {
        heading: "4. Kullanım kuralları",
        paragraphs: [
          "Site; hukuka, genel ahlaka ve üçüncü kişilerin haklarına aykırı biçimde, otomatik yazılımlarla toplu veri çekmek, sitenin işleyişini bozmak veya güvenliğini aşmaya çalışmak amacıyla kullanılamaz.",
          "Ürün yorumları ürünle ilgili gerçek deneyimi yansıtmalıdır. Hakaret, kişisel veri, reklam, yanıltıcı veya hukuka aykırı içerik barındıran yorumlar yayımlanmaz. Yorumlar satıcının onayından sonra, üyenin adı ve soyadının baş harfiyle yayımlanır; satıcı kurallara aykırı yorumları yayından kaldırabilir.",
          "Kurallara aykırı kullanım halinde satıcı, üyeyi bilgilendirerek üyeliği askıya alabilir veya sona erdirebilir.",
        ],
      },
      {
        heading: "5. Fiyat ve stok bilgileri",
        paragraphs: [
          "Satıcı, sitedeki ürün, fiyat ve stok bilgilerinin doğru olması için özen gösterir. Mağaza ile site arasındaki stok farkları nedeniyle bir ürünün karşılanamaması halinde alıcı derhal bilgilendirilir. Sipariş verildikten sonra siparişin fiyatı değiştirilmez.",
        ],
      },
      {
        heading: "6. Fikri haklar",
        paragraphs: [
          "Sitedeki tasarım, logo, metin ve yazılım satıcıya, ürün görselleri ve markalar ise ilgili hak sahiplerine aittir; izinsiz çoğaltılamaz ve ticari amaçla kullanılamaz.",
        ],
      },
      {
        heading: "7. Üyeliğin sona ermesi",
        paragraphs: [
          `Üye, dilediği zaman ${site.email} adresine kayıtlı e-posta adresinden yazarak üyeliğini sona erdirebilir. Üyelik sona erdiğinde hesap bilgileri silinir; geçmiş siparişlere ait kayıtlar yasal saklama süreleri boyunca saklanır.`,
        ],
      },
      {
        heading: "8. Değişiklikler",
        paragraphs: [
          "Satıcı bu sözleşmeyi güncelleyebilir. Güncel metin bu sayfada yayımlanır; esaslı değişiklikler üyeye e-posta ile bildirilir. Verilmiş siparişler, sipariş anında geçerli koşullara tabidir.",
        ],
      },
      {
        heading: "9. Uygulanacak hukuk ve uyuşmazlıklar",
        paragraphs: [
          "Bu sözleşmeye Türk hukuku uygulanır. Tüketici sıfatını taşıyan üyeler bakımından uyuşmazlıklarda Tüketici Hakem Heyetleri ve Tüketici Mahkemeleri, diğer uyuşmazlıklarda İzmir mahkemeleri ve icra daireleri yetkilidir.",
        ],
      },
    ],
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Düz metin çıktısı (sipariş onayı e-postasında sözleşme ve ön bilgilendirme bu şekilde gönderilir).

export function legalDocumentText(title: string, doc: LegalDocument): string {
  const parts = [title.toLocaleUpperCase("tr-TR")];
  if (doc.intro) parts.push(doc.intro);
  for (const section of doc.sections) {
    parts.push(`${section.heading}\n${section.paragraphs.join("\n")}`);
  }
  return parts.join("\n\n");
}
