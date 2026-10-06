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
