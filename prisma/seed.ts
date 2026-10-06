// Geliştirme için ÖRNEK katalog verisi. Ürünler, fiyatlar ve stoklar gerçek değildir.
// Slug üzerinden upsert yapar; tekrar çalıştırmak mevcut kayıtları silmez.
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const categories = [
  {
    slug: "kirtasiye",
    name: "Kırtasiye",
    description: "En kaliteli kalemler, defterler ve ofis gereçleri",
    children: [
      { slug: "dolma-kalemler", name: "Dolma Kalemler" },
      { slug: "ozel-defterler", name: "Özel Defterler" },
      { slug: "cizim-setleri", name: "Çizim Setleri" },
      { slug: "ofis-araclari", name: "Ofis Araçları" },
    ],
  },
  {
    slug: "kitap",
    name: "Kitap",
    description: "En güncel eserler ve akademik kaynaklar",
    children: [
      { slug: "yeni-cikanlar", name: "Yeni Çıkanlar" },
      { slug: "sinav-hazirlik", name: "Sınav Hazırlık" },
      { slug: "cocuk-kitaplari", name: "Çocuk Kitapları" },
      { slug: "klasik-eserler", name: "Klasik Eserler" },
    ],
  },
  {
    slug: "hediyelik",
    name: "Hediyelik & Hobi",
    description: "Sevdiklerinize özel seçkin hediye alternatifleri",
    children: [
      { slug: "ozel-tasarim", name: "Özel Tasarım" },
      { slug: "hobi-setleri", name: "Hobi Setleri" },
      { slug: "koleksiyonluk", name: "Koleksiyonluk" },
      { slug: "aksesuarlar", name: "Aksesuarlar" },
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

const products: SeedProduct[] = [
  { category: "dolma-kalemler", slug: "klasik-dolma-kalem-siyah", name: "Klasik Dolma Kalem - Siyah", price: 449.9, compareAt: 549.9, stock: 14, featured: true, description: "Metal gövdeli, orta uçlu klasik dolma kalem. Kartuş ve pompa ile kullanılabilir.", attributes: [["Uç", "Orta (M)"], ["Gövde", "Metal"], ["Renk", "Siyah"]] },
  { category: "dolma-kalemler", slug: "ogrenci-dolma-kalemi-sari", name: "Öğrenci Dolma Kalemi - Sarı", price: 189.9, stock: 32, description: "Ergonomik tutuşlu, hafif gövdeli başlangıç seviyesi dolma kalem.", attributes: [["Uç", "İnce (F)"], ["Gövde", "Plastik"]] },
  { category: "dolma-kalemler", slug: "dolma-kalem-kartusu-6li", name: "Dolma Kalem Kartuşu 6'lı - Mavi", price: 49.9, stock: 120, description: "Standart boy mavi mürekkep kartuşu, 6 adet." },
  { category: "ozel-defterler", slug: "a5-sert-kapak-cizgili-defter", name: "A5 Sert Kapak Çizgili Defter", price: 159.9, compareAt: 199.9, stock: 45, featured: true, description: "Lastikli, ayraçlı, 96 yaprak çizgili defter.", attributes: [["Boyut", "A5"], ["Yaprak", "96"], ["Düzen", "Çizgili"]] },
  { category: "ozel-defterler", slug: "noktali-ajanda-defteri", name: "Noktalı Ajanda Defteri", price: 219.9, stock: 28, description: "Planlama ve bullet journal için noktalı sayfa düzeni.", attributes: [["Boyut", "A5"], ["Yaprak", "120"], ["Düzen", "Noktalı"]] },
  { category: "ozel-defterler", slug: "spiralli-kareli-defter-a4", name: "Spiralli Kareli Defter A4", price: 89.9, stock: 0, description: "Okul ve ofis kullanımı için 100 yaprak kareli defter.", attributes: [["Boyut", "A4"], ["Yaprak", "100"]] },
  { category: "cizim-setleri", slug: "karakalem-cizim-seti-12li", name: "Karakalem Çizim Seti 12'li", price: 279.9, stock: 19, featured: true, description: "Farklı sertliklerde 12 dereceli kalem, silgi ve kalemtıraş ile.", attributes: [["Parça", "12 kalem"], ["Sertlik", "6H - 8B"]] },
  { category: "cizim-setleri", slug: "sulu-boya-seti-24-renk", name: "Sulu Boya Seti 24 Renk", price: 329.9, compareAt: 399.9, stock: 11, description: "Fırçası ve karıştırma paleti dahil 24 renk sulu boya.", attributes: [["Renk", "24"]] },
  { category: "cizim-setleri", slug: "kuru-boya-kalemi-36li", name: "Kuru Boya Kalemi 36'lı", price: 249.9, stock: 37, description: "Yumuşak uçlu, canlı renkli 36'lı kuru boya seti." },
  { category: "ofis-araclari", slug: "masaustu-duzenleyici", name: "Masaüstü Düzenleyici", price: 199.9, stock: 22, description: "Kalemlik, not kağıdı bölmesi ve ataşlık içeren düzenleyici." },
  { category: "ofis-araclari", slug: "zimba-makinesi-24-6", name: "Zımba Makinesi 24/6", price: 129.9, stock: 40, description: "25 sayfa kapasiteli metal zımba makinesi.", attributes: [["Tel", "24/6"], ["Kapasite", "25 sayfa"]] },

  { category: "yeni-cikanlar", slug: "ornek-roman-yeni-cikan", name: "Örnek Roman (Yeni Çıkan)", price: 189.0, compareAt: 235.0, stock: 26, featured: true, description: "Yeni çıkanlar rafı için örnek kitap kaydı.", attributes: [["Sayfa", "320"], ["Kapak", "Karton"]] },
  { category: "yeni-cikanlar", slug: "ornek-deneme-kitabi", name: "Örnek Deneme Kitabı", price: 145.0, stock: 18, description: "Yeni çıkanlar rafı için örnek kitap kaydı.", attributes: [["Sayfa", "208"]] },
  { category: "sinav-hazirlik", slug: "tyt-matematik-soru-bankasi", name: "TYT Matematik Soru Bankası", price: 265.0, stock: 54, featured: true, description: "Konu özetli, çözümlü örnek soru bankası kaydı.", attributes: [["Sınav", "TYT"], ["Ders", "Matematik"]] },
  { category: "sinav-hazirlik", slug: "lgs-deneme-seti-5li", name: "LGS Deneme Seti 5'li", price: 175.0, compareAt: 210.0, stock: 33, description: "5 denemelik örnek set kaydı.", attributes: [["Sınav", "LGS"], ["Deneme", "5"]] },
  { category: "cocuk-kitaplari", slug: "resimli-masal-kitabi", name: "Resimli Masal Kitabı", price: 95.0, stock: 41, description: "Okul öncesi için büyük puntolu, resimli masal kitabı.", attributes: [["Yaş", "3-6"]] },
  { category: "cocuk-kitaplari", slug: "boyama-kitabi-hayvanlar", name: "Boyama Kitabı - Hayvanlar", price: 59.9, stock: 60, description: "48 sayfalık boyama kitabı.", attributes: [["Yaş", "4+"], ["Sayfa", "48"]] },
  { category: "klasik-eserler", slug: "suc-ve-ceza", name: "Suç ve Ceza", price: 165.0, stock: 23, featured: true, description: "Dostoyevski'nin klasik romanı. Örnek kayıt; baskı ve yayınevi bilgisi girilmemiştir.", attributes: [["Yazar", "Fyodor Dostoyevski"]] },
  { category: "klasik-eserler", slug: "sefiller", name: "Sefiller", price: 245.0, compareAt: 289.0, stock: 9, description: "Victor Hugo'nun klasik romanı. Örnek kayıt; baskı ve yayınevi bilgisi girilmemiştir.", attributes: [["Yazar", "Victor Hugo"]] },

  { category: "ozel-tasarim", slug: "kisiye-ozel-deri-ajanda", name: "Kişiye Özel Deri Ajanda", price: 549.0, stock: 8, featured: true, description: "İsim baskılı, deri kapaklı ajanda." },
  { category: "ozel-tasarim", slug: "hediye-kutulu-kalem-seti", name: "Hediye Kutulu Kalem Seti", price: 389.0, compareAt: 459.0, stock: 15, description: "Tükenmez ve roller kalemden oluşan kutulu set." },
  { category: "hobi-setleri", slug: "akrilik-boya-baslangic-seti", name: "Akrilik Boya Başlangıç Seti", price: 299.0, stock: 17, featured: true, description: "12 renk akrilik boya, 3 fırça ve tuval ile." },
  { category: "hobi-setleri", slug: "ahsap-maket-seti", name: "Ahşap Maket Seti", price: 349.0, stock: 6, description: "Yapıştırıcı gerektirmeyen geçmeli ahşap maket." },
  { category: "koleksiyonluk", slug: "1000-parca-puzzle", name: "1000 Parça Puzzle", price: 229.0, compareAt: 279.0, stock: 21, description: "68 x 48 cm, 1000 parça yapboz.", attributes: [["Parça", "1000"], ["Boyut", "68 x 48 cm"]] },
  { category: "koleksiyonluk", slug: "metal-kitap-ayraci-seti", name: "Metal Kitap Ayracı Seti", price: 119.0, stock: 48, description: "4'lü metal kitap ayracı seti." },
  { category: "aksesuarlar", slug: "kanvas-kalem-kutusu", name: "Kanvas Kalem Kutusu", price: 139.0, stock: 52, description: "Fermuarlı, iki bölmeli kanvas kalem kutusu." },
  { category: "aksesuarlar", slug: "okuma-lambasi-kiskacli", name: "Kıskaçlı Okuma Lambası", price: 199.0, stock: 0, description: "Şarj edilebilir, üç kademeli kıskaçlı okuma lambası." },
];

async function main() {
  const categoryIds = new Map<string, string>();

  for (const [index, parent] of categories.entries()) {
    const parentData = { name: parent.name, description: parent.description, sortOrder: index };
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

  console.log(`${categoryIds.size} kategori, ${products.length} örnek ürün hazır.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
