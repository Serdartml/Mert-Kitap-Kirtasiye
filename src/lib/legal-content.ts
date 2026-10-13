import { site } from "@/lib/site";

// Yasal metinlerin TASLAĞIDIR. Bir avukat / hukuk danışmanı onaylayana kadar `legalReviewed` false kalır:
// sayfalarda "taslak" uyarısı görünür ve arama motorlarına kapalıdır (bilgi/[slug]/page.tsx).
// Onaydan sonra true yapın; `legalOwner` alanlarını da gerçek ticari bilgilerle doldurun.
export const legalReviewed = false;

// Satıcının ticari bilgileri. Boş bırakılanlar metinde görünmez. Vergi dairesi/numarası, ticaret sicil ve
// MERSİS numarası mesafeli satış sözleşmesinde yasal olarak yer almalıdır; dükkân sahibinden istenecek.
export const legalOwner = {
  title: "" as string, // ticari unvan (örn. "Mert Kitap Kırtasiye - Ad Soyad")
  taxOffice: "" as string,
  taxNo: "" as string,
  mersis: "" as string,
  tradeRegistry: "" as string,
};

export interface LegalSection {
  heading: string;
  paragraphs: string[];
}

export interface LegalDocument {
  intro?: string;
  sections: LegalSection[];
}

function sellerLines(): string[] {
  const lines = [
    `Unvan: ${legalOwner.title || site.name}`,
    `Adres: ${site.address.full}`,
    `Telefon: ${site.phone}`,
    `E-posta: ${site.email}`,
  ];
  if (legalOwner.taxOffice || legalOwner.taxNo) {
    lines.push(`Vergi dairesi / numarası: ${[legalOwner.taxOffice, legalOwner.taxNo].filter(Boolean).join(" / ")}`);
  }
  if (legalOwner.mersis) lines.push(`MERSİS numarası: ${legalOwner.mersis}`);
  if (legalOwner.tradeRegistry) lines.push(`Ticaret sicil numarası: ${legalOwner.tradeRegistry}`);
  return lines;
}

export function getLegalDocument(slug: string): LegalDocument | null {
  switch (slug) {
    case "kvkk":
      return kvkk();
    case "gizlilik":
      return gizlilik();
    case "mesafeli-satis-sozlesmesi":
      return mesafeliSatis();
    case "iade-ve-degisim":
      return iade();
    default:
      return null;
  }
}

function kvkk(): LegalDocument {
  return {
    intro:
      "6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) m. 10 ve Aydınlatma Yükümlülüğünün Yerine Getirilmesinde Uyulacak Usul ve Esaslar Hakkında Tebliğ uyarınca, kişisel verilerinizin işlenmesine ilişkin sizi bilgilendiririz.",
    sections: [
      {
        heading: "1. Veri sorumlusu",
        paragraphs: sellerLines(),
      },
      {
        heading: "2. İşlenen kişisel veriler",
        paragraphs: [
          "Üyelik: ad soyad, e-posta, telefon, parola (yalnızca geri döndürülemez özet olarak saklanır), kayıt ve son giriş tarihi.",
          "Sipariş: ad soyad, e-posta, telefon, sipariş notu, sipariş içeriği ve tutarı, sipariş durumu.",
          "Adres defteri (isteğe bağlı): kayıtlı adres bilgileri.",
          "İletişim formu: ad soyad, e-posta, mesaj içeriği.",
          "İşlem güvenliği: deneme sınırlaması için IP adresinden türetilen kayıtlar, oturum bilgisi.",
        ],
      },
      {
        heading: "3. İşleme amaçları ve hukuki sebepler",
        paragraphs: [
          "Siparişlerin alınması, hazırlanması ve mağazadan teslimi, üyelik hesabının yönetimi ve iletişim taleplerinin yanıtlanması; sözleşmenin kurulması ve ifası (KVKK m. 5/2-c) ile hukuki yükümlülüklerin yerine getirilmesi (m. 5/2-ç) sebeplerine dayanır.",
          "Site güvenliğinin sağlanması ve kötüye kullanımın önlenmesi meşru menfaatimiz kapsamındadır (m. 5/2-f).",
          "Pazarlama amaçlı ileti göndermek için ayrıca açık rızanız aranır; rıza vermemeniz hizmetten yararlanmanızı etkilemez.",
        ],
      },
      {
        heading: "4. Aktarım",
        paragraphs: [
          "Verileriniz satılmaz. Sitenin barındırılması ve veritabanı hizmeti, yurt dışında bulunabilen altyapı sağlayıcılarından (barındırma, veritabanı, e-posta gönderimi) alınmaktadır; aktarım yalnızca hizmetin sunulması amacıyla ve KVKK m. 9 koşullarına uygun olarak yapılır. Kanunen yetkili kamu kurumlarının talepleri halinde ilgili kurumlarla paylaşım yapılabilir.",
        ],
      },
      {
        heading: "5. Saklama süresi",
        paragraphs: [
          "Veriler işleme amacının gerektirdiği süre ve ilgili mevzuattaki saklama süreleri (ör. ticari defter ve belgeler için on yıl) boyunca saklanır; sonrasında silinir, yok edilir veya anonim hale getirilir.",
        ],
      },
      {
        heading: "6. Haklarınız",
        paragraphs: [
          "KVKK m. 11 uyarınca; verilerinizin işlenip işlenmediğini öğrenme, bilgi talep etme, amacına uygun kullanılıp kullanılmadığını öğrenme, aktarıldığı kişileri bilme, eksik veya yanlış işlenmişse düzeltilmesini, koşulları oluşmuşsa silinmesini veya yok edilmesini isteme, bu işlemlerin aktarıldığı üçüncü kişilere bildirilmesini isteme, otomatik analiz sonucu aleyhinize bir sonuca itiraz etme ve kanuna aykırı işleme nedeniyle zararın giderilmesini talep etme haklarına sahipsiniz.",
          `Başvurularınızı ${site.email} adresine veya yukarıdaki posta adresine yazılı olarak iletebilirsiniz. Başvurular en geç otuz gün içinde sonuçlandırılır.`,
        ],
      },
    ],
  };
}

function gizlilik(): LegalDocument {
  return {
    intro: `${site.name} (“biz”) olarak ziyaretçilerimizin ve müşterilerimizin gizliliğine önem veriyoruz. Bu politika, sitemizi kullanırken hangi bilgilerin neden toplandığını ve nasıl korunduğunu özetler. Ayrıntılı bilgi için KVKK Aydınlatma Metni’ne bakınız.`,
    sections: [
      {
        heading: "Topladığımız bilgiler",
        paragraphs: [
          "Yalnızca sizin verdiğiniz bilgileri (üyelik, sipariş, adres, iletişim formu) ve sitenin çalışması için gereken teknik bilgileri topluyoruz.",
        ],
      },
      {
        heading: "Parola ve hesap güvenliği",
        paragraphs: [
          "Parolalarınız düz metin olarak saklanmaz; yalnızca geri döndürülemez bir özet halinde tutulur. Art arda hatalı giriş denemeleri geçici olarak sınırlandırılır.",
        ],
      },
      {
        heading: "Çerezler",
        paragraphs: [
          "Sitemiz yalnızca zorunlu / işlevsel çerezler kullanır: sepetinizi hatırlamak, oturumunuzu açık tutmak ve üyeliksiz verdiğiniz siparişleri görüntüleyebilmeniz için. Reklam, izleme veya üçüncü taraf analiz çerezi kullanmıyoruz.",
          "Tema tercihiniz (açık / koyu) cihazınızın tarayıcı belleğinde saklanır. Çerezleri tarayıcı ayarlarından silebilir veya engelleyebilirsiniz; bu durumda sepet ve giriş özellikleri çalışmayabilir.",
        ],
      },
      {
        heading: "Üçüncü taraflar",
        paragraphs: [
          "Bilgileriniz pazarlama amacıyla üçüncü kişilere satılmaz veya kiralanmaz. Site altyapısı için kullanılan barındırma, veritabanı ve e-posta hizmet sağlayıcıları verileri yalnızca hizmeti sunmak için işler.",
        ],
      },
      {
        heading: "Haklarınız ve iletişim",
        paragraphs: [
          `Verilerinizin silinmesi, düzeltilmesi veya bilgi talebi için ${site.email} adresinden veya ${site.phone} numarasından bize ulaşabilirsiniz.`,
        ],
      },
    ],
  };
}

function mesafeliSatis(): LegalDocument {
  return {
    intro:
      "Bu sözleşme, 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği hükümlerine göre, sitemiz üzerinden sipariş veren alıcı ile satıcı arasında kurulur. Siparişi onaylayarak bu sözleşmeyi kabul etmiş olursunuz.",
    sections: [
      { heading: "1. Satıcı", paragraphs: sellerLines() },
      {
        heading: "2. Alıcı",
        paragraphs: [
          "Sipariş formunda ad soyad, telefon ve e-posta bilgilerini bildiren kişidir. Alıcının bildirdiği bilgilerin doğruluğundan alıcı sorumludur.",
        ],
      },
      {
        heading: "3. Sözleşmenin konusu",
        paragraphs: [
          "Alıcının sitede sipariş ettiği ürünlerin satışı ve teslimine ilişkin tarafların hak ve yükümlülükleridir. Ürünlerin cinsi, adedi, birim fiyatı ve toplam tutarı (KDV dahil) sipariş özetinde yer alır.",
        ],
      },
      {
        heading: "4. Teslimat ve ödeme",
        paragraphs: [
          `Siparişler ${site.address.full} adresindeki mağazamızdan teslim edilir. Ödeme, ürünün mağazadan teslimi sırasında yapılır; siparişle birlikte çevrimiçi ödeme alınmaz.`,
          "Ürünler, sipariş durumu “hazır” olarak bildirildikten sonra mağaza çalışma saatlerinde teslim alınabilir. Hazır olarak bildirilen siparişin makul bir süre içinde teslim alınmaması halinde satıcı siparişi iptal edebilir.",
          "Stok durumundaki beklenmedik değişiklikler nedeniyle ürünün tamamının veya bir kısmının temin edilememesi halinde satıcı alıcıyı bilgilendirir ve ilgili kalemi iptal eder; ödeme alınmadığından iade söz konusu olmaz.",
        ],
      },
      {
        heading: "5. Cayma hakkı",
        paragraphs: [
          "Alıcı, ürünü teslim aldığı tarihten itibaren on dört gün içinde herhangi bir gerekçe göstermeksizin ve cezai şart ödemeksizin sözleşmeden cayma hakkına sahiptir. Cayma bildirimi yazılı olarak veya e-posta ile yapılabilir; ürün kullanılmamış, ambalajı açılmamış ve yeniden satılabilir durumda mağazaya getirilmelidir.",
          "Mesafeli Sözleşmeler Yönetmeliği m. 15 uyarınca; alıcının isteği veya kişisel ihtiyaçları doğrultusunda hazırlanan ürünler, ambalajı açılmış ses/görüntü kayıtları ile yazılım ve bilgisayar sarf malzemeleri, hijyen nedeniyle iadesi uygun olmayan ürünler, çabuk bozulabilen ürünler ile gazete ve dergi gibi süreli yayınlar (abonelik hariç) cayma hakkı kapsamı dışındadır.",
        ],
      },
      {
        heading: "6. Ayıplı ürün",
        paragraphs: [
          "Teslim edilen ürün ayıplı ise alıcı, 6502 sayılı Kanun m. 11 kapsamındaki seçimlik haklarını (sözleşmeden dönme, bedel indirimi, ücretsiz onarım veya ayıpsız misli ile değiştirme) kullanabilir. Ürünü teslim alırken kontrol etmenizi öneririz.",
        ],
      },
      {
        heading: "7. Uyuşmazlıkların çözümü",
        paragraphs: [
          "Bu sözleşmeden doğan uyuşmazlıklarda, ilan edilen parasal sınırlar dahilinde alıcının yerleşim yerindeki veya işlem yerindeki Tüketici Hakem Heyetleri ile Tüketici Mahkemeleri yetkilidir.",
        ],
      },
      {
        heading: "8. Yürürlük",
        paragraphs: [
          "Alıcı, sipariş vermeden önce bu sözleşmeyi ve ön bilgilendirmeyi okuduğunu, elektronik ortamda onayladığını kabul eder. Sözleşme, sipariş onayı ile kurulmuş sayılır.",
        ],
      },
    ],
  };
}

function iade(): LegalDocument {
  return {
    intro: "Siparişinizden memnun kalmamanız halinde izleyeceğiniz adımlar aşağıdadır.",
    sections: [
      {
        heading: "İade süresi",
        paragraphs: [
          "Ürünü teslim aldığınız günden itibaren 14 gün içinde iade edebilirsiniz. Ürün kullanılmamış, ambalajı açılmamış ve yeniden satılabilir durumda olmalıdır; fatura veya sipariş numaranızı yanınızda getirin.",
        ],
      },
      {
        heading: "Nasıl iade ederim?",
        paragraphs: [
          `Ürünü mağazamıza (${site.address.full}) getirmeniz yeterlidir. Önceden ${site.phone} numarasından veya ${site.email} adresinden haber vermeniz işlemi hızlandırır.`,
          "Ödeme mağazada yapıldığından iade tutarı, ödemeyi yaptığınız yöntemle mağazada size ödenir.",
        ],
      },
      {
        heading: "İade alınamayan ürünler",
        paragraphs: [
          "Kişiye özel hazırlanan ürünler, ambalajı açılmış ses/görüntü kayıtları ve yazılımlar, hijyen gerektiren ürünler, çabuk bozulabilen ürünler ve süreli yayınlar yasal olarak iade kapsamı dışındadır. Ayıplı ürün haklarınız saklıdır.",
        ],
      },
      {
        heading: "Değişim",
        paragraphs: [
          "Aynı koşullarla ürünü başka bir ürünle değiştirebilirsiniz. Fiyat farkı varsa mağazada tahsil edilir veya iade edilir.",
        ],
      },
      {
        heading: "Hasarlı veya hatalı ürün",
        paragraphs: [
          "Hasarlı, eksik veya yanlış ürün teslim aldıysanız süre sınırı olmaksızın bize ulaşın; ürünü ücretsiz değiştirir veya bedelini iade ederiz.",
        ],
      },
    ],
  };
}
