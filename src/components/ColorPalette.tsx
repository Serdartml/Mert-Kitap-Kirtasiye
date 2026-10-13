"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import type { ProductPalette } from "@/lib/colors";

// Seçili rengin üstündeki tik, rengin açık/koyu olmasına göre okunur kalsın.
function isLight(hex: string): boolean {
  const value = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
}

// Ürünün renkleri tıklanabilir renk kareleri olarak dizilir (görünüm globals.css'te .palette-*). Renge basınca seçilen renk, ürün
// görselinin kutusuna (visualId) yansır; görünümü globals.css içindeki [data-paint] kuralları belirler.
// Renk bir sipariş seçeneği değildir (ürünlerde varyant yok), yalnızca gösterimdir.
export default function ColorPalette({ palette, visualId }: { palette: ProductPalette; visualId: string }) {
  const [selected, setSelected] = useState<number | null>(null);
  const color = selected === null ? null : palette.colors[selected];

  useEffect(() => {
    const visual = document.getElementById(visualId);
    if (!visual) return;
    if (color) {
      visual.style.setProperty("--paint", color.hex);
      visual.dataset.paint = "";
    } else {
      visual.style.removeProperty("--paint");
      delete visual.dataset.paint;
    }
  }, [color, visualId]);

  return (
    <section className="mt-6">
      <h2 className="text-sm font-extrabold">
        {palette.kind === "set" ? `Setteki ${palette.colors.length} renk` : "Renkler"}
        <span className="ml-2 font-semibold text-neutral-500" aria-live="polite">
          {color ? color.name : "Bir renge dokunun"}
        </span>
      </h2>
      {/* Düğmeler 40px: parmakla rahat basılır. */}
      <ul className="mt-3 flex flex-wrap gap-1.5">
        {palette.colors.map((item, index) => {
          const active = index === selected;
          return (
            <li key={item.name} className="palette-item relative">
              <button
                type="button"
                aria-label={item.name}
                aria-pressed={active}
                onClick={() => setSelected(active ? null : index)}
                className="grid size-10 place-items-center"
              >
                <span className="palette-swatch" style={{ backgroundColor: item.hex }}>
                  {active && <Check size={16} strokeWidth={4} aria-hidden style={{ color: isLight(item.hex) ? "#111" : "#fff" }} />}
                </span>
                {/* Ad etiketi: yalnızca fareyle / klavye odağıyla görünür (globals.css). */}
                <span aria-hidden className="palette-tip">
                  {item.name}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {palette.kind === "set" && (
        <p className="mt-1.5 text-xs text-neutral-500">Palet temsilidir; setteki renkler farklılık gösterebilir.</p>
      )}
    </section>
  );
}
