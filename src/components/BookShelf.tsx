"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import AddToCartButton from "./AddToCartButton";
import ProductVisual from "./ProductVisual";
import type { ProductCardData } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";

// Kitap rafı görünümü: ürünler rafta sırt sırta durur.
//  - Fareyle üstüne gelince sırt genişler (akordeon): dik yazı yatay döner ve ad + fiyat görünür; üstünde kapak görseli açılır.
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

// Açık sırtın genişliği ul'deki --open-w değişkenindedir (mobilde 6 rem, sm ve üstünde 7,5 rem).
// Üstüne gelinen (ya da dokunulan) kitabın arkasındaki, aynı satırdaki kitapları genişleme farkı kadar sağa
// kaydırır. Satırlar offsetTop ile ayırt edilir; kayma translate ile yapıldığından yerleşim (ve satır sarma) değişmez.
function shiftNext(book: HTMLElement) {
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
  const openRem = parseFloat(getComputedStyle(book.parentElement!).getPropertyValue("--open-w"));
  const grow = Math.max(0, openRem * rem - book.offsetWidth);
  for (let next = book.nextElementSibling; next instanceof HTMLElement && next.offsetTop === book.offsetTop; next = next.nextElementSibling) {
    next.style.translate = `${grow}px 0`;
  }
}

function resetShift(book: HTMLElement) {
  for (const sibling of book.parentElement?.children ?? []) (sibling as HTMLElement).style.translate = "";
}

// Bu sayıdan az kitap tek rafa konur (ikiye bölünce alt rafta tek tük kitap kalırdı).
const MIN_FOR_TWO_SHELVES = 6;

export default function BookShelf({ products }: { products: ProductCardData[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = products.find((product) => product.id === selectedId) ?? null;
  const shelves = useRef<HTMLDivElement>(null);

  // Her sayfada iki raf: kitaplar iki satıra eşit bölünür (ekran genişliğine göre sarılmaz); böylece alt rafta 1-2 kitap
  // kalmaz. Çok az kitap varsa (son sayfa) tek raf.
  const rows = products.length > MIN_FOR_TWO_SHELVES ? [products.slice(0, Math.ceil(products.length / 2)), products.slice(Math.ceil(products.length / 2))] : [products];

  // Dokunmatik ekran: seçilen kitap fareyle üstüne gelinmiş gibi açılır; seçim değişince / kapanınca komşular geri döner.
  useEffect(() => {
    const root = shelves.current;
    if (!root) return;
    for (const child of root.querySelectorAll<HTMLElement>("[data-book]")) child.style.translate = "";
    const book = selectedId ? root.querySelector<HTMLElement>(`[data-book="${selectedId}"]`) : null;
    if (book) shiftNext(book);
  }, [selectedId]);

  return (
    <>
      {/* theme-fixed: sırt renkleri her temada aynı kalır. Satır yüksekliği ve raf tahtası globals.css'te. */}
      {/* Sağdaki dolgu (pr), en büyük genişleme farkından (açık genişlik - en dar kitap) büyüktür: satır sonundaki kitaplar kayınca buraya taşar, taşma olmaz. */}
      <div ref={shelves}>
      {rows.map((row, rowIndex) => (
      <ul
        key={rowIndex}
        className="bookshelf theme-fixed flex flex-nowrap items-end gap-x-1 px-3 pr-[6rem] [--open-w:6rem] [--scale:1] sm:gap-x-1.5 sm:px-10 sm:pr-[7.5rem] sm:[--open-w:7.5rem] sm:[--scale:1.4] lg:px-16 lg:pr-36 lg:[--scale:1.8]"
      >
        {row.map((product) => {
          const seed = hash(product.id);
          const tone = tones[seed % tones.length];
          const rootSlug = product.category.parent?.slug ?? product.category.slug;
          const active = product.id === selectedId;
          return (
            // pb: raf tahtasının kalınlığı; kitap tahtanın üstüne oturur.
            // Akordeon: üstüne gelen kitabın sırtı sağa doğru genişler (Link, li'ye göre mutlak konumlu), aynı
            // satırdaki sonraki kitaplar da genişleme farkı kadar yana kayar (shiftNext). li'nin kendi genişliği
            // değişmez: yoksa satır yeniden sarılır ve son kitap alt satıra zıplardı. Kayan kitaplar ul'nin
            // sağ dolgusuna (aşağıda) taşar.
            <li
              key={product.id}
              data-book={product.id}
              className="group relative flex h-[var(--shelf-row)] w-[calc(var(--book-w)*var(--scale))] min-w-0 items-end pb-[10px] transition-[translate] duration-300 ease-out motion-reduce:transition-none"
              style={{ "--book-w": `${2.5 + (seed % 4) * 0.3}rem` } as CSSProperties}
              onPointerEnter={(event) => event.pointerType === "mouse" && shiftNext(event.currentTarget)}
              onPointerLeave={(event) => event.pointerType === "mouse" && resetShift(event.currentTarget)}
              onFocus={(event) => event.target.matches(":focus-visible") && shiftNext(event.currentTarget)}
              onBlur={(event) => !active && resetShift(event.currentTarget)}
            >
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
                className={`absolute bottom-[10px] left-0 block w-full origin-bottom overflow-hidden rounded-t-sm border-2 border-b-0 border-ink py-2 transition-[width,translate,rotate] duration-300 ease-out motion-reduce:transition-none dark:border-[#8a8a8a] group-hover:-translate-y-3 group-hover:w-[var(--open-w)] focus-visible:-translate-y-3 focus-visible:w-[var(--open-w)] ${
                  tone.spine
                } ${active ? "-translate-y-3 !w-[var(--open-w)]" : ""}`}
                style={{ height: `${9 + (seed % 5) * 0.75}rem` }}
              >
                <span className={`flex h-full flex-col items-center justify-between transition-opacity duration-150 group-hover:opacity-0 group-has-[:focus-visible]:opacity-0 ${active ? "opacity-0" : ""}`}>
                  <span aria-hidden className={`h-1 w-3/5 rounded-full ${tone.band}`} />
                  {/* Dikey yazıda line-clamp bazı tarayıcılarda (iOS) yazıyı tümden gizleyebildiği için üç noktayla kesilir. */}
                  <span className="max-h-[78%] rotate-180 overflow-hidden text-ellipsis whitespace-nowrap px-0.5 text-[11px] font-extrabold leading-tight [writing-mode:vertical-rl] sm:text-xs">
                    {product.name}
                  </span>
                  <span aria-hidden className={`h-1 w-3/5 rounded-full ${tone.band}`} />
                </span>
                {/* Açık yüz (yalnızca fareyle / odakla): dik yazı yatay döner. Ekran okuyucu bağlantı adını zaten okur. */}
                <span
                  aria-hidden
                  className={`pointer-events-none absolute left-0 top-1/2 flex w-[var(--open-w)] -translate-y-1/2 flex-col items-center gap-1.5 px-2 text-center transition-[rotate,opacity] sm:px-2.5 duration-300 ease-out motion-reduce:transition-none group-hover:rotate-0 group-hover:opacity-100 group-has-[:focus-visible]:rotate-0 group-has-[:focus-visible]:opacity-100 ${
                    active ? "rotate-0 opacity-100" : "-rotate-90 opacity-0"
                  }`}
                >
                  <span className={`h-1 w-8 rounded-full ${tone.band}`} />
                  <span className="line-clamp-4 text-xs font-extrabold uppercase leading-snug tracking-wide">{product.name}</span>
                  <span className="text-sm font-extrabold">{formatPrice(product.priceKurus)}</span>
                </span>
              </Link>

              {/* Kapak: yalnızca fareyle (ya da klavye odağıyla) açılır. */}
              <div className="pointer-events-none invisible absolute bottom-[calc(100%-2.5rem)] left-[calc(50%+2.2rem)] z-20 hidden w-36 -translate-x-1/2 translate-y-2 rounded-xl border-2 border-ink bg-white p-2 opacity-0 shadow-xl transition duration-200 group-has-[:focus-visible]:visible group-has-[:focus-visible]:translate-y-0 group-has-[:focus-visible]:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 md:block">
                {/* Ad ve fiyat açılan sırtta yazar; kapakta yalnızca görsel kalır (tekrar olmasın). */}
                <ProductVisual name={product.name} rootCategorySlug={rootSlug} image={product.images[0]} sizes="144px" />
              </div>
            </li>
          );
        })}
      </ul>
      ))}
      </div>

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

