import { describe, expect, it } from "vitest";
import { buildBrandNames, editionOf, notForSaleReason, parseName, readTurnaRows, type TurnaItem } from "@/lib/turna-catalog";
import { classify } from "@/lib/turna-categories";

const item = (name: string, vat = 20, overrides: Partial<TurnaItem> = {}): TurnaItem => ({
  line: 1,
  barcode: "8690000000001",
  code: "ITM1",
  name,
  stock: 5,
  costKurus: 1000,
  priceKurus: 2000,
  vat,
  label: "",
  ...overrides,
});

const categoryOf = (name: string, vat = 20, publishers: string[] = []) => classify(item(name, vat), parseName(name), { publishers: new Set(publishers) }).category;

describe("readTurnaRows", () => {
  it("birim satış fiyatını I, alış fiyatını G sütunundan okur (H ve J satır toplamıdır)", () => {
    const row = [8691451020932, "ITM250002615", "Kıskaç 51Mm.Yaylı-Rubenis", "Ticari Mal", 2, "Adet", 1.6, "3,20₺", 16, "32,00₺", "Yerel", 20];
    const [parsed] = readTurnaRows([row]);
    expect(parsed).toMatchObject({ barcode: "8691451020932", code: "ITM250002615", stock: 2, costKurus: 160, priceKurus: 1600, vat: 20 });
  });
});

describe("notForSaleReason", () => {
  it("fotokopi/çıktı ve kasa kalemlerini ayıklar", () => {
    for (const name of ["Fotokopi Çekimi", "Kimlik Fotokopisi", "Bilgisayar Çıktısı-A4", "Renkli Fotoğraf Çıktısı A3", "Çıktı Siyah-Beyaz Çiftyön-A4", "Spiral Ciltleme", "Kargo Bedeli", "Fiyat Farkı", "Kırt.Malz. 0.50", "Poşet Mert Kitap Kırtasiye"]) {
      expect(notForSaleReason(item(name)), name).not.toBeNull();
    }
  });

  it("gerçek ürünleri ayıklamaz", () => {
    for (const name of ["Hediye Poşeti Metalize 17X25-San", "Çantamdan Fil Çıktı (Mert Arık-Timaş)", "Laminasyon Filmi A4 100Mic-Kraf", "Fotoğraf Kağıdı A4 240Gr. 20Li-Tanex"]) {
      expect(notForSaleReason(item(name)), name).toBeNull();
    }
  });

  it("adı olmayan ve fiyatı olmayan kayıtları ayıklar", () => {
    expect(notForSaleReason(item("."))).not.toBeNull();
    expect(notForSaleReason(item("Silgi", 20, { priceKurus: 0 }))).not.toBeNull();
  });
});

describe("parseName", () => {
  it("kırtasiyede son tire sonrasını marka alır, yıl ekini atar", () => {
    expect(parseName("Not Defteri A7 Mini Kalemli-Gökçe-2025")).toEqual({ title: "Not Defteri A7 Mini Kalemli", brand: "Gökçe" });
    expect(parseName("Defter A4 80Yp.Çizgili Dikişli Pastel-Mynote")).toEqual({ title: "Defter A4 80Yp.Çizgili Dikişli Pastel", brand: "Mynote" });
  });

  it("model kodunun ardını marka saymaz", () => {
    expect(parseName("Versatil Kalem 0.7 Sh-300 Grip Siyah Tombow").brand).toBeNull();
  });

  it("kitapta parantezdeki yazar adda kalır, yayınevi marka olur", () => {
    expect(parseName("Yıldız Gezgini (Jack London-İşbankası)")).toEqual({ title: "Yıldız Gezgini (Jack London)", brand: "İşbankası" });
    expect(parseName("Notre Dame İn Kamburu (Vıctor Hugo-İşbankası Tammetin)").brand).toBe("İşbankası");
  });

  it("hazırlık kitabında yayınevi sınıf/sınav sözcüğünden öncesidir, yılı korur", () => {
    expect(parseName("Hız 8.sınıf Türkçe Soru-2026")).toEqual({ title: "Hız 8.sınıf Türkçe Soru-2026", brand: "Hız" });
    expect(parseName("Sinan Kuzucu 8.sınıf Fen Bilimleri Soru-2026-27").brand).toBe("Sinan Kuzucu");
  });
});

describe("editionOf", () => {
  it("yalnızca adında 27 geçen (2026-27, 2027) baskıyı güncel sayar", () => {
    for (const name of ["Sınav 7.sınıf Tümdersler Konu Maarif-2026-27", "Yargı Ales Çözümlü Soru-2027", "Bilfen 8.Sınıf Soru 26-27", "Hız 5.Sınıf Matematik-2026-2027"]) {
      expect(editionOf(name), name).toBe("guncel");
    }
  });

  it("tek başına 2026 ve eski yılları eski baskı sayar", () => {
    for (const name of ["Hız 8.sınıf Türkçe Soru-2026", "Palme Tyt Fizik Soru-2025", "Bilfen 10.Sınıf Coğrafya Soru 2019", "Kafadengi Tyt Kimya Soru-Extra 2025"]) {
      expect(editionOf(name), name).toBe("eski");
    }
  });

  it("yıl yazmayanı tarihsiz sayar; sınıf ve deneme numaralarını yıl sanmaz", () => {
    for (const name of ["Bilfen 8.Sınıf Deneme-5", "Yds 5.Sınıf Marathon Vocabulary", "Full Matematik 8.Sınıf 1.Dönem Matematik Deneme 6Lı", "Ekip Teog-1 İnkılap Deneme 15"]) {
      expect(editionOf(name), name).toBe("tarihsiz");
    }
  });
});

describe("buildBrandNames", () => {
  it("yazım farklarını birleştirir ve büyük harfli yazımı seçer", () => {
    const names = buildBrandNames(["gıpta", "Gıpta", "gıpta", "GIPTA"]);
    expect(names.get("gipta")).toBe("Gıpta");
  });
});

describe("kategori", () => {
  it("kırtasiye ürünlerini türüne göre ayırır", () => {
    expect(categoryOf("Versatil Kalem 0.7 Deep Üçgen Baskılı Mavi-Serve")).toBe("Kırtasiye > Kalemler");
    expect(categoryOf("Defter A4 80Yp.Kareli Spr.Pp-Tigra", 10)).toBe("Kırtasiye > Defterler & Not Kâğıtları");
    expect(categoryOf("Okul Çantası Lol 1076-Timon", 10)).toBe("Çanta & Beslenme > Okul Çantaları");
    expect(categoryOf("Akrilik Boya 100Ml.No:38 Burnt Sienna-Pebeo")).toBe("Sanatsal > Boyalar");
    expect(categoryOf("Posca 5M.Kırmızı-Uniball")).toBe("Sanatsal > Markörler & Kaligrafi");
    expect(categoryOf("Lego 150 Parça No:8621-Loz")).toBe("Oyuncak > Lego & Yapı Oyuncakları");
  });

  it("KDV'si yanlış girilmiş ürünü ürün olarak bırakır", () => {
    expect(categoryOf("Su Saati Kalemlik Kuromi-gökçe-2026", 0)).not.toMatch(/Kitap/);
    expect(categoryOf("Makas Korumalı Stiç-doğubey-2026", 0)).toBe("Kırtasiye > Ofis Gereçleri");
  });

  it("sınav kitaplarını hazırlık kategorilerine koyar", () => {
    expect(categoryOf("Hız 8.sınıf Türkçe Soru-2026", 0)).toBe("Hazırlık Kitapları > LGS");
    expect(categoryOf("Palme Tyt Fizik Soru-2026", 0)).toBe("Hazırlık Kitapları > TYT - AYT");
    expect(categoryOf("Hız 5.sınıf Matematik Hibrit Soru-2026", 0)).toBe("Hazırlık Kitapları > Okula Yardımcı");
    expect(categoryOf("Yargı Kpss 2022 A Grubu Muhasebe Konu-2022", 0)).toBe("Hazırlık Kitapları > KPSS & Diğer Sınavlar");
    // "Yds" burada sınav değil yayınevi.
    expect(categoryOf("Yds 5.Sınıf Marathon Vocabulary", 0)).toBe("Hazırlık Kitapları > Okula Yardımcı");
  });

  it("kültür kitaplarını ayırır", () => {
    expect(categoryOf("Suç Ve Ceza (Dostoyevski-İşbankası)", 0)).toBe("Kültür Kitapları > Klasik Eserler");
    expect(categoryOf("Tokyo Revengers-2 (Gerekli Şeyler) Anime", 0)).toBe("Kültür Kitapları > Çizgi Roman & Manga");
    expect(categoryOf("Kuranı Kerim Tecvidli Orta Boy-Seda", 0)).toBe("Kültür Kitapları > Din & İnanç");
    expect(categoryOf("Aziz Bey Hadisesi (ayfer Tunç-can Yayın)", 0)).toBe("Kültür Kitapları > Roman & Edebiyat");
  });

  it("yayınevi markasıyla aynı olan oyuncak markası ürün kalır", () => {
    expect(categoryOf("Slime Dondurma-yasin", 0, ["yasin"])).toBe("Oyuncak > Peluş & Fidget");
    expect(categoryOf("Klavye Işıklı Anahtarlık Minecraft Tekli-çınar", 0, ["çınar"])).toBe("Hediyelik > Hediye & Biblo");
    expect(categoryOf("Vangogh Puf Defter A5-çınar", 0, ["çınar"])).toBe("Kırtasiye > Defterler & Not Kâğıtları");
  });

  it("hediyelik yalnızca biblo, anahtarlık gibi hediye eşyalarını içerir", () => {
    expect(categoryOf("Biblo Anime Kızlar-Doğubey")).toBe("Hediyelik > Hediye & Biblo");
    expect(categoryOf("Anahtarlık Einstein-Özbala")).toBe("Hediyelik > Hediye & Biblo");
    // "maşa" ve "müzik" katlanınca masa/muzik olur; hediyelik kelimeleriyle karışmamalı.
    expect(categoryOf("Maşa Raptiye No:3 75Mm-Mas Büro")).toBe("Kırtasiye > Ofis Gereçleri");
    expect(categoryOf("Müzik Defteri Küçük 40Yp.Mopak", 10)).toBe("Kırtasiye > Defterler & Not Kâğıtları");
    expect(categoryOf("Masa Tenisi Raketi-slazenger")).toBe("Oyuncak > Spor & Top");
    expect(categoryOf("Kitap Ayracı Tom Ve Jerry-Mabbels")).toBe("Kırtasiye > Defterler & Not Kâğıtları");
    expect(categoryOf("Hediye Çantası Sevimli Hayvanlar K2-keskincolor")).toBe("Kırtasiye > Zarf, Etiket & Sticker");
    expect(categoryOf("Hediye Poşeti Metalize 50X70")).toBe("Kırtasiye > Zarf, Etiket & Sticker");
    expect(categoryOf("Boya Kalemi Grip Turkuaz-Faber")).toBe("Sanatsal > Boyalar");
  });
});
