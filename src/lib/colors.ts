// Ürün renk paleti. Ayrı bir renk tablosu yok; renkler ürünün "Renk" / "Renkler" özelliğinden okunur:
//   "Kırmızı, Mavi, Siyah" -> adı geçen renkler (tanınmayan adlar atlanır)
//   "24"                   -> 24 renkli set; hangi renkler olduğu bilinmediği için temsili bir palet
// Yönetim panelinden ürüne bu adla bir özellik eklemek paleti açar.

export interface PaletteColor {
  name: string;
  hex: string;
}

export interface ProductPalette {
  // "list": ürünün gerçek renkleri. "set": yalnızca renk sayısı biliniyor, palet temsilidir.
  kind: "list" | "set";
  colors: PaletteColor[];
}

// Sıra önemli: N renkli bir set için ilk N renk alınır, bu yüzden temel renkler başta.
const knownColors: PaletteColor[] = [
  { name: "Sarı", hex: "#ffd400" },
  { name: "Turuncu", hex: "#ff8a1f" },
  { name: "Kırmızı", hex: "#e02b2b" },
  { name: "Pembe", hex: "#ff7eb6" },
  { name: "Mor", hex: "#7b3fc4" },
  { name: "Mavi", hex: "#1f6fe0" },
  { name: "Açık Mavi", hex: "#7cc4f5" },
  { name: "Yeşil", hex: "#1f9d4d" },
  { name: "Açık Yeşil", hex: "#8fd14f" },
  { name: "Kahverengi", hex: "#7a4a25" },
  { name: "Siyah", hex: "#111111" },
  { name: "Beyaz", hex: "#ffffff" },
  { name: "Limon Sarısı", hex: "#f2ee3a" },
  { name: "Bordo", hex: "#7d1632" },
  { name: "Fuşya", hex: "#d6249f" },
  { name: "Lila", hex: "#c3a6f0" },
  { name: "Lacivert", hex: "#1b2a6b" },
  { name: "Turkuaz", hex: "#19b8b0" },
  { name: "Koyu Yeşil", hex: "#145c33" },
  { name: "Ten Rengi", hex: "#f2c9a5" },
  { name: "Gri", hex: "#8c8c8c" },
  { name: "Altın", hex: "#c9a227" },
  { name: "Gümüş", hex: "#c4c7cc" },
  { name: "Bej", hex: "#e6d5b8" },
  { name: "Somon", hex: "#ff9478" },
  { name: "Vişne", hex: "#a8123e" },
  { name: "Eflatun", hex: "#9a5fd0" },
  { name: "Gök Mavisi", hex: "#3fa9f5" },
  { name: "Petrol Mavisi", hex: "#17607a" },
  { name: "Fıstık Yeşili", hex: "#b5d334" },
  { name: "Haki", hex: "#7a7a3a" },
  { name: "Hardal", hex: "#d4a017" },
  { name: "Açık Kahve", hex: "#b98556" },
  { name: "Krem", hex: "#fff4d6" },
  { name: "Açık Gri", hex: "#cfcfcf" },
  { name: "Koyu Gri", hex: "#4a4a4a" },
];

const byName = new Map(knownColors.map((color) => [color.name.toLocaleLowerCase("tr"), color]));

const ATTRIBUTE_NAMES = new Set(["renk", "renkler"]);

export function getProductPalette(attributes: { name: string; value: string }[]): ProductPalette | null {
  const attribute = attributes.find((item) => ATTRIBUTE_NAMES.has(item.name.trim().toLocaleLowerCase("tr")));
  if (!attribute) return null;
  const value = attribute.value.trim();

  if (/^\d+$/.test(value)) {
    const count = Math.min(Number(value), knownColors.length);
    return count >= 2 ? { kind: "set", colors: knownColors.slice(0, count) } : null;
  }

  const colors = value
    .split(/[,;/]/)
    .map((part) => byName.get(part.trim().toLocaleLowerCase("tr")))
    .filter((color): color is PaletteColor => color !== undefined);
  // Tek renk bir seçenek değil, yalnızca bir özelliktir; palet göstermeye değmez.
  return colors.length >= 2 ? { kind: "list", colors: [...new Set(colors)] } : null;
}
