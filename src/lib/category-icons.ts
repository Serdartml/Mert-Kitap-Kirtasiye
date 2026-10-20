import { Backpack, BookOpen, Calculator, Gift, GraduationCap, Palette, PenLine, ToyBrick, type LucideIcon } from "lucide-react";

// Ana kategoriye özel görsel kimlik: ikon ve kâğıt dokusu. Çizimler CategoryArt içinde.
// Yeni ana kategori eklenince buraya ve CategoryArt'a ekleyin; eklenmezse kırtasiye görünümü kullanılır.

export const fallbackCategoryIcon = PenLine;

export const categoryIcons: Record<string, LucideIcon> = {
  kirtasiye: PenLine,
  sanatsal: Palette,
  "hazirlik-kitaplari": GraduationCap,
  "kultur-kitaplari": BookOpen,
  hediyelik: Gift,
  elektronik: Calculator,
  "canta-beslenme": Backpack,
  oyuncak: ToyBrick,
};

// Görseli olmayan ürünün kapak rengi (ProductVisual): zemin ve yazı/ikon rengi. Renkler logodaki
// mavi, pembe, sarı ve siyahtan türer; hediyelik (mor), elektronik (nane), çanta & beslenme (yeşil) ve oyuncak (mercan kırmızısı) kategori renkleriyle (globals.css, "Kategori renkleri") uyumludur. Sabit renkler: koyu temada da aynı görünür. Tailwind sınıfları
// tam yazılmalı (birleştirilerek üretilen sınıf derlenmez).
export const fallbackCategoryTone = "bg-brand-300 text-ink";

export const categoryTones: Record<string, string> = {
  kirtasiye: "bg-brand-300 text-ink",
  sanatsal: "bg-[#f7c6dd] text-[#a3235f]",
  "hazirlik-kitaplari": "bg-[#c5e4f7] text-[#1f5f8b]",
  "kultur-kitaplari": "bg-ink text-brand-500",
  hediyelik: "bg-[#e6dbff] text-[#5b3fb0]",
  elektronik: "bg-[#c9f2ea] text-[#136b5a]",
  "canta-beslenme": "bg-[#d6f0d3] text-[#2a6b21]",
  oyuncak: "bg-[#fcd4d1] text-[#a02c24]",
};

export const fallbackCategoryPattern = "pattern-dots";

// Sınıflar globals.css içinde tanımlı.
export const categoryPatterns: Record<string, string> = {
  kirtasiye: "pattern-dots", // noktalı defter
  sanatsal: "pattern-blobs", // boya lekeleri
  "hazirlik-kitaplari": "pattern-grid", // kareli defter
  "kultur-kitaplari": "pattern-lines", // çizgili defter
  hediyelik: "pattern-ribbon", // çapraz kurdele
  elektronik: "pattern-fine-grid", // ince ızgara
  "canta-beslenme": "pattern-weave", // dokuma kumaş
  oyuncak: "pattern-studs", // yapı oyuncağı çıkıntıları
};
