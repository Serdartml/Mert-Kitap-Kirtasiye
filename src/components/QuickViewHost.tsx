"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import AddToCartButton from "./AddToCartButton";
import ProductVisual from "./ProductVisual";
import { QUICK_VIEW_EVENT } from "./QuickViewArea";
import { categoryTones, fallbackCategoryTone } from "@/lib/category-icons";
import { discountPercent, formatPrice } from "@/lib/format";
import type { ProductSummary } from "@/lib/product-summary";

type State = { status: "loading"; slug: string } | { status: "ready"; product: ProductSummary } | { status: "error" };

interface Anchor {
  left: number;
  top: number;
  width: number;
  height: number;
}

// Balonun ekranla arasında bırakacağı boşluk ve karta uzaklığı (px).
const MARGIN = 12;
const GAP = 18;
const BUBBLE_WIDTH = 416;
// Bu genişliğin altında balon kartın yanına sığmaz: ekranın ortasında, kartın olduğu yerden büyüyerek açılır.
const SIDE_BREAKPOINT = 760;
const CLOSE_MS = 280;

// Hızlı bakış balonu. Sayfada tek bir tane durur (StoreLayout); kartlar QUICK_VIEW_EVENT ile onu açar.
// Balon bağımsız bir pencere değildir: tıklanan / üstünde beklenen kartın yanında, karttan büyüyormuş gibi (kartın
// merkezinden ölçeklenerek) açılır; arkadaki sayfa bulanıklaşır ve kartın kendisi bulanıklığın üstünde aynı yerde
// (kopyası) kalır. Dar ekranda balon ortada, yine kartın olduğu noktadan büyüyerek açılır. Esc, arka plana tıklama ya da
// "Kapat" balonu kartın içine geri küçültür. Odak balonda kalır (Tab döner). Ürün özeti /api/urun-ozet'ten gelir ve
// oturum boyunca saklanır.
export default function QuickViewHost() {
  const overlay = useRef<HTMLDivElement>(null);
  const bubble = useRef<HTMLDivElement>(null);
  const tail = useRef<HTMLSpanElement>(null);
  const cloneBox = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const anchor = useRef<Anchor | null>(null);
  const source = useRef<HTMLElement | null>(null);
  const cache = useRef(new Map<string, ProductSummary>());
  const latest = useRef("");
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [mounted, setMounted] = useState(false);
  const [entered, setEntered] = useState(false);
  const [state, setState] = useState<State>({ status: "loading", slug: "" });

  // Balonu karta göre yerleştirir: tercihen kartın sağına, sığmazsa soluna, o da olmazsa ortaya. Büyüme noktası
  // (transform-origin) kartın merkezidir; kuyruk kartı gösterir. Stil doğrudan elemana yazılır (durum değil).
  const place = useCallback(() => {
    const box = bubble.current;
    const rect = anchor.current;
    if (!box || !rect) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const wide = vw >= SIDE_BREAKPOINT;
    const width = Math.min(BUBBLE_WIDTH, vw - MARGIN * 2);
    const height = box.offsetHeight;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    let side: "right" | "left" | "center" = "center";
    let left = (vw - width) / 2;
    if (wide) {
      if (rect.left + rect.width + GAP + width + MARGIN <= vw) {
        side = "right";
        left = rect.left + rect.width + GAP;
      } else if (rect.left - GAP - width - MARGIN >= 0) {
        side = "left";
        left = rect.left - GAP - width;
      }
    }
    const top = Math.min(Math.max(MARGIN, side === "center" ? (vh - height) / 2 : cy - height / 2), Math.max(MARGIN, vh - height - MARGIN));

    box.style.width = `${width}px`;
    box.style.left = `${left}px`;
    box.style.top = `${top}px`;
    box.style.transformOrigin = `${cx - left}px ${cy - top}px`;

    const arrow = tail.current;
    if (arrow) {
      arrow.style.display = side === "center" ? "none" : "block";
      arrow.style.top = `${Math.min(Math.max(cy - top, 30), Math.max(30, height - 30)) - 9}px`;
      arrow.style.left = side === "right" ? "-9px" : "";
      arrow.style.right = side === "left" ? "-9px" : "";
      arrow.dataset.side = side;
    }

    // Kartın kopyası, bulanık arka planın üstünde kartın olduğu yerde durur (yalnızca balon yanındayken).
    const holder = cloneBox.current;
    if (holder) {
      holder.style.display = side === "center" ? "none" : "block";
      holder.style.left = `${rect.left}px`;
      holder.style.top = `${rect.top}px`;
      holder.style.width = `${rect.width}px`;
      holder.style.height = `${rect.height}px`;
      if (!holder.firstChild && source.current) {
        const copy = source.current.cloneNode(true) as HTMLElement;
        copy.removeAttribute("id");
        copy.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
        copy.querySelectorAll("[data-fly-source]").forEach((node) => node.removeAttribute("data-fly-source"));
        copy.setAttribute("inert", "");
        copy.style.width = "100%";
        copy.style.height = "100%";
        copy.style.transform = "none";
        holder.appendChild(copy);
      }
    }
  }, []);

  const close = useCallback(() => {
    setEntered(false);
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => {
      setMounted(false);
      document.body.style.overflow = "";
      if (cloneBox.current) cloneBox.current.replaceChildren();
      source.current = null;
    }, CLOSE_MS);
  }, []);

  useEffect(() => {
    const onOpen = async (event: Event) => {
      const { slug, element } = (event as CustomEvent<{ slug: string; element?: HTMLElement | null }>).detail;
      latest.current = slug;
      clearTimeout(closeTimer.current);
      const rect = element?.getBoundingClientRect();
      anchor.current = rect
        ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
        : { left: window.innerWidth / 2 - 60, top: window.innerHeight / 2 - 60, width: 120, height: 120 };
      source.current = element ?? null;
      if (cloneBox.current) cloneBox.current.replaceChildren();
      document.body.style.overflow = "hidden";

      const cached = cache.current.get(slug);
      setState(cached ? { status: "ready", product: cached } : { status: "loading", slug });
      setEntered(false);
      setMounted(true);
      // Balon önce gizli çizilir, yerleştirilir; sonraki karede büyüme animasyonu başlar.
      requestAnimationFrame(() => requestAnimationFrame(() => setEntered(true)));
      if (cached) return;

      try {
        const response = await fetch(`/api/urun-ozet?slug=${encodeURIComponent(slug)}`);
        if (!response.ok) throw new Error("yanıt hatası");
        const product: ProductSummary = await response.json();
        cache.current.set(slug, product);
        // Yanıt gelene kadar başka bir ürüne geçildiyse eski yanıt yok sayılır.
        if (latest.current === slug) setState({ status: "ready", product });
      } catch {
        if (latest.current === slug) setState({ status: "error" });
      }
    };
    window.addEventListener(QUICK_VIEW_EVENT, onOpen);
    return () => {
      window.removeEventListener(QUICK_VIEW_EVENT, onOpen);
      clearTimeout(closeTimer.current);
      document.body.style.overflow = "";
    };
  }, []);

  // Açılırken, içerik yüklenip boyu değişirken ve pencere boyutu değişirken yeniden yerleştir.
  useLayoutEffect(() => {
    if (mounted) place();
  }, [mounted, state, place]);

  useEffect(() => {
    if (!mounted) return;
    const box = bubble.current;
    const observer = box ? new ResizeObserver(place) : null;
    if (box) observer?.observe(box);
    window.addEventListener("resize", place);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      } else if (event.key === "Tab" && box) {
        // Odak balonun içinde döner.
        const focusable = [...box.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex='-1'])")];
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        } else if (!box.contains(document.activeElement)) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    closeButton.current?.focus({ preventScroll: true });
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", place);
      window.removeEventListener("keydown", onKey);
    };
  }, [mounted, place, close]);

  if (!mounted) return null;

  const product = state.status === "ready" ? state.product : null;
  const discount = product ? discountPercent(product.priceKurus, product.compareAtKurus) : null;
  const tone = product ? (categoryTones[product.rootSlug] ?? fallbackCategoryTone).split(" ")[0] : "bg-neutral-100";

  return (
    <div
      ref={overlay}
      className="fixed inset-0 z-[90]"
      // Arka plana tıklayınca kapanır; balonun içi ve kartın kopyası tıklamayı yutar.
      onClick={(event) => {
        if (event.target === overlay.current || event.target === event.currentTarget.firstElementChild) close();
      }}
    >
      {/* Bulanık arka plan: sayfa görünür ama odak balonda. */}
      <div aria-hidden className={`absolute inset-0 bg-black/35 backdrop-blur-md transition-opacity duration-300 ${entered ? "opacity-100" : "opacity-0"}`} />

      {/* Kartın kopyası: bulanıklığın üstünde, kartın olduğu yerde. */}
      <div
        ref={cloneBox}
        aria-hidden
        className={`pointer-events-none absolute overflow-hidden rounded-xl shadow-2xl ring-2 ring-brand-500 transition-opacity duration-300 ${entered ? "opacity-100" : "opacity-0"}`}
      />

      <div
        ref={bubble}
        role="dialog"
        aria-modal="true"
        aria-label="Hızlı bakış"
        className={`absolute origin-center transition-[transform,opacity] duration-[420ms] motion-reduce:duration-150 ${
          entered
            ? "scale-100 opacity-100 [transition-timing-function:cubic-bezier(0.2,0.9,0.3,1.15)]"
            : "scale-[0.12] opacity-0 [transition-timing-function:cubic-bezier(0.4,0,0.6,1)]"
        }`}
      >
        {/* Kuyruk: balonun kartı gösteren ucu. */}
        <span
          ref={tail}
          aria-hidden
          className="absolute z-0 hidden size-[18px] rotate-45 border-2 border-ink bg-raised data-[side=left]:border-b-0 data-[side=left]:border-l-0 data-[side=right]:border-r-0 data-[side=right]:border-t-0 dark:border-neutral-300"
        />

        <div data-cat={product?.rootSlug} className="relative z-10 overflow-hidden rounded-3xl border-2 border-ink bg-raised text-fg shadow-[0_30px_70px_-18px_rgba(0,0,0,0.7)] dark:border-neutral-300">
          <div aria-hidden className="h-1.5 bg-brand-500" />
          <button
            ref={closeButton}
            type="button"
            onClick={close}
            aria-label="Kapat"
            className="absolute right-2.5 top-4 z-20 grid size-10 place-items-center rounded-full border-2 border-ink bg-white text-ink shadow-md hover:bg-brand-100"
          >
            <X size={18} aria-hidden />
          </button>

          {state.status === "loading" && (
            <div role="status" aria-label="Ürün yükleniyor" className="animate-pulse p-4">
              <div className="h-52 w-full rounded-2xl bg-neutral-200" />
              <div className="mt-4 h-4 w-1/3 rounded bg-neutral-200" />
              <div className="mt-3 h-7 w-3/4 rounded bg-neutral-200" />
              <div className="mt-3 h-8 w-1/3 rounded bg-neutral-200" />
              <div className="mt-4 h-11 w-full rounded-lg bg-neutral-200" />
            </div>
          )}

          {state.status === "error" && (
            <div role="alert" className="px-6 py-12 text-center text-sm">
              <p className="font-extrabold">Ürün bilgisi alınamadı.</p>
              <p className="mt-1 text-neutral-600">Bağlantınızı kontrol edip tekrar deneyin.</p>
              <button type="button" onClick={close} className="btn btn-dark mt-4">
                Kapat
              </button>
            </div>
          )}

          {product && (
            // article: sepete uçuş animasyonu (fly-to-cart) görseli kartın içinde arar.
            <article>
              <div className={`grid h-52 place-items-center overflow-hidden sm:h-56 ${product.image ? "bg-neutral-100" : tone}`}>
                <div className={product.image ? "size-full [&>div]:!aspect-auto [&>div]:size-full [&>div]:rounded-none" : "aspect-square h-full [&>div]:!aspect-auto [&>div]:size-full [&>div]:rounded-none"}>
                  <ProductVisual name={product.name} rootCategorySlug={product.rootSlug} image={product.image} sizes="26rem" />
                </div>
              </div>

              <div className="p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-500">
                  {product.brand ? `${product.brand} · ` : ""}
                  {product.categoryName}
                </p>
                <h2 className="mt-1 text-2xl font-extrabold leading-tight">{product.name}</h2>

                <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-3xl font-extrabold tracking-tight">{formatPrice(product.priceKurus)}</span>
                  {discount && product.compareAtKurus && (
                    <>
                      <span className="text-sm text-neutral-500 line-through">{formatPrice(product.compareAtKurus)}</span>
                      <span className="rounded-md bg-ink px-1.5 py-0.5 text-xs font-extrabold text-brand-500">%{discount}</span>
                    </>
                  )}
                </div>

                <p className={`mt-1.5 text-sm font-bold ${product.stock > 0 ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>
                  {product.stock < 1 ? "Stokta yok" : product.stock <= 5 ? `Son ${product.stock} adet` : "Stokta var"}
                </p>

                {product.description && <p className="mt-3 line-clamp-4 whitespace-pre-line text-sm leading-relaxed text-neutral-700">{product.description}</p>}

                {product.attributes.length > 0 && (
                  <dl className="mt-3 divide-y divide-neutral-200 rounded-xl border border-neutral-200 text-xs">
                    {product.attributes.map((attribute) => (
                      <div key={attribute.name} className="grid grid-cols-[6rem_1fr] gap-3 px-3 py-1.5">
                        <dt className="font-bold text-neutral-500">{attribute.name}</dt>
                        <dd className="font-semibold">{attribute.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}

                <div className="mt-4">
                  <AddToCartButton productId={product.id} stock={product.stock} variant="full" name={product.name} onAdded={close} />
                </div>
                <Link
                  href={`/urun/${product.slug}`}
                  onClick={close}
                  className="mt-2 flex min-h-11 items-center justify-center gap-1.5 rounded-lg text-sm font-extrabold hover:bg-neutral-100"
                >
                  Ürünü incele <ArrowRight size={16} aria-hidden />
                </Link>
              </div>
            </article>
          )}
        </div>
      </div>
    </div>
  );
}
