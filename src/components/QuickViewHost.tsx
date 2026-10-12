"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import AddToCartButton from "./AddToCartButton";
import ProductVisual from "./ProductVisual";
import { QUICK_VIEW_EVENT } from "./QuickViewArea";
import { discountPercent, formatPrice } from "@/lib/format";
import type { ProductSummary } from "@/lib/product-summary";

type State = { status: "closed" } | { status: "loading"; slug: string } | { status: "ready"; product: ProductSummary } | { status: "error" };

// Hızlı bakış penceresi. Sayfada tek bir tane durur (StoreLayout); kartlar QUICK_VIEW_EVENT ile onu açar.
// Mobilde alttan çıkan sayfa, masaüstünde ortada küçük pencere. <dialog> odağı hapseder, Esc ile kapanır;
// arka plana tıklamak da kapatır. Ürün özeti /api/urun-ozet'ten gelir ve oturum boyunca saklanır.
export default function QuickViewHost() {
  const dialog = useRef<HTMLDialogElement>(null);
  const cache = useRef(new Map<string, ProductSummary>());
  const latest = useRef("");
  const [state, setState] = useState<State>({ status: "closed" });

  const close = useCallback(() => {
    dialog.current?.close();
    setState({ status: "closed" });
    document.body.style.overflow = "";
  }, []);

  useEffect(() => {
    const onOpen = async (event: Event) => {
      const slug = (event as CustomEvent<{ slug: string }>).detail.slug;
      latest.current = slug;
      document.body.style.overflow = "hidden";
      const cached = cache.current.get(slug);
      if (cached) {
        setState({ status: "ready", product: cached });
      } else {
        setState({ status: "loading", slug });
      }
      if (!dialog.current?.open) dialog.current?.showModal();
      if (cached) return;

      try {
        const response = await fetch(`/api/urun-ozet?slug=${encodeURIComponent(slug)}`);
        if (!response.ok) throw new Error("yanıt hatası");
        const product: ProductSummary = await response.json();
        cache.current.set(slug, product);
        // Yanıt gelene kadar başka bir ürüne geçildiyse ya da pencere kapatıldıysa eski yanıt yok sayılır.
        if (latest.current === slug && dialog.current?.open) setState({ status: "ready", product });
      } catch {
        if (latest.current === slug) setState({ status: "error" });
      }
    };
    window.addEventListener(QUICK_VIEW_EVENT, onOpen);
    return () => {
      window.removeEventListener(QUICK_VIEW_EVENT, onOpen);
      document.body.style.overflow = "";
    };
  }, []);

  const product = state.status === "ready" ? state.product : null;
  const discount = product ? discountPercent(product.priceKurus, product.compareAtKurus) : null;

  return (
    <dialog
      ref={dialog}
      aria-label="Hızlı bakış"
      onClose={() => {
        setState({ status: "closed" });
        document.body.style.overflow = "";
      }}
      // Arka plana (dialog'un kendisine) tıklanırsa kapanır; içerik tıklamaları dialog'a ulaşmaz.
      onClick={(event) => {
        if (event.target === dialog.current) close();
      }}
      className="fixed inset-x-0 bottom-0 top-auto m-0 max-h-[88svh] w-full max-w-none overflow-y-auto overscroll-contain rounded-t-2xl bg-raised p-0 text-fg shadow-2xl backdrop:bg-black/55 sm:inset-0 sm:m-auto sm:h-fit sm:max-h-[85vh] sm:max-w-md sm:rounded-2xl"
    >
      <div className="relative p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-5">
        <button
          type="button"
          onClick={close}
          aria-label="Kapat"
          className="absolute right-2 top-2 z-10 grid size-10 place-items-center rounded-full bg-raised/90 shadow-md hover:bg-neutral-100"
        >
          <X size={18} aria-hidden />
        </button>

        {state.status === "loading" && (
          <div role="status" aria-label="Ürün yükleniyor" className="animate-pulse">
            <div className="aspect-[4/3] w-full rounded-lg bg-neutral-200 sm:aspect-square" />
            <div className="mt-4 h-5 w-3/4 rounded bg-neutral-200" />
            <div className="mt-3 h-7 w-1/3 rounded bg-neutral-200" />
            <div className="mt-4 h-11 w-full rounded-lg bg-neutral-200" />
          </div>
        )}

        {state.status === "error" && (
          <div role="alert" className="py-10 text-center text-sm">
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
            <div className="mx-auto w-3/5 min-w-40 max-w-64 sm:w-3/4">
              <ProductVisual name={product.name} rootCategorySlug={product.rootSlug} image={product.image} sizes="(min-width: 640px) 24rem, 60vw" />
            </div>

            <div className="mt-4">
              <p className="text-xs font-semibold text-neutral-500">
                {product.brand ? `${product.brand} · ` : ""}
                {product.categoryName}
              </p>
              <h2 className="mt-0.5 text-lg font-extrabold leading-snug">{product.name}</h2>

              <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-2xl font-extrabold">{formatPrice(product.priceKurus)}</span>
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
                <dl className="mt-3 divide-y divide-neutral-200 rounded-lg border border-neutral-200 text-xs">
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
    </dialog>
  );
}
