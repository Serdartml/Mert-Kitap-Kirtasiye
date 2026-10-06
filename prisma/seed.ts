// Geliştirme için ÖRNEK katalog verisi. Ürünler, fiyatlar ve stoklar gerçek değildir.
// Slug üzerinden upsert yapar. Listeden çıkarılmış ve içinde ürün kalmamış kategorileri siler.
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const categories = [
  {
    slug: "kirtasiye",
    name: "Kırtasiye",
    description: "Kalemler, defterler, okul ve ofis gereçleri",
    children: [
      { slug: "kalemler", name: "Kalemler" },
      { slug: "defterler", name: "Defterler" },
      { slug: "okul-gerecleri", name: "Okul Gereçleri" },
      { slug: "ofis-gerecleri", name: "Ofis Gereçleri" },
    ],
  },
  {
    slug: "sanatsal",
    name: "Sanatsal",
    description: "Boyalar, çizim malzemeleri ve hobi setleri",
    children: [
      { slug: "boyalar", name: "Boyalar" },
      { slug: "cizim-setleri", name: "Çizim Setleri" },
      { slug: "firca-ve-tuval", name: "Fırça & Tuval" },
      { slug: "hobi-setleri", name: "Hobi Setleri" },
    ],
  },
  {
    slug: "hazirlik-kitaplari",
    name: "Hazırlık Kitapları",
    description: "Sınavlara hazırlık ve okula yardımcı kaynaklar",
    children: [
      { slug: "lgs", name: "LGS" },
      { slug: "tyt-ayt", name: "TYT - AYT" },
      { slug: "kpss", name: "KPSS" },
      { slug: "okula-yardimci", name: "Okula Yardımcı" },
    ],
  },
  {
    slug: "kultur-kitaplari",
    name: "Kültür Kitapları",
    description: "Roman, klasikler, çocuk kitapları ve daha fazlası",
    children: [
      { slug: "roman-edebiyat", name: "Roman & Edebiyat" },
      { slug: "klasik-eserler", name: "Klasik Eserler" },
      { slug: "cocuk-kitaplari", name: "Çocuk Kitapları" },
      { slug: "kisisel-gelisim", name: "Kişisel Gelişim" },
    ],
  },
  {
    slug: "hediyelik",
    name: "Hediyelik",
    description: "Sevdiklerinize özel hediye alternatifleri",
    children: [
      { slug: "hediye-setleri", name: "Hediye Setleri" },
      { slug: "puzzle-oyun", name: "Puzzle & Oyun" },
      { slug: "kitap-aksesuarlari", name: "Kitap Aksesuarları" },
    ],
  },
  {
    slug: "elektronik",
    name: "Elektronik",
    description: "Hesap makineleri ve masa başı elektroniği",
    children: [
      { slug: "hesap-makineleri", name: "Hesap Makineleri" },
      { slug: "okuma-lambalari", name: "Okuma Lambaları" },
    ],
  },
];

interface SeedProduct {
  category: string;
  slug: string;
  name: string;
  price: number; // TL
  compareAt?: number;
  stock: number;
  featured?: boolean;
  description: string;
  attributes?: [string, string][];
}

// Sıra değişirse stok kodları (ORN-0001...) kayar; yeni ürünleri sona ekleyin.
const products: SeedProduct[] = [
  { category: "kalemler", slug: "klasik-dolma-kalem-siyah", name: "Klasik Dolma Kalem - Siyah", price: 449.9, compareAt: 549.9, stock: 14, featured: true, description: "Metal gövdeli, orta uçlu klasik dolma kalem. Kartuş ve pompa ile kullanılabilir.", attributes: [["Uç", "Orta (M)"], ["Gövde", "Metal"], ["Renk", "Siyah"]] },
  { category: "kalemler", slug: "ogrenci-dolma-kalemi-sari", name: "Öğrenci Dolma Kalemi - Sarı", price: 189.9, stock: 32, description: "Ergonomik tutuşlu, hafif gövdeli başlangıç seviyesi dolma kalem.", attributes: [["Uç", "İnce (F)"], ["Gövde", "Plastik"]] },
  { category: "kalemler", slug: "dolma-kalem-kartusu-6li", name: "Dolma Kalem Kartuşu 6'lı - Mavi", price: 49.9, stock: 120, description: "Standart boy mavi mürekkep kartuşu, 6 adet." },
  { category: "defterler", slug: "a5-sert-kapak-cizgili-defter", name: "A5 Sert Kapak Çizgili Defter", price: 159.9, compareAt: 199.9, stock: 45, featured: true, description: "Lastikli, ayraçlı, 96 yaprak çizgili defter.", attributes: [["Boyut", "A5"], ["Yaprak", "96"], ["Düzen", "Çizgili"]] },
  { category: "defterler", slug: "noktali-ajanda-defteri", name: "Noktalı Ajanda Defteri", price: 219.9, stock: 28, description: "Planlama ve bullet journal için noktalı sayfa düzeni.", attributes: [["Boyut", "A5"], ["Yaprak", "120"], ["Düzen", "Noktalı"]] },
  { category: "defterler", slug: "spiralli-kareli-defter-a4", name: "Spiralli Kareli Defter A4", price: 89.9, stock: 0, description: "Okul ve ofis kullanımı için 100 yaprak kareli defter.", attributes: [["Boyut", "A4"], ["Yaprak", "100"]] },
  { category: "cizim-setleri", slug: "karakalem-cizim-seti-12li", name: "Karakalem Çizim Seti 12'li", price: 279.9, stock: 19, featured: true, description: "Farklı sertliklerde 12 dereceli kalem, silgi ve kalemtıraş ile.", attributes: [["Parça", "12 kalem"], ["Sertlik", "6H - 8B"]] },
  { category: "boyalar", slug: "sulu-boya-seti-24-renk", name: "Sulu Boya Seti 24 Renk", price: 329.9, compareAt: 399.9, stock: 11, description: "Fırçası ve karıştırma paleti dahil 24 renk sulu boya.", attributes: [["Renk", "24"]] },
  { category: "boyalar", slug: "kuru-boya-kalemi-36li", name: "Kuru Boya Kalemi 36'lı", price: 249.9, stock: 37, description: "Yumuşak uçlu, canlı renkli 36'lı kuru boya seti." },
  { category: "ofis-gerecleri", slug: "masaustu-duzenleyici", name: "Masaüstü Düzenleyici", price: 199.9, stock: 22, description: "Kalemlik, not kağıdı bölmesi ve ataşlık içeren düzenleyici." },
  { category: "ofis-gerecleri", slug: "zimba-makinesi-24-6", name: "Zımba Makinesi 24/6", price: 129.9, stock: 40, description: "25 sayfa kapasiteli metal zımba makinesi.", attributes: [["Tel", "24/6"], ["Kapasite", "25 sayfa"]] },

  { category: "roman-edebiyat", slug: "ornek-roman-yeni-cikan", name: "Örnek Roman (Yeni Çıkan)", price: 189.0, compareAt: 235.0, stock: 26, featured: true, description: "Roman rafı için örnek kitap kaydı.", attributes: [["Sayfa", "320"], ["Kapak", "Karton"]] },
  { category: "roman-edebiyat", slug: "ornek-deneme-kitabi", name: "Örnek Deneme Kitabı", price: 145.0, stock: 18, description: "Edebiyat rafı için örnek kitap kaydı.", attributes: [["Sayfa", "208"]] },
  { category: "tyt-ayt", slug: "tyt-matematik-soru-bankasi", name: "TYT Matematik Soru Bankası", price: 265.0, stock: 54, featured: true, description: "Konu özetli, çözümlü örnek soru bankası kaydı.", attributes: [["Sınav", "TYT"], ["Ders", "Matematik"]] },
  { category: "lgs", slug: "lgs-deneme-seti-5li", name: "LGS Deneme Seti 5'li", price: 175.0, compareAt: 210.0, stock: 33, description: "5 denemelik örnek set kaydı.", attributes: [["Sınav", "LGS"], ["Deneme", "5"]] },
  { category: "cocuk-kitaplari", slug: "resimli-masal-kitabi", name: "Resimli Masal Kitabı", price: 95.0, stock: 41, description: "Okul öncesi için büyük puntolu, resimli masal kitabı.", attributes: [["Yaş", "3-6"]] },
  { category: "cocuk-kitaplari", slug: "boyama-kitabi-hayvanlar", name: "Boyama Kitabı - Hayvanlar", price: 59.9, stock: 60, description: "48 sayfalık boyama kitabı.", attributes: [["Yaş", "4+"], ["Sayfa", "48"]] },
  { category: "klasik-eserler", slug: "suc-ve-ceza", name: "Suç ve Ceza", price: 165.0, stock: 23, featured: true, description: "Dostoyevski'nin klasik romanı. Örnek kayıt; baskı ve yayınevi bilgisi girilmemiştir.", attributes: [["Yazar", "Fyodor Dostoyevski"]] },
  { category: "klasik-eserler", slug: "sefiller", name: "Sefiller", price: 245.0, compareAt: 289.0, stock: 9, description: "Victor Hugo'nun klasik romanı. Örnek kayıt; baskı ve yayınevi bilgisi girilmemiştir.", attributes: [["Yazar", "Victor Hugo"]] },

  { category: "hediye-setleri", slug: "kisiye-ozel-deri-ajanda", name: "Kişiye Özel Deri Ajanda", price: 549.0, stock: 8, featured: true, description: "İsim baskılı, deri kapaklı ajanda." },
  { category: "hediye-setleri", slug: "hediye-kutulu-kalem-seti", name: "Hediye Kutulu Kalem Seti", price: 389.0, compareAt: 459.0, stock: 15, description: "Tükenmez ve roller kalemden oluşan kutulu set." },
  { category: "boyalar", slug: "akrilik-boya-baslangic-seti", name: "Akrilik Boya Başlangıç Seti", price: 299.0, stock: 17, featured: true, description: "12 renk akrilik boya, 3 fırça ve tuval ile." },
  { category: "hobi-setleri", slug: "ahsap-maket-seti", name: "Ahşap Maket Seti", price: 349.0, stock: 6, description: "Yapıştırıcı gerektirmeyen geçmeli ahşap maket." },
  { category: "puzzle-oyun", slug: "1000-parca-puzzle", name: "1000 Parça Puzzle", price: 229.0, compareAt: 279.0, stock: 21, description: "68 x 48 cm, 1000 parça yapboz.", attributes: [["Parça", "1000"], ["Boyut", "68 x 48 cm"]] },
  { category: "kitap-aksesuarlari", slug: "metal-kitap-ayraci-seti", name: "Metal Kitap Ayracı Seti", price: 119.0, stock: 48, description: "4'lü metal kitap ayracı seti." },
  { category: "okul-gerecleri", slug: "kanvas-kalem-kutusu", name: "Kanvas Kalem Kutusu", price: 139.0, stock: 52, description: "Fermuarlı, iki bölmeli kanvas kalem kutusu." },
  { category: "okuma-lambalari", slug: "okuma-lambasi-kiskacli", name: "Kıskaçlı Okuma Lambası", price: 199.0, stock: 0, description: "Şarj edilebilir, üç kademeli kıskaçlı okuma lambası." },
  { category: "hesap-makineleri", slug: "bilimsel-hesap-makinesi", name: "Bilimsel Hesap Makinesi", price: 429.0, stock: 12, featured: true, description: "240 fonksiyonlu, iki satır ekranlı bilimsel hesap makinesi.", attributes: [["Fonksiyon", "240"], ["Ekran", "2 satır"]] },
  { category: "firca-ve-tuval", slug: "pres-tuval-30x40", name: "Pres Tuval 30 x 40 cm", price: 79.9, stock: 35, description: "Astarlanmış pamuklu pres tuval.", attributes: [["Boyut", "30 x 40 cm"]] },
];

async function main() {
  const categoryIds = new Map<string, string>();

  for (const [index, parent] of categories.entries()) {
    const parentData = { name: parent.name, description: parent.description, sortOrder: index, parentId: null };
    const saved = await db.category.upsert({
      where: { slug: parent.slug },
      create: { slug: parent.slug, ...parentData },
      update: parentData,
    });
    categoryIds.set(parent.slug, saved.id);

    for (const [childIndex, child] of parent.children.entries()) {
      const childData = { name: child.name, sortOrder: childIndex, parentId: saved.id };
      const savedChild = await db.category.upsert({
        where: { slug: child.slug },
        create: { slug: child.slug, ...childData },
        update: childData,
      });
      categoryIds.set(child.slug, savedChild.id);
    }
  }

  for (const [index, product] of products.entries()) {
    const categoryId = categoryIds.get(product.category);
    if (!categoryId) throw new Error(`Kategori bulunamadı: ${product.category}`);

    const data = {
      name: product.name,
      description: product.description,
      priceKurus: Math.round(product.price * 100),
      compareAtKurus: product.compareAt ? Math.round(product.compareAt * 100) : null,
      stock: product.stock,
      isFeatured: product.featured ?? false,
      categoryId,
    };

    const saved = await db.product.upsert({
      where: { slug: product.slug },
      create: { slug: product.slug, sku: `ORN-${String(index + 1).padStart(4, "0")}`, ...data },
      update: data,
    });

    await db.productAttribute.deleteMany({ where: { productId: saved.id } });
    if (product.attributes?.length) {
      await db.productAttribute.createMany({
        data: product.attributes.map(([name, value], sortOrder) => ({ productId: saved.id, name, value, sortOrder })),
      });
    }
  }

  // Listede artık olmayan kategorileri temizle; içinde ürün olanlara dokunma. Önce alt, sonra üst kategoriler.
  const stale = { slug: { notIn: [...categoryIds.keys()] }, products: { none: {} } };
  const removedChildren = await db.category.deleteMany({ where: { ...stale, parentId: { not: null } } });
  const removedParents = await db.category.deleteMany({ where: { ...stale, children: { none: {} } } });

  console.log(
    `${categoryIds.size} kategori, ${products.length} örnek ürün hazır; ${removedChildren.count + removedParents.count} eski kategori silindi.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
