"use client";

import { useEffect, useRef, useState } from "react";
import AddToCartButton from "./AddToCartButton";

interface StickyBuyBarProps {
  productId: string;
  stock: number;
  name: string;
  price: string;
  // Asıl "Sepete Ekle" alanının id'si; o alan ekrandayken çubuk gizlenir.
  targetId: string;
}

// Mobilde ürün sayfasının altına sabitlenen satın alma çubuğu. Asıl buton ekrandayken ve sayfanın
// sonuna (bu bileşenin konduğu yere) gelindiğinde gizlenir; böylece footer'ın üstüne binmez.
export default function StickyBuyBar({ productId, stock, name, price, targetId }: StickyBuyBarProps) {
  const end = useRef<HTMLDivElement>(null);
  const [targetInView, setTargetInView] = useState(true);
  const [pastEnd, setPastEnd] = useState(false);

  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target || !end.current) return;

    // Üstten 60px: mobilde yapışan arama çubuğunun altında kalan buton görünür sayılmaz.
    const targetObserver = new IntersectionObserver(([entry]) => setTargetInView(entry.isIntersecting), {
      rootMargin: "-60px 0px 0px 0px",
    });
    const endObserver = new IntersectionObserver(([entry]) =>
      setPastEnd(entry.isIntersecting || entry.boundingClientRect.top < 0),
    );
    targetObserver.observe(target);
    endObserver.observe(end.current);
    return () => {
      targetObserver.disconnect();
      endObserver.disconnect();
    };
  }, [targetId]);

  if (stock < 1) return null;

  const visible = !targetInView && !pastEnd;

  return (
    <>
      <div ref={end} aria-hidden className="h-px" />
      <div
        className={`fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-neutral-200 bg-raised px-4 pb-[max(0.625rem,env(safe-area-inset-bottom))] pt-2.5 shadow-[0_-4px_12px_rgb(0_0_0/0.08)] transition duration-200 sm:px-6 md:hidden dark:shadow-[0_-6px_16px_rgb(0_0_0/0.7)] ${
          visible ? "" : "invisible translate-y-full opacity-0"
        }`}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-neutral-500">{name}</p>
          <p className="text-base font-extrabold leading-tight">{price}</p>
        </div>
        <div className="w-36 shrink-0">
          <AddToCartButton productId={productId} stock={stock} />
        </div>
      </div>
    </>
  );
}
