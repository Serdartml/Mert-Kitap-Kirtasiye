import { foldTr } from "./search-fold";
import type { ParsedName, TurnaItem } from "./turna-catalog";

// Turna ürünlerine "Ana > Alt" kategori atar. Kurallar katlanmış (foldTr: küçük harf, ı=i, ç=c ...) ad üzerinde çalışır.
// Sıra: sınav/hazırlık kitabı -> yazarlı/yayınevli kitap -> ürün türü (adın ilk kelimesi) -> ad içinde geçen güçlü kelime.

export type CategoryPath = string;

const CAT = {
  kalem: "Kırtasiye > Kalemler",
  silgi: "Kırtasiye > Silgi & Kalemtıraş",
  defter: "Kırtasiye > Defterler & Not Kâğıtları",
  ajanda: "Kırtasiye > Ajanda & Planlayıcı",
  dosya: "Kırtasiye > Dosya & Klasör",
  kagit: "Kırtasiye > Kâğıt & Karton",
  zarf: "Kırtasiye > Zarf, Etiket & Sticker",
  bant: "Kırtasiye > Yapıştırıcı & Bant",
  ofis: "Kırtasiye > Ofis Gereçleri",
  okulGerec: "Kırtasiye > Okul Gereçleri",
  kalemlik: "Kırtasiye > Kalemlik & Kutular",
  okulCanta: "Çanta & Beslenme > Okul Çantaları",
  beslenme: "Çanta & Beslenme > Beslenme Çantaları",
  matara: "Çanta & Beslenme > Matara & Suluk",
  canta: "Çanta & Beslenme > Diğer Çantalar",
  boya: "Sanatsal > Boyalar",
  firca: "Sanatsal > Fırça & Tuval",
  cizim: "Sanatsal > Çizim & Eskiz",
  markor: "Sanatsal > Markörler & Kaligrafi",
  hobi: "Sanatsal > Hobi & El İşi",
  lego: "Oyuncak > Lego & Yapı Oyuncakları",
  arac: "Oyuncak > Araçlar & Figürler",
  puzzle: "Oyuncak > Puzzle & Zeka Oyunları",
  pelus: "Oyuncak > Peluş & Fidget",
  spor: "Oyuncak > Spor & Top",
  parti: "Oyuncak > Parti & Yılbaşı",
  hediye: "Hediyelik > Hediye & Biblo",
  kitapAks: "Hediyelik > Kitap Aksesuarları",
  hesap: "Elektronik > Hesap Makineleri",
  elektronik: "Elektronik > Aksesuarlar",
  cocukKitap: "Kültür Kitapları > Çocuk Kitapları",
  roman: "Kültür Kitapları > Roman & Edebiyat",
  diger: "Diğer Ürünler > Çeşitli",
} as const;

// ---------- Kitaplar ----------

const EXAM_WORD = /\b(\d{1,2}\.\s?sinif|tyt|ayt|ygs|lys|yks|lgs|kpss|ales|dgs|yds|ydt|msu|abt|teog)\b/;
const PREP_WORD =
  /\b(soru|deneme|konu|test|fasikul|tarama|yaprak|bankasi|calisma|kazanim|ozet|kelime|sozcuk|paragraf|problem|geometri|tekrar|modul|etkinlik|defter|foy|kitabi|set|akademi|dinamo|hibrit|kartlari|vocabulary|reading|practice)\b/;

// "Yds 5.Sınıf Marathon ..." bir sınav değil, İngilizce yardımcı kitap yayınevi; sınavlar sınıf numarası olmadan yazılır.
const isYdsPublisher = (folded: string) => /^yds\s+\d/.test(folded);

function hazirlikCategory(folded: string): CategoryPath {
  if (isYdsPublisher(folded)) return "Hazırlık Kitapları > Okula Yardımcı";
  if (/\b(kpss|ales|dgs|yds|ydt|msu|abt)\b/.test(folded)) return "Hazırlık Kitapları > KPSS & Diğer Sınavlar";
  if (/\blgs\b|\bteog\b|\b8\.\s?sinif/.test(folded)) return "Hazırlık Kitapları > LGS";
  if (/\b(tyt|ayt|ygs|lys|yks)\b|\b12\.\s?sinif/.test(folded)) return "Hazırlık Kitapları > TYT - AYT";
  return "Hazırlık Kitapları > Okula Yardımcı";
}

export function isTestPrep(folded: string): boolean {
  if (!EXAM_WORD.test(folded) && !/^(brans akademi|zeka kupu)\b/.test(folded)) return false;
  return PREP_WORD.test(folded) || /-(19|20)\d{2}/.test(folded) || /^\S+(\s\S+)?\s+(\d{1,2}\.\s?sinif|tyt|ayt|lgs)\b/.test(folded);
}

const CLASSIC_AUTHORS =
  /dostoyevski|tolstoy|zweig|zweıg|balzac|jules verne|shakespeare|kafka|dickens|victor hugo|vıctor hugo|alexandre dumas|\ba\.\s?dumas|gorki|cehov|gogol|orwell|oscar wilde|jane austen|mark twain|twaın|jack london|stevenson|defoe|nietzsche|moliere|molıere|zola|maupassant|turgenyev|bulgakov|woolf|goethe|sait faik|sabahattin ali|halit ziya|huseyin rahmi|ahmet mithat|resat nuri|yakup kadri|tanpinar|orhan veli|kemal tahir|aytmatov|exupery|lewis carroll|andersen|grimm|collodi|collodı|tam ?metin|ksltm|ksltlm|gunumuz turkcesi|klasik/;

// Çocuk/gençlik kitabı yayınevleri ve işaretleri (katlanmış marka adında aranır).
const CHILDREN_PUBLISHERS =
  /cocuk|tudem|yagmur|parmak|beyaz balina|kirmizikedi|kirmizi kedi|pogo|eksik parca|yeti kitap|1001cicek|gunisigi|bilge kultur|sincap|nesil cocuk|erdem cocuk|yuva yay|doganegmont|dogan egmont|minik|bilgi park|betakids|beta kids|morpa|hayalperest/;

export function bookCategory(item: TurnaItem, parsed: ParsedName, folded: string): CategoryPath {
  const brand = foldTr(parsed.brand ?? "");
  const hasAuthor = /\(.*-.*\)/.test(item.name);
  const hay = `${folded} ${brand}`;
  if (/\b(anime|manga|comics?|grafik roman|marvel)\b|\bcilt\s?:\s?\d|\b\d+\.?\s?cilt\b|gerekli seyler|komik seyler|kral sakir/.test(hay)) return "Kültür Kitapları > Çizgi Roman & Manga";
  if (/\b(sozluk|kilavuz|atlas|imla|ansiklopedi)\b/.test(folded)) return "Kültür Kitapları > Sözlük & Başvuru";
  if (/\bkurani\b|\bkuran\b|yasini serif|\bhadis\b|ilmihal|tecvid|sureler ve dua|\bdua kitabi|\bsiyer\b/.test(folded)) return "Kültür Kitapları > Din & İnanç";
  if (/^stage \d|\bgrade\b|\bingilizce\b|\benglish\b|\b(oxford|dorlion|mk publicat|living|black cat)\b/.test(hay)) return "Kültür Kitapları > Yabancı Dilde Kitaplar";
  if (/\bboyama\b|\bmasal|\bbil bakalim|okul oncesi|\bbebek|\b\d\s?yas\b|\+\d|etkinlik|karton kitap|dokun|eglenceli bilim|ilk bilim|\bsticker/.test(folded)) return CAT.cocukKitap;
  if (CLASSIC_AUTHORS.test(foldTr(item.name))) return "Kültür Kitapları > Klasik Eserler";
  if (/\b(kisisel gelisim|motivasyon|ozguven|basari|aliskanlik|liderlik|zihin|meditasyon|mutluluk|psikoloji)\b/.test(folded)) return "Kültür Kitapları > Kişisel Gelişim";
  if (CHILDREN_PUBLISHERS.test(brand)) return CAT.cocukKitap;
  if (/isbankasi/.test(brand) && !hasAuthor) return CAT.cocukKitap;
  return CAT.roman;
}

// ---------- Ürün türleri ----------

// Kesin ürün kelimeleri: ad bunlarla başlıyorsa yayınevi markası olsa bile ürün sayılır.
const HARD_LEADS: Record<CategoryPath, string> = {
  [CAT.kalem]:
    "versatil mekanik kursun tukenmez jel roller dolma fosforlu foforlu fineliner kalem kopya dereceli keceli pilot stabilo lamy rotring uniball pentel parker schneider hizli rapido sonsuz jumbo",
  [CAT.silgi]: "silgi kalemtras daksil duzeltici",
  [CAT.defter]: "defter bloknot modelist sekreterlik fihrist notluk postit notix noktali yapiskanli indeks kup",
  [CAT.ajanda]: "ajanda planlayici planner takvim akademik",
  [CAT.dosya]: "citcitli dosya klasor sunum foy evrak seperator telli fermuarli koruklu magazinlik sikistirmali l",
  [CAT.kagit]: "kagit fon karton kraft krepon eva asetat mukavva milimetrik oluklu kece origami renkli karbon",
  [CAT.zarf]: "zarf etiket sticker stiker kartpostal davetiye fiyat rakam harf",
  [CAT.bant]: "bant yapistirici tutkal silikon patafix maskeleme stick",
  [CAT.ofis]: "zimba delgec makas atas atac kiskac raptiye muhur istampa makbuz senet puantaj fatura matbu imza laminasyon cilt koli yaka organizer kasa toner multifonksiyon resepsiyon ambalaj masaustu toplu cakma miknatis termal kesim",
  [CAT.okulGerec]: "cetvel pergel gonye sekilgec geometri mezura harita kure abakus kompas iletki buyutec pusula yazi proje minkale turkiye tebesir sayi t delta",
  [CAT.kalemlik]: "kalemlik",
  [CAT.beslenme]: "beslenme",
  [CAT.matara]: "matara suluk termos",
  [CAT.canta]: "canta cuzdan valiz",
  [CAT.boya]: "akrilik suluboya kuruboya yagli guaj parmak sprey boya tekstil seramik vernik ebru krepon sim neon",
  [CAT.firca]: "firca tuval",
  [CAT.cizim]: "sketch eskiz cizim canson komur teknik sanatsal",
  [CAT.markor]: "posca zig del marker markor brush calligraphy broadpen sharpie guzelyazi edding pintor le",
  [CAT.hobi]: "polimer boncuk maket rafya cini mantar sonil ponpon linol porselen kil kabartmali kazinabilir yaldizli elisi eshel enzo esel dil yap mandal kretuar strafor rulo",
  [CAT.lego]: "lego",
  [CAT.arac]: "hotwheels hotweels oyuncak",
  [CAT.puzzle]: "puzzle yapboz satranc tavla okey monopoly jenga uno dart tetris iskambil sudoku futbolcu denge kelime",
  [CAT.pelus]: "pelus squishy slime yoyo oynar kinetik tatli kopuk ruzgar pop soft kopuren",
  [CAT.spor]: "futbol basketbol voleybol hentbol tenis pinpon badminton kaykay",
  [CAT.parti]: "balon konfeti noel yilbasi sus",
  [CAT.hediye]: "hediyelik hediye biblo anahtarlik kupa muzik buhurdanlik tutsuluk magnet miknatisli hatira fanus taki bileklik semsiye mendil kumbara bayrak dekoratif plak anime duvar kum fotograf rozet atli islak calar mumluk",
  [CAT.hesap]: "hesap",
  [CAT.elektronik]: "pil sarj usb kulaklik mouse tablet telefon laptop bilgisayar kronometre elektrik dijital flash led el arac",
};

// Belirsiz kelimeler: kitap adı da olabilir; yalnızca yayınevi/yazar işareti yoksa ürün sayılır.
const SOFT_LEADS: Record<CategoryPath, string> = {
  [CAT.okulCanta]: "okul anaokulu",
  [CAT.matara]: "su",
  [CAT.kagit]: "resim simli metalik",
  [CAT.kalem]: "tahta kirmizi mavi siyah ilk",
  [CAT.defter]: "not",
  [CAT.boya]: "sulu pastel",
  [CAT.okulGerec]: "ogrenci",
  [CAT.hobi]: "mum ahsap",
  [CAT.hediye]: "masa pul",
  [CAT.puzzle]: "oyun zeka",
  [CAT.pelus]: "sihirli surpriz stres",
  [CAT.spor]: "top",
  [CAT.arac]: "model",
  [CAT.bant]: "cift fix",
  [CAT.parti]: "kar cam",
};

// Adın başındaki ikili/üçlü kalıplar tek kelimeden güvenilirdir; önce bunlara bakılır. Başında ^ olmayanlar ad içinde aranır.
const PHRASES: [RegExp, CategoryPath][] = [
  [/boyama (kitab|defter)|kitabim\b/, CAT.cocukKitap],
  [/^resim defter|^hatira defter/, CAT.defter],
  [/^sinav silgi|^hamur silgi/, CAT.silgi],
  [/^(oyun hamur|hamur\b|proje kili)/, CAT.pelus],
  [/\b(marker|markor|posca|brush pen)\b(?! pad)|^firca uclu|^akrilik marker/, CAT.markor],
  [/^(asetat|imza|muhur|ozel) kalem|^\S+ kalemi\b/, CAT.kalem],
  [/^(simli |likit |sivi )?yapistirici|^stick yapistirici/, CAT.bant],
  [/^elektrik bant|^cift tarafli (montaj )?bant|^tamir bant/, CAT.bant],
  [/^resim palet/, CAT.firca],
  [/^yapiskan (bocek|el|hayvan)/, CAT.pelus],
  [/^(evrak|proje|tablet|laptop|bilgisayar) (canta|tup)/, CAT.canta],
  [/^bilgisayar etiket|^fiyat etiket/, CAT.zarf],
  [/^(masa lambasi|masa ustu fan|masa ustu vantilator)/, CAT.elektronik],
  [/^masa ?(ustu )?kalemlik/, CAT.kalemlik],
  [/^harf sablon|^dil karti/, CAT.okulGerec],
  [/^t cetveli/, CAT.okulGerec],
  [/^(tubitak|cocuklar icin)/, CAT.cocukKitap],
  [/^masa takvim/, CAT.ajanda],
  [/^maket (bicag|bicagi)|^ambalaj lastik/, CAT.ofis],
  [/^(ambalaj kagit|hediye kagit|hediye poset|hediye kutu|poset)/, CAT.hediye],
  [/^(fotograf (kagit|baski))|^renkli kagit|^kuse kagit/, CAT.kagit],
  [/^(fotograf albu|fotograf askis)/, CAT.hediye],
  [/^(yazi tahtas|beyaz tahta(?! kalem))/, CAT.okulGerec],
  [/^(tahta kalem|beyaz tahta kalem)/, CAT.kalem],
  [/^(cam|seramik|kumas|tekstil|ahsap|su bazli|sulu) ?boya|boyasi\b|^parmak boya/, CAT.boya],
  [/^(su|matara) ?(matara|sisesi|mataras)|^matara/, CAT.matara],
  [/^okul canta/, CAT.okulCanta],
  [/^(kitap ayrac|kitap kabi|hazir kitap kabi)/, CAT.kitapAks],
  [/^hesap makin/, CAT.hesap],
  [/^(cam |kar )(kure|sprey)|^kar (kure|sprey)|^yilbasi/, CAT.parti],
  [/^cam (boya|jel|sticker|vitray)/, CAT.boya],
];

const leadIndex = (rules: Record<CategoryPath, string>) => {
  const index = new Map<string, CategoryPath>();
  for (const [category, words] of Object.entries(rules)) for (const word of words.split(/\s+/)) if (word && !index.has(word)) index.set(word, category);
  return index;
};
const hardIndex = leadIndex(HARD_LEADS);
const softIndex = leadIndex(SOFT_LEADS);

// Ad içinde geçince güçlü sinyal veren kelimeler (ilk kelime tanınmadığında).
// Sıra önemlidir: ilk eşleşen kazanır.
const ANYWHERE: [RegExp, CategoryPath][] = [
  [/\bboyama\b|kelimeleri ogreniyorum|farkli olani bul|cizerim silerim|^acil |kureli kitap|degerler dizisi/, CAT.cocukKitap],
  [/dergisi?\b/, "Kültür Kitapları > Dergiler"],
  [/ajanda|planlayici|takvim/, CAT.ajanda],
  [/futbolcu|esleştirme kart|eslestirme kart|kizma birader|\bgames?\b|board game|yasak kelime|memory|banzuki|solo test|ravensburger/, CAT.puzzle],
  [/stic\b|stiç|\bmese\b|surpriz kutu|kauçuk|kaucuk|sik sik|akrobatik|zipl|sulu top|\bay top\b|ritim|dudük|duduk|ucurtma|dinozor yumurta|saka gozlugu/, CAT.pelus],
  [/kirtasiye seti|baslangic seti|yazi tahtasi temizleyici/, CAT.okulGerec],
  [/squishy|slime|pop-?it|hamuru\b/, CAT.pelus],
  [/kalemtras|\bsilgi/, CAT.silgi],
  [/makbuz|otokopili|kontrat|tutanak|taahhut|\bfisi?\b|adisyon|numarator|\batas|sumen|klips|kartvizit|kasasi|kimlik|ehliyet|kilif|karne|asma kilit|vantuz|kaplik/, CAT.ofis],
  [/kagi[dt]|bristol|aydinger|jelatin|folyo|kaplama|persomen|\bkarton\b/, CAT.kagit],
  [/paten|dizlik|\bkask\b|snorkel|yuzucu|simit|sisme|kamp yatagi|bisiklet|plates|boks|rugby|havuz|oyun\s*kart/, CAT.spor],
  [/tombala|mangala|domino|\btabu\b|scrabble|twister|cluedo|hafiza kart|misket|topac|tangram|\boyun\w*|\bzeka\b|puzzle|satranc|\brisk\b|kutu oyun/, CAT.puzzle],
  [/sarj|power ?bank|\busb\b|kablo|speaker|pikap|karaoke|mikrofon|klavye|\bmouse\b|\bmp3\b|ampul|lamba|\bled\b|nemlendirici|buhar mak|kamera|\bpil\b|sd kart|cakmak|flut|melodika/, CAT.elektronik],
  [/ekskavator|motorsiklet|mini gt|vosvos|maket araba|jordania|nerf|nork/, CAT.arac],
  [/dekopaj|quiling|quilling|mozaik|spatul|spatula|vitray|oyma seti|pon ?pon|baget|dugme|hasir|\btuy\b|soma kup|funny kids|nail art|tirnak|modelleme|terebentin|keten yagi|canvas pad|sovale|\btoka\b|pouring/, CAT.hobi],
  [/sablon|kesir|birim kup|geometrik|taban bloklari|oruntu|ebesuar|carpim tablosu|pistole|klavuz cizgili|sistemi seti|dolasim|sindirim|bosaltim|gezegen sistemi|teleskop|durbun|mikroskop|harita|\bkure\b/, CAT.okulGerec],
  [/yemek kabi|lunchbox/, CAT.beslenme],
  [/biblo|cerceve|poster|portre|kosesi|kolye|yuzuk|tarak|\bayna\b|maske|kolonya|sabun|kumbara|terlik susu|tattoo|anahtarlik|bardak|tepsi|tebrik|yelpaze|sifonyer|tuzluk|kullukl?u?k|fiyonk|hasir ipi|sahte para|dedeler/, CAT.hediye],
  [/doğum günü|dogum gunu|\bmum/, CAT.parti],
  [/\b(kalem\w*|tukenmez|versatil)\b/, CAT.kalem],
  [/\bdosya\b/, CAT.dosya],
  [/tutkal|yapistirici|\bbant|\bbandi\b/, CAT.bant],
  [/\bdefter\w*|notblok/, CAT.defter],
  [/\bboya\w*|\byagi\b|\bmarkoru\b/, CAT.boya],
  [/\b(canta|cantasi)\b|cuzdan\w*/, CAT.canta],
  [/\boyuncak\b/, CAT.arac],
  [/\bsticker\b/, CAT.zarf],
];

export function leadWord(folded: string): string {
  return folded.split(/[\s.,:;/()+-]+/).find(Boolean) ?? "";
}

function phraseCategory(folded: string): CategoryPath | null {
  for (const [pattern, category] of PHRASES) if (pattern.test(folded)) return category;
  return null;
}

// Kesin ürün: ad kitap olamayacak kadar belli (hard kelime ya da kalıp).
export function hardCategory(folded: string): CategoryPath | null {
  return phraseCategory(folded) ?? hardIndex.get(leadWord(folded)) ?? null;
}

export function softCategory(folded: string): CategoryPath | null {
  return softIndex.get(leadWord(folded)) ?? null;
}

export function anywhereCategory(folded: string): CategoryPath | null {
  for (const [pattern, category] of ANYWHERE) if (pattern.test(folded)) return category;
  return null;
}

// ---------- Yayınevi öğrenme ve sınıflandırma ----------

export interface BookSignals {
  publishers: Set<string>;
}

// Markası (son "-" sonrası) çoğunlukla KDV %0 ürünlerde geçen adlar yayınevi sayılır.
export function learnPublishers(entries: { brand: string | null; vat: number }[]): Set<string> {
  const seen = new Map<string, { zero: number; all: number }>();
  for (const { brand, vat } of entries) {
    if (!brand) continue;
    const key = foldTr(brand);
    const stat = seen.get(key) ?? { zero: 0, all: 0 };
    stat.all++;
    if (vat === 0) stat.zero++;
    seen.set(key, stat);
  }
  const publishers = new Set<string>();
  for (const [key, stat] of seen) if (stat.zero >= 3 && stat.zero / stat.all >= 0.9) publishers.add(key);
  return publishers;
}

export interface Classified {
  category: CategoryPath | null;
  kind: "kitap" | "urun" | "belirsiz";
}

export function classify(item: TurnaItem, parsed: ParsedName, signals: BookSignals): Classified {
  const folded = foldTr(item.name);
  const brand = foldTr(parsed.brand ?? "");
  const hasAuthor = /\(.*-.*\)/.test(item.name);
  const publisherBrand = brand !== "" && signals.publishers.has(brand);
  const hard = hardCategory(folded);

  // 1) Sınav/hazırlık kitabı (Turna bazılarını yanlış KDV ile girmiş; KDV'ye bakılmaz).
  if (isTestPrep(folded) && (item.vat === 0 || !hard || /^\S+ \d/.test(folded))) return { category: hazirlikCategory(folded), kind: "kitap" };

  // 2) Yazar parantezli ad kesin kitaptır.
  if (hasAuthor) return { category: bookCategory(item, parsed, folded), kind: "kitap" };

  // 3) Kesin ürün kelimesi.
  if (hard) return { category: hard, kind: "urun" };

  // 4) Yayınevi markalı ya da KDV %0 + Turna kitap etiketi: kitap.
  const labelBook = /kitap/.test(foldTr(item.label));
  if (publisherBrand || labelBook) return { category: bookCategory(item, parsed, folded), kind: "kitap" };

  // 5) Belirsiz ürün kelimesi, sonra ad içi sinyaller.
  const soft = softCategory(folded);
  if (soft) return { category: soft, kind: "urun" };
  if (item.vat === 0) return { category: bookCategory(item, parsed, folded), kind: "kitap" };
  const any = anywhereCategory(folded);
  if (any) return { category: any, kind: "urun" };
  return { category: CAT.diger, kind: "belirsiz" };
}
