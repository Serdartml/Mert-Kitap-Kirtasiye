// Okula dönüş listeleri (ana sayfa ve /okul-listeleri). Her liste, ihtiyaç satırlarından oluşur; her satır bir
// kategori (ana ya da alt) ve isteğe bağlı bir anahtar kelimeyle katalogdan stoktaki ürünleri bulur
// (catalog.ts, getSchoolListOptions) ve müşteri aralarından seçer. Ürün adı değil kategori tanımlandığı için
// katalog değiştiğinde (stok programından içe aktarma) listeler kendiliğinden güncel ürünleri gösterir.
// Satırları mağaza sahibi buradan düzenleyebilir. Sınıf bazlı malzeme listeleri örnektir; okulların
// resmî listeleri farklı olabilir.

export interface SchoolListRow {
  // Satır başlığı ("Çizgili defter").
  label: string;
  // Ürünlerin aranacağı kategori adresi (alt kategorileriyle birlikte).
  categorySlug: string;
  // Ürün adında geçmesi gereken kelime (boşsa kategorideki tüm ürünler).
  keyword?: string;
  // Önerilen adet.
  quantity: number;
}

export interface SchoolList {
  slug: string;
  title: string;
  subtitle: string;
  // Kısa rozet metni (ana sayfa kartında).
  badge: string;
  rows: SchoolListRow[];
}

export const schoolLists: SchoolList[] = [
  {
    slug: "ilkokul",
    title: "İlkokul",
    subtitle: "1-4. sınıf için temel malzemeler",
    badge: "1-4. sınıf",
    rows: [
      { label: "Defter", categorySlug: "defterler", quantity: 5 },
      { label: "Kalem", categorySlug: "kalemler", quantity: 3 },
      { label: "Boya", categorySlug: "boyalar", quantity: 1 },
      { label: "Kalem kutusu ve okul gereçleri", categorySlug: "okul-gerecleri", quantity: 1 },
      { label: "Resimli kitap", categorySlug: "cocuk-kitaplari", quantity: 1 },
    ],
  },
  {
    slug: "ortaokul",
    title: "Ortaokul",
    subtitle: "5-8. sınıf ve LGS hazırlık",
    badge: "5-8. sınıf",
    rows: [
      { label: "Defter", categorySlug: "defterler", quantity: 6 },
      { label: "Kalem", categorySlug: "kalemler", quantity: 3 },
      { label: "Kalem kutusu ve okul gereçleri", categorySlug: "okul-gerecleri", quantity: 1 },
      { label: "LGS deneme ve soru kitabı", categorySlug: "lgs", quantity: 1 },
      { label: "Boya ve resim malzemesi", categorySlug: "boyalar", quantity: 1 },
    ],
  },
  {
    slug: "lise",
    title: "Lise",
    subtitle: "9-12. sınıf ve TYT-AYT hazırlık",
    badge: "9-12. sınıf",
    rows: [
      { label: "Defter", categorySlug: "defterler", quantity: 6 },
      { label: "Kalem", categorySlug: "kalemler", quantity: 3 },
      { label: "Hesap makinesi", categorySlug: "hesap-makineleri", quantity: 1 },
      { label: "TYT-AYT soru bankası", categorySlug: "tyt-ayt", quantity: 1 },
      { label: "Okul gereçleri", categorySlug: "okul-gerecleri", quantity: 1 },
    ],
  },
  {
    slug: "universite",
    title: "Üniversite",
    subtitle: "Ders ve çalışma masası için",
    badge: "Yüksek öğrenim",
    rows: [
      { label: "Defter ve ajanda", categorySlug: "defterler", quantity: 4 },
      { label: "Kalem", categorySlug: "kalemler", quantity: 2 },
      { label: "Hesap makinesi", categorySlug: "hesap-makineleri", quantity: 1 },
      { label: "Ofis gereçleri", categorySlug: "ofis-gerecleri", quantity: 1 },
      { label: "Okuma lambası", categorySlug: "okuma-lambalari", quantity: 1 },
    ],
  },
];

export function getSchoolList(slug: string): SchoolList | undefined {
  return schoolLists.find((list) => list.slug === slug);
}
