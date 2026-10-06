// Mağazaya ait sabit bilgiler. Eski tanıtım sitesinden taşındı.
export const site = {
  name: "Mert Kitap Kırtasiye",
  shortName: "Mert Kitap",
  tagline: "Kitap, kırtasiye ve hediyelik",
  description:
    "Mert Kitap Kırtasiye'de sanattan eğitime, her adımınızda yaratıcılığınızı ve bilginizi besleyen en kaliteli ürünler sizi bekliyor.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  phone: "0232 374 25 00",
  phoneHref: "tel:+902323742500",
  email: "mertkitapkirtasiye@hotmail.com",
  address: {
    line: "Erzene Mah. Kazım Karabekir Cad. No:31/A",
    district: "Bornova",
    city: "İzmir",
    full: "Erzene Mah. Kazım Karabekir Cad. No:31/A, Bornova, İzmir",
  },
  mapsUrl:
    "https://www.google.com/maps/dir/?api=1&destination=Erzene+Mah.+Kazim+Karabekir+Cad.+No:31/A+Izmir",
  hours: [
    { days: "Pazartesi - Cumartesi", time: "09:00 - 21:00" },
    { days: "Pazar", time: "10:00 - 20:00" },
  ],
  about: {
    badge: "Hikayemiz",
    title: "20 yıldır eğitimde yol arkadaşınızız",
    body: "Mert Kitap Kırtasiye ile geleceği birlikte tasarlıyoruz. Kalite ve güveni esas alarak, yaratıcılığınızı besleyen her ürünü özenle seçiyoruz.",
    footer:
      "20 yıldır eğitimin, sanatın ve hobi dünyasının kalbindeyiz. Mert Kitap Kırtasiye ile yarınları birlikte kuruyoruz.",
    points: [
      "Güncel eğitim kaynakları ve akademik dünya",
      "Dünyaca ünlü kırtasiye markaları",
      "Yaratıcı hobi ve sanat malzemeleri",
    ],
  },
} as const;

// Yasal / bilgi sayfaları. Metinler henüz yazılmadı; içerik hukuki onayla eklenecek.
export const infoPages = [
  { slug: "kvkk", title: "KVKK Aydınlatma Metni" },
  { slug: "gizlilik", title: "Gizlilik Politikası" },
  { slug: "mesafeli-satis-sozlesmesi", title: "Mesafeli Satış Sözleşmesi" },
  { slug: "iade-ve-degisim", title: "İade ve Değişim" },
] as const;
