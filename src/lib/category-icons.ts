import { BookOpen, Calculator, Gift, GraduationCap, Palette, PenLine, type LucideIcon } from "lucide-react";

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
};

// Görseli olmayan ürünün kapak rengi (ProductVisual): zemin ve yazı/ikon rengi. Renkler logodaki
// mavi, pembe, sarı ve siyahtan türer. Sabit renkler: koyu temada da aynı görünür. Tailwind sınıfları
// tam yazılmalı (birleştirilerek üretilen sınıf derlenmez).
export const fallbackCategoryTone = "bg-brand-300 text-ink";

export const categoryTones: Record<string, string> = {
  kirtasiye: "bg-brand-300 text-ink",
  sanatsal: "bg-[#f7c6dd] text-[#a3235f]",
  "hazirlik-kitaplari": "bg-[#c5e4f7] text-[#1f5f8b]",
  "kultur-kitaplari": "bg-ink text-brand-500",
  hediyelik: "bg-[#fff3b8] text-[#a68200]",
  elektronik: "bg-[#e5e5e5] text-ink",
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
};
