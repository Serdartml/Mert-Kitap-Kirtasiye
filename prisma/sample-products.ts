// Geliştirme için ÜRETİLMİŞ örnek ürünler: her ana kategoriye eşit sayıda (18'er, toplam 108). Adlar, fiyatlar ve
// stoklar gerçek değildir; katalog doluyken sayfaları (kaydırma, filtre, sayfalama, vitrin) denemek içindir.
// Deterministiktir: aynı çalıştırma her seferinde aynı ürünleri üretir. Stok kodları ORN-G001 ile başlar (ana
// örnek ürünlerin ORN-0001... kodlarıyla karışmaz). Var olan bir ürünün fiyatına/stoğuna dokunulmaz.
import type { PrismaClient } from "@prisma/client";
import { slugify } from "../src/lib/slug";

interface Plan {
  category: string; // alt kategori adresi
  names: string[];
  // Fiyat aralığı (TL).
  price: [number, number];
}

// Ana kategori -> alt kategori planları. Toplamlar eşit: 18'er ürün.
const plans: { root: string; plans: Plan[] }[] = [
  {
    root: "kirtasiye",
    plans: [
      { category: "kalemler", price: [29, 189], names: ["Tükenmez Kalem 12'li Mavi", "Roller Kalem Siyah", "Kurşun Kalem 2B 12'li", "Fosforlu Kalem 6 Renk Set", "Jel Kalem 0.5 mm Kırmızı"] },
      { category: "defterler", price: [39, 229], names: ["Spiralli Defter A5 80 Yaprak", "Okul Defteri A4 Çizgili 60 Yaprak", "Cepte Not Defteri 3'lü", "Bloknot A6 100 Yaprak", "Sert Kapak Defter Kareli A5"] },
      { category: "okul-gerecleri", price: [19, 349], names: ["Silgi ve Kalemtıraş Seti", "Cetvel Seti 30 cm 4 Parça", "Stick Yapıştırıcı 3'lü", "Okul Makası Yuvarlak Uç"] },
      { category: "ofis-gerecleri", price: [25, 259], names: ["Ataç Kutusu 100'lü", "Delgeç 2 Delikli", "Bant Makinesi Masaüstü", "Yapışkanlı Not Kağıdı 5'li"] },
    ],
  },
  {
    root: "sanatsal",
    plans: [
      { category: "boyalar", price: [59, 389], names: ["Guaj Boya 12 Renk", "Pastel Boya 24 Renk", "Yağlı Boya Seti 12 Tüp", "Parmak Boyası 6 Renk", "Suluboya Kalemi 18 Renk"] },
      { category: "cizim-setleri", price: [79, 449], names: ["Teknik Çizim Seti 15 Parça", "Eskiz Defteri A4 120 gr", "Kömür Kalem Seti 12'li", "Mangal Kömür ve Silgi Seti"] },
      { category: "firca-ve-tuval", price: [49, 399], names: ["Yuvarlak Fırça Seti 6'lı", "Düz Uçlu Fırça Seti 5'li", "Pres Tuval 20 x 30 cm", "Pres Tuval 50 x 70 cm", "Ahşap Şövale Masa Üstü"] },
      { category: "hobi-setleri", price: [99, 499], names: ["Mandala Boyama Seti", "Seramik Boyama Başlangıç Seti", "Dikiş ve Nakış Seti", "Elmas Boyama Kiti 30 x 40"] },
    ],
  },
  {
    root: "hazirlik-kitaplari",
    plans: [
      { category: "lgs", price: [89, 289], names: ["LGS Matematik Soru Bankası", "LGS Fen Bilimleri Konu Özeti", "LGS Türkçe Deneme Seti 8'li", "LGS Sosyal Bilgiler Yaprak Test"] },
      { category: "tyt-ayt", price: [99, 349], names: ["TYT Türkçe Soru Bankası", "TYT Fizik Konu Anlatımı", "AYT Matematik Soru Bankası", "AYT Edebiyat Deneme Seti", "TYT-AYT Geometri Kampı"] },
      { category: "kpss", price: [109, 399], names: ["KPSS Genel Yetenek Soru Bankası", "KPSS Genel Kültür Konu Özeti", "KPSS Tarih Yaprak Test", "KPSS Deneme Seti 10'lu"] },
      { category: "okula-yardimci", price: [49, 189], names: ["İlkokul 3. Sınıf Matematik Etkinlik", "İlkokul 4. Sınıf Türkçe Çalışma Kitabı", "Ortaokul İngilizce Kelime Kartları", "Okuma Anlama Kitabı 2. Sınıf", "Hızlı Okuma Çalışma Kitabı"] },
    ],
  },
  {
    root: "kultur-kitaplari",
    plans: [
      { category: "roman-edebiyat", price: [89, 249], names: ["Örnek Roman: Gece Yolculuğu", "Örnek Roman: Sessiz Şehir", "Örnek Hikâye Seçkisi", "Örnek Roman: Deniz Fenerinin Sırrı", "Örnek Şiir Antolojisi"] },
      { category: "klasik-eserler", price: [99, 299], names: ["Karamazov Kardeşler", "Anna Karenina", "Madam Bovary", "Dönüşüm", "Denizler Altında Yirmi Bin Fersah"] },
      { category: "cocuk-kitaplari", price: [39, 159], names: ["Hikâyeli Boyama Kitabı", "Hayvanlar Alemi Resimli Ansiklopedi", "Uyku Öncesi Masalları", "Çocuklar İçin Dünya Atlası"] },
      { category: "kisisel-gelisim", price: [79, 229], names: ["Odaklanma Sanatı", "Alışkanlıkların Gücü Çalışma Defteri", "Zaman Yönetimi Rehberi", "Konuşma Becerileri El Kitabı"] },
    ],
  },
  {
    root: "hediyelik",
    plans: [
      { category: "hediye-setleri", price: [149, 799], names: ["Kırtasiye Hediye Kutusu", "Deri Kartlık ve Kalem Seti", "Mini Bitki Yetiştirme Seti", "Kişiye Özel Fotoğraf Albümü", "Mum ve Defter Hediye Seti", "Doğum Günü Sürpriz Kutusu"] },
      { category: "puzzle-oyun", price: [99, 549], names: ["500 Parça Puzzle Orman", "2000 Parça Puzzle Şehir", "Zeka Küpü 3x3", "Kutu Oyunu Strateji", "Hafıza Kartları Seti", "Ahşap Mantık Oyunu"] },
      { category: "kitap-aksesuarlari", price: [39, 299], names: ["Kitap Okuma Standı", "Kitap Kılıfı Kumaş", "Manyetik Kitap Ayracı 6'lı", "Kitap Işığı Klipsli", "Kitaplık Ayırıcı Seti", "Kitap Okuma Yastığı"] },
    ],
  },
  {
    root: "elektronik",
    plans: [
      { category: "hesap-makineleri", price: [129, 899], names: ["Masaüstü Hesap Makinesi 12 Haneli", "Cep Hesap Makinesi Mini", "Grafik Hesap Makinesi", "Yazıcılı Hesap Makinesi", "Finansal Hesap Makinesi", "Bilimsel Hesap Makinesi 417 Fonksiyon", "Solar Enerjili Hesap Makinesi", "Büyük Ekranlı Hesap Makinesi", "Öğrenci Hesap Makinesi 10 Haneli"] },
      { category: "okuma-lambalari", price: [119, 649], names: ["Masa Okuma Lambası LED", "Şarjlı Okuma Lambası", "Esnek Boyunlu Kitap Lambası", "Katlanabilir Çalışma Lambası", "Dokunmatik Kademeli Lamba", "Ayna Kenarlı Masa Lambası", "Saat Göstergeli Okuma Lambası", "USB Kıskaçlı Lamba", "Gece Işıklı Okuma Lambası"] },
    ],
  },
];

// Deterministik sözde rastgele (0..1): aynı sıra numarası hep aynı değeri verir.
function rand(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

export interface GeneratedProduct {
  root: string;
  category: string;
  slug: string;
  sku: string;
  name: string;
  priceKurus: number;
  compareAtKurus: number | null;
  stock: number;
  featured: boolean;
  description: string;
}

export function buildGeneratedProducts(): GeneratedProduct[] {
  const result: GeneratedProduct[] = [];
  let counter = 0;
  for (const group of plans) {
    group.plans.forEach((plan) => {
      plan.names.forEach((name) => {
        counter += 1;
        const [min, max] = plan.price;
        const raw = min + rand(counter) * (max - min);
        // .90 ile biten fiyat.
        const price = Math.max(9.9, Math.floor(raw / 10) * 10 + 9.9);
        const discounted = counter % 7 === 0;
        // Her 13. ürün tükenmiş, her 9. ürün azalmış stokta; ana kategori başına ilk ürünler ve her 6.'sı öne çıkan.
        const stock = counter % 13 === 0 ? 0 : counter % 9 === 0 ? 1 + (counter % 5) : 8 + Math.floor(rand(counter + 500) * 80);
        result.push({
          root: group.root,
          category: plan.category,
          slug: slugify(name),
          sku: `ORN-G${String(counter).padStart(3, "0")}`,
          name,
          priceKurus: Math.round(price * 100),
          compareAtKurus: discounted ? Math.round(price * 1.2 * 100) : null,
          stock,
          featured: counter % 6 === 0,
          description: `${name}. Örnek katalog kaydı; ürün bilgisi gerçek değildir.`,
        });
      });
    });
  }
  return result;
}

// Üretilmiş ürünleri yazar. Var olan ürünün yalnızca adı/açıklaması/kategorisi güncellenir; fiyat ve stok korunur.
export async function seedGeneratedProducts(db: PrismaClient): Promise<{ created: number; existing: number }> {
  const products = buildGeneratedProducts();
  const categories = await db.category.findMany({ select: { id: true, slug: true } });
  const ids = new Map(categories.map((category) => [category.slug, category.id]));
  let created = 0;
  let existing = 0;

  for (const product of products) {
    const categoryId = ids.get(product.category);
    if (!categoryId) throw new Error(`Kategori bulunamadı: ${product.category} (önce npm run db:seed çalıştırın)`);
    const found = await db.product.findUnique({ where: { slug: product.slug }, select: { id: true } });
    if (found) {
      existing += 1;
      continue;
    }
    await db.product.create({
      data: {
        slug: product.slug,
        sku: product.sku,
        name: product.name,
        description: product.description,
        priceKurus: product.priceKurus,
        compareAtKurus: product.compareAtKurus,
        stock: product.stock,
        isFeatured: product.featured,
        categoryId,
      },
    });
    created += 1;
  }
  return { created, existing };
}
