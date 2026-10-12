"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

export interface TabItem {
  id: string;
  label: string;
  content: ReactNode;
}

// Ürün sayfasındaki sekmeli alan (açıklama, özellikler, teslimat). İçerikler sunucuda çizilir ve hepsi
// sayfada bulunur (yalnızca etkin olan görünür); arama motorları hepsini okuyabilir.
// Klavye: ← → ile sekmeler arası geçilir, Home/End ilk/son sekmeye gider.
export default function ProductTabs({ tabs }: { tabs: TabItem[] }) {
  const baseId = useId();
  const [active, setActive] = useState(0);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  if (tabs.length === 0) return null;

  const select = (index: number) => {
    setActive(index);
    buttons.current[index]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    if (event.key === "ArrowRight") select((index + 1) % tabs.length);
    else if (event.key === "ArrowLeft") select((index - 1 + tabs.length) % tabs.length);
    else if (event.key === "Home") select(0);
    else if (event.key === "End") select(tabs.length - 1);
    else return;
    event.preventDefault();
  };

  return (
    <section className="mt-8">
      {/* Mobilde sekmeler tek satırda yatay kayar; seçili sekme sarı zemin üstünde alt çizgiyle belirginleşir. */}
      <div role="tablist" aria-label="Ürün bilgileri" className="-mx-4 flex gap-1 overflow-x-auto border-b border-neutral-200 px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
        {tabs.map((tab, index) => {
          const selected = index === active;
          return (
            <button
              key={tab.id}
              ref={(element) => {
                buttons.current[index] = element;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(index)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={`-mb-px shrink-0 whitespace-nowrap rounded-t-lg border-b-4 px-4 py-3 text-sm font-extrabold ${
                selected ? "border-brand-500 bg-brand-100/60" : "border-transparent text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {tabs.map((tab, index) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${baseId}-panel-${tab.id}`}
          aria-labelledby={`${baseId}-tab-${tab.id}`}
          hidden={index !== active}
          className="pt-5"
        >
          {tab.content}
        </div>
      ))}
    </section>
  );
}
