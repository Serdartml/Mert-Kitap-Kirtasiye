import { foldTr } from "./search-fold";

// Ürün adından ve kategorisinden kısa açıklama üretir. Saf mantık: haftalık aktarımda yeni ürünlere ve
// scripts/aciklama-yaz.ts ile mevcut ürünlere uygulanır. Yalnızca adda yazan bilgiler özellik olarak listelenir;
// malzeme, yaş, garanti gibi adda olmayan iddialar yazılmaz. Marka eklenmez: toptancı adları müşteriye görünmemeli.

export interface DescriptionInput {
  name: string;
  // Ana kategori ve (varsa) alt kategori adı.
  root: string;
  sub: string | null;
}

const USAGE: Record<string, [string, string]> = {
  Kalemler: ["günlük yazı, not alma ve ders çalışma için kullanabileceğiniz bir kalem seçeneğidir.", "okulda, işte ve evde yazı ihtiyacınız için kalem kutunuzda bulundurabileceğiniz bir üründür."],
  "Defterler & Not Kâğıtları": ["derslerinizi, notlarınızı ve günlük yazılarınızı düzenli tutmanıza yardımcı olur.", "okul, iş ya da kişisel notlarınız için pratik bir yazı alanı sunar."],
  "Kalemlik & Kutular": ["kalemlerinizi ve küçük gereçlerinizi bir arada, düzenli tutmanıza yardımcı olur.", "çanta ya da masa düzeniniz için kullanışlı bir saklama seçeneğidir."],
  "Zarf, Etiket & Sticker": ["evrak, paket ve kişisel eşyalarınızı düzenlerken ya da süslerken kullanabilirsiniz.", "işaretleme, gönderim ve süsleme işleriniz için pratik bir kırtasiye ürünüdür."],
  "Okul Gereçleri": ["ders ve okul etkinliklerinde ihtiyaç duyabileceğiniz yardımcı bir gereçtir.", "öğrencilerin okul çantasında bulundurabileceği kullanışlı bir üründür."],
  "Ofis Gereçleri": ["ofis ve masa başı işlerinizi kolaylaştıran yardımcı bir üründür.", "evrak ve günlük büro işlerinizde kullanabileceğiniz pratik bir gereçtir."],
  "Silgi & Kalemtıraş": ["yazı ve çizim çalışmalarınızda yanınızda bulundurabileceğiniz temel bir kırtasiye ürünüdür.", "ders ve çizim sırasında kalem düzeninizi korumanıza yardımcı olur."],
  "Ajanda & Planlayıcı": ["günlük planlarınızı, randevularınızı ve notlarınızı tek yerde takip etmenize yardımcı olur.", "zamanınızı düzenlemek ve yapılacaklarınızı kaydetmek için kullanabilirsiniz."],
  "Dosya & Klasör": ["evrak ve belgelerinizi düzenli biçimde saklamanıza yardımcı olur.", "okul ve ofis kâğıtlarınızı sınıflandırmak için kullanışlı bir üründür."],
  "Yapıştırıcı & Bant": ["okul ödevleri, el işi ve günlük onarımlarda kullanabileceğiniz bir üründür.", "kâğıt ve hobi çalışmalarınızda yardımcı bir kırtasiye gerecidir."],
  "Kâğıt & Karton": ["baskı, ödev, proje ve el işi çalışmalarınız için kullanabilirsiniz.", "okul ve hobi projelerinizde ihtiyaç duyabileceğiniz bir kâğıt ürünüdür."],
  "Diğer Ürünler": ["kırtasiye ve günlük kullanım ihtiyaçlarınız için tercih edebileceğiniz bir üründür.", "okul, ev ya da ofiste işinize yarayabilecek pratik bir üründür."],
  "Matara & Suluk": ["okul, spor ve gün içi kullanımda içeceğinizi yanınızda taşımanıza yardımcı olur.", "dışarıdayken su ihtiyacınız için pratik bir taşıma seçeneğidir."],
  "Beslenme Çantaları": ["okul ya da iş için yiyeceklerinizi yanınızda taşımanıza yardımcı olur.", "beslenme düzeninizi dışarıda da sürdürmek için kullanışlı bir seçenektir."],
  "Okul Çantaları": ["okul eşyalarını taşımak için kullanabileceğiniz bir çanta seçeneğidir.", "kitap, defter ve günlük eşyalarınız için pratik bir taşıma çözümüdür."],
  "Diğer Çantalar": ["günlük eşyalarınızı düzenli biçimde taşımanıza yardımcı olur.", "okul, gezi ve günlük kullanım için tercih edebileceğiniz bir çantadır."],
  "Hediye & Biblo": ["sevdiklerinize hediye etmek ya da yaşam alanınızı süslemek için güzel bir seçenektir.", "özel günlerde armağan edebileceğiniz, dekoratif bir üründür."],
  Aksesuarlar: ["günlük teknoloji kullanımınızda ihtiyaç duyabileceğiniz yardımcı bir aksesuardır.", "cihazlarınızla birlikte kullanabileceğiniz pratik bir üründür."],
  "Hesap Makineleri": ["okul, ofis ve günlük hesaplarınızı kolaylaştırır.", "ders ve iş hesaplamalarınızda kullanabileceğiniz pratik bir üründür."],
  "Hobi & El İşi": ["el işi ve yaratıcı hobi çalışmalarınızda kullanabileceğiniz bir üründür.", "evde ya da okulda keyifli sanat etkinlikleri için tercih edebilirsiniz."],
  "Markörler & Kaligrafi": ["yazı, boyama, işaretleme ve kaligrafi çalışmalarınıza renk katar.", "sanatsal projelerinizde ve notlarınızda kullanabileceğiniz bir üründür."],
  Boyalar: ["resim, boyama ve sanat etkinliklerinizde kullanabileceğiniz bir üründür.", "okul ödevleri ve yaratıcı çalışmalarınız için tercih edebilirsiniz."],
  "Fırça & Tuval": ["resim ve boyama çalışmalarınız için kullanabileceğiniz bir sanat malzemesidir.", "atölye, okul ya da evdeki sanat projelerinize eşlik eder."],
  "Çizim & Eskiz": ["çizim, eskiz ve tasarım çalışmalarınızda kullanabileceğiniz bir üründür.", "fikirlerinizi kâğıda aktarırken yardımcı olacak bir sanat gerecidir."],
  "Puzzle & Zeka Oyunları": ["dikkat ve problem çözme becerilerini eğlenerek çalıştırmak için keyifli bir seçenektir.", "aileyle ya da arkadaşlarla vakit geçirirken oynayabileceğiniz bir üründür."],
  "Lego & Yapı Oyuncakları": ["parçaları birleştirerek hayal gücüyle yeni şeyler kurmayı sevenler için keyifli bir oyuncaktır.", "kurma ve tasarlama oyunlarıyla eğlenceli vakit geçirmenizi sağlar."],
  "Araçlar & Figürler": ["hayali oyunlar kurmayı sevenler için eğlenceli bir oyuncaktır.", "oyun zamanlarına renk katan, hediye olarak da tercih edilebilecek bir üründür."],
  "Peluş & Fidget": ["oyun ve eğlence anlarına eşlik eden sevimli bir üründür.", "hediye etmek ya da keyifli vakit geçirmek için tercih edebilirsiniz."],
  "Spor & Top": ["açık havada ve hareketli oyunlarda keyifle kullanabileceğiniz bir üründür.", "spor ve oyun zamanlarına eşlik eden eğlenceli bir seçenektir."],
  "Parti & Yılbaşı": ["kutlamalarınızı ve özel günlerinizi süslemek için kullanabilirsiniz.", "parti ve yılbaşı hazırlıklarınıza renk katan bir üründür."],
};

const ROOT_USAGE: Record<string, [string, string]> = {
  Kırtasiye: USAGE["Diğer Ürünler"],
  Oyuncak: ["oyun zamanlarına eğlence katan bir üründür.", "hediye etmek ya da keyifli vakit geçirmek için tercih edebilirsiniz."],
  Sanatsal: USAGE["Hobi & El İşi"],
  Elektronik: USAGE.Aksesuarlar,
  Hediyelik: USAGE["Hediye & Biblo"],
  "Çanta & Beslenme": USAGE["Diğer Çantalar"],
};
const FALLBACK: [string, string] = ["günlük ihtiyaçlarınız için tercih edebileceğiniz bir üründür.", "ev, okul ya da işte kullanabileceğiniz pratik bir seçenektir."];

const COLORS: [string, string][] = [
  ["siyah", "Siyah"], ["beyaz", "Beyaz"], ["kirmizi", "Kırmızı"], ["lacivert", "Lacivert"], ["mavi", "Mavi"], ["yesil", "Yeşil"],
  ["sari", "Sarı"], ["turuncu", "Turuncu"], ["mor", "Mor"], ["pembe", "Pembe"], ["gri", "Gri"], ["kahverengi", "Kahverengi"],
  ["bordo", "Bordo"], ["turkuaz", "Turkuaz"], ["pudra", "Pudra"], ["krem", "Krem"], ["lila", "Lila"], ["fusya", "Fuşya"],
  ["somon", "Somon"], ["haki", "Haki"], ["bej", "Bej"],
];

const SUBJECTS: [RegExp, string][] = [
  [/\bmatematik\b|\bmat\b/, "Matematik"], [/\bturkce\b/, "Türkçe"], [/\bfen\b/, "Fen Bilimleri"], [/\bsosyal\b/, "Sosyal Bilgiler"],
  [/\bingilizce\b/, "İngilizce"], [/\binkilap\b/, "İnkılap Tarihi"], [/\bdin\b/, "Din Kültürü"], [/\btarih\b/, "Tarih"],
  [/\bcografya\b/, "Coğrafya"], [/\bfizik\b/, "Fizik"], [/\bkimya\b/, "Kimya"], [/\bbiyoloji\b/, "Biyoloji"], [/\bedebiyat\b/, "Edebiyat"],
];

const number = (value: string) => value.replace(",", ".");
const hashOf = (text: string) => [...text].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 7);

function productFeatures(name: string, input: DescriptionInput): string[] {
  const folded = foldTr(name);
  const features: string[] = [];
  const paper = name.match(/(?<![\p{L}\d])A([3-6])(?![\p{L}\d])/iu);
  if (paper) features.push(`Boyut: A${paper[1]}`);
  const size = name.match(/(?<![\d.,])(\d{1,3}(?:[.,]\d)?)\s*[xX×*]\s*(\d{1,3}(?:[.,]\d)?)(?:\s*[xX×*]\s*(\d{1,3}(?:[.,]\d)?))?(?:\s*(cm|mm)\b)?/i);
  if (size && (size[4] || (Number(number(size[1])) >= 5 && Number(number(size[2])) >= 5))) {
    features.push(`Ölçü: ${[size[1], size[2], size[3]].filter(Boolean).join(" x ")}${size[4] ? ` ${size[4].toLowerCase()}` : ""}`);
  }
  const pages = folded.match(/(?<![\d.])(\d{1,4})\s*(?:yp|yaprak)(?![a-z])/);
  if (pages) features.push(`Yaprak: ${pages[1]}`);
  const volume = folded.match(/(?<![\d.])(\d+(?:[.,]\d+)?)\s*(ml|lt|litre)(?![a-z])/);
  if (volume) features.push(`Hacim: ${number(volume[1])} ${volume[2] === "ml" ? "ml" : "litre"}`);
  const parts = folded.match(/(?<![\d.])(\d{1,5})\s*parca(?![a-z])/);
  if (parts) features.push(`Parça sayısı: ${parts[1]}`);
  const pack = folded.match(/(?<![\d.])(\d{1,3})\s*['’]?\s*(?:li|lu)(?![a-z])/);
  if (pack && Number(pack[1]) > 1) features.push(`Paket içeriği: ${pack[1]} adet`);
  if (input.sub === "Kalemler") {
    const tip = folded.match(/(?<![\d.,])0[.,]([3-9]\d?)(?!\d)/);
    if (tip) features.push(`Uç kalınlığı: 0.${tip[1]} mm`);
  }
  const color = COLORS.filter(([key]) => new RegExp(`(?<![a-z])${key}(?![a-z])`).test(folded)).map(([, label]) => label);
  if (color.length > 0 && color.length <= 3) features.push(`Renk: ${color.join(", ")}`);
  return features;
}

function prepDescription(input: DescriptionInput): string {
  const folded = foldTr(input.name);
  const grade = folded.match(/(\d{1,2})\.\s?sinif/)?.[1];
  const exam = folded.match(/\b(tyt|ayt|lgs|kpss|ales|dgs|yds|ydt|msu)\b/)?.[1]?.toUpperCase();
  const subjects = SUBJECTS.filter(([pattern]) => pattern.test(folded)).map(([, label]) => label).slice(0, 3);
  const type = /soru bankasi|\bsoru\b/.test(folded) ? "Soru kitabı" : /deneme/.test(folded) ? "Deneme" : /konu anlatim/.test(folded) ? "Konu anlatımı" : /fasikul/.test(folded) ? "Fasikül" : null;
  const target = exam ? `${exam} hazırlığında` : grade ? `${grade}. sınıf öğrencilerinin ders çalışmalarında` : "ders ve sınav hazırlığında";
  const features = [
    grade && `Sınıf: ${grade}. sınıf`,
    exam && `Sınav: ${exam}`,
    subjects.length > 0 && `Ders: ${subjects.join(", ")}`,
    type && `Tür: ${type}`,
    /(?<!\d)(?:20)?26\s*-\s*(?:20)?27(?!\d)|(?<!\d)2027(?!\d)/.test(input.name) && "Dönem: 2026-27",
  ].filter((item): item is string => Boolean(item));
  return withFeatures(`${input.name}, ${target} konu tekrarı ve pekiştirme için kullanabileceğiniz yardımcı bir kaynaktır.`, features);
}

function bookDescription(input: DescriptionInput): string {
  const match = input.name.match(/^(.*?)\s*\(([^()]+)\)\s*$/);
  const title = (match?.[1] ?? input.name).trim();
  const author = match?.[2]?.trim();
  const sentence = author ? `${title}, ${author} imzasıyla okuma listenize ekleyebileceğiniz bir kitaptır.` : `${title}, okuma listenize ekleyebileceğiniz bir kitaptır.`;
  return withFeatures(sentence, author ? [`Yazar: ${author}`] : []);
}

const withFeatures = (sentence: string, features: string[]) => (features.length > 0 ? `${sentence}\n\n${features.map((item) => `• ${item}`).join("\n")}` : sentence);

export function generateDescription(input: DescriptionInput): string {
  if (input.root === "Hazırlık Kitapları") return prepDescription(input);
  if (input.root === "Kültür Kitapları") return bookDescription(input);
  const options = (input.sub ? USAGE[input.sub] : undefined) ?? ROOT_USAGE[input.root] ?? FALLBACK;
  return withFeatures(`${input.name}, ${options[hashOf(input.name) % 2]}`, productFeatures(input.name, input));
}
