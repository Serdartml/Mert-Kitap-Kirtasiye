import { BookOpen, Calculator, Gift, GraduationCap, Palette, PenLine, type LucideIcon } from "lucide-react";

export const fallbackCategoryIcon = PenLine;

// Ana kategori slug'ı -> ikon. Yeni ana kategori eklenince buraya da ekleyin.
export const categoryIcons: Record<string, LucideIcon> = {
  kirtasiye: PenLine,
  sanatsal: Palette,
  "hazirlik-kitaplari": GraduationCap,
  "kultur-kitaplari": BookOpen,
  hediyelik: Gift,
  elektronik: Calculator,
};
