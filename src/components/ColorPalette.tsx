"use client";

import { useEffect, useState } from "react";
import type { ProductPalette } from "@/lib/colors";

// Boya lekesi biçimleri; sırayla kullanılır ki lekeler birbirinin aynısı olmasın.
const blobs = [
  "58% 42% 55% 45% / 48% 60% 40% 52%",
  "45% 55% 40% 60% / 58% 44% 56% 42%",
  "62% 38% 48% 52% / 42% 56% 44% 58%",
  "50% 50% 60% 40% / 60% 42% 58% 40%",
];

// Ürünün renkleri tıklanabilir boya lekeleri olarak dizilir. Lekeye basınca seçilen renk, ürün
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
          {color ? color.name : "Bir lekeye dokunun"}
        </span>
      </h2>
      {/* Lekeler 40px: parmakla rahat basılır. */}
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {palette.colors.map((item, index) => {
          const active = index === selected;
          return (
            <li key={item.name}>
              <button
                type="button"
                title={item.name}
                aria-label={item.name}
                aria-pressed={active}
                onClick={() => setSelected(active ? null : index)}
                className="grid size-10 place-items-center"
              >
                <span
                  className={`block border-2 border-ink transition-[width,height,rotate] duration-200 ${
                    active ? "size-10 rotate-12" : "size-8 hover:size-9"
                  }`}
                  style={{ backgroundColor: item.hex, borderRadius: blobs[index % blobs.length] }}
                />
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
