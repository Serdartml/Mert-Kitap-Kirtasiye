"use client";

import { useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import AddToCartButton from "./AddToCartButton";
import ProductVisual from "./ProductVisual";
import type { ProductCardData } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";

// Kitap rafı görünümü: ürünler rafta sırt sırta durur.
//  - Fareyle üstüne gelince kitap öne eğilir ve üstünde kapağı (görsel, ad, fiyat) açılır.
//  - Dokunmatik ekranda ilk dokunuş kitabı seçer ve altta bir kart açar; karttan ürüne gidilir.
// Sırt rengi ve ölçüleri ürün kimliğinden türetilir: aynı kitap her seferinde aynı görünür.

// Koyu temada sayfa zemini de siyaha yakın olduğu için siyah sırt bir ton açılır; kenar çizgisi de
// (aşağıda) griye döner. Yoksa siyah kitaplar zeminde kaybolur.
const tones = [
  { spine: "bg-ink text-white dark:bg-[#2b2b2b]", band: "bg-brand-500" },
  { spine: "bg-brand-500 text-ink", band: "bg-ink" },
  { spine: "bg-white text-ink", band: "bg-brand-500" },
  { spine: "bg-[#6bb5e6] text-ink", band: "bg-white" },
  { spine: "bg-[#e8478f] text-white", band: "bg-ink" },
  { spine: "bg-neutral-200 text-ink", band: "bg-ink" },
];

function hash(text: string) {
  let value = 0;
  for (const char of text) value = (value * 31 + char.charCodeAt(0)) % 9973;
  return value;
}

export default function BookShelf({ products }: { products: ProductCardData[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = products.find((product) => product.id === selectedId) ?? null;

  return (
    <>
      {/* theme-fixed: sırt renkleri her temada aynı kalır. Satır yüksekliği ve raf tahtası globals.css'te. */}
      <ul className="bookshelf theme-fixed flex flex-wrap items-end gap-x-1 px-3 sm:gap-x-1.5 sm:px-10 lg:px-16">
        {products.map((product) => {
          const seed = hash(product.id);
          const tone = tones[seed % tones.length];
          const rootSlug = product.category.parent?.slug ?? product.category.slug;
          const active = product.id === selectedId;
          return (
            // pb: raf tahtasının kalınlığı; kitap tahtanın üstüne oturur.
            <li key={product.id} className="group relative flex h-[var(--shelf-row)] items-end pb-[10px]">
              <Link
                href={`/urun/${product.slug}`}
                aria-label={`${product.name}, ${formatPrice(product.priceKurus)}`}
                onClick={(event) => {
                  // Dokunmatik ekranda üstüne gelme yok: ilk dokunuş seçer, ikincisi ürüne gider.
                  if (window.matchMedia("(hover: none)").matches && !active) {
                    event.preventDefault();
                    setSelectedId(product.id);
                  }
                }}
                className={`flex origin-bottom flex-col items-center justify-between rounded-t-sm border-2 border-b-0 border-ink py-2 transition-transform dark:border-[#8a8a8a] duration-200 group-hover:-translate-y-3 group-hover:-rotate-3 focus-visible:-translate-y-3 focus-visible:-rotate-3 ${
                  tone.spine
                } ${active ? "-translate-y-3 -rotate-3" : ""}`}
                style={{ height: `${9 + (seed % 5) * 0.75}rem`, width: `${2.5 + (seed % 4) * 0.3}rem` }}
              >
                <span aria-hidden className={`h-1 w-3/5 rounded-full ${tone.band}`} />
                {/* Dikey yazıda line-clamp bazı tarayıcılarda (iOS) yazıyı tümden gizleyebildiği için üç noktayla kesilir. */}
                <span className="max-h-[78%] rotate-180 overflow-hidden text-ellipsis whitespace-nowrap px-0.5 text-[11px] font-extrabold leading-tight [writing-mode:vertical-rl] sm:text-xs">
                  {product.name}
                </span>
                <span aria-hidden className={`h-1 w-3/5 rounded-full ${tone.band}`} />
              </Link>

              {/* Kapak: yalnızca fareyle (ya da klavye odağıyla) açılır. */}
              <div className="pointer-events-none invisible absolute bottom-[calc(100%-2.5rem)] left-1/2 z-20 hidden w-44 -translate-x-1/2 translate-y-2 rounded-xl border-2 border-ink bg-white p-2 opacity-0 shadow-xl transition duration-200 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 md:block">
                <ProductVisual name={product.name} rootCategorySlug={rootSlug} image={product.images[0]} sizes="176px" />
                <p className="mt-2 line-clamp-2 text-xs font-bold leading-4">{product.name}</p>
                <p className="mt-1 text-sm font-extrabold">{formatPrice(product.priceKurus)}</p>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Dokunmatik ekran: seçilen kitabın kartı altta sabit durur. */}
      {selected && (
        <div className="fixed inset-x-3 bottom-3 z-40 flex items-center gap-3 rounded-2xl border-2 border-fg bg-raised p-2.5 shadow-xl md:hidden">
          <Link href={`/urun/${selected.slug}`} className="w-16 shrink-0">
            <ProductVisual
              name={selected.name}
              rootCategorySlug={selected.category.parent?.slug ?? selected.category.slug}
              image={selected.images[0]}
              sizes="64px"
            />
          </Link>
          <div className="min-w-0 flex-1">
            <Link href={`/urun/${selected.slug}`} className="line-clamp-2 text-[13px] font-bold leading-4 underline-offset-2 hover:underline">
              {selected.name}
            </Link>
            <p className="mt-0.5 text-base font-extrabold leading-tight">{formatPrice(selected.priceKurus)}</p>
          </div>
          <div className="w-28 shrink-0">
            <AddToCartButton key={selected.id} productId={selected.id} stock={selected.stock} />
          </div>
          <button
            type="button"
            aria-label="Kapat"
            onClick={() => setSelectedId(null)}
            className="absolute -right-2 -top-3 grid size-8 place-items-center rounded-full border-2 border-fg bg-raised"
          >
            <X size={14} strokeWidth={3} />
          </button>
        </div>
      )}
    </>
  );
}
