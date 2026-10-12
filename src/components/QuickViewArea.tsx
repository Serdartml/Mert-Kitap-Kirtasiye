"use client";

import { useEffect, useRef, type ReactNode } from "react";

// Hızlı bakışı açan olay: QuickViewHost dinler.
export const QUICK_VIEW_EVENT = "quickview:open";

// Dokunmatik ekranda bu kadar basılı tutunca, fare ile bu kadar üstünde durunca pencere açılır.
// Uzun basma tarayıcının bağlantı menüsü eşiğinden (~500 ms) kısa tutulur; menü olayı gelirse o da
// aynı hızlı bakışı açar (aşağıda onContextMenu), yani iki yoldan biri mutlaka çalışır.
const LONG_PRESS_MS = 400;
const HOVER_MS = 2000;
// Parmak bu kadar kayarsa uzun basma iptal olur (kaydırma ya da yatay şerit).
const MOVE_TOLERANCE_PX = 10;

// Ürün kartının dış kabuğu (<article>). Kartın içeriği sunucuda çizilir, buraya children olarak gelir.
//  - Mobil: karta uzun basınca hızlı bakış açılır; uzun basmanın ardından gelen tıklama (ürün sayfasına
//    gitme) ve tarayıcının bağlantı menüsü engellenir.
//  - Masaüstü: fare kartın üstünde 2 saniyeden uzun kalırsa açılır. Fare ayrılınca, tıklayınca ya da sayfa
//    kayınca sayaç sıfırlanır; kartların altından geçip giden fare pencere açmaz.
export default function QuickViewArea({ slug, className, children }: { slug: string; className?: string; children: ReactNode }) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const suppressClick = useRef(false);
  const lastPointerType = useRef<string>("");

  const cancel = () => {
    clearTimeout(timer.current);
    timer.current = undefined;
    origin.current = null;
  };

  // Uzun basma iki yoldan tetiklenebilir (sayaç ve tarayıcının bağlantı menüsü olayı); pencere bir kez açılır.
  const openFromTouch = () => {
    if (suppressClick.current) return;
    suppressClick.current = true;
    navigator.vibrate?.(12);
    open();
  };

  const open = () => {
    cancel();
    window.dispatchEvent(new CustomEvent(QUICK_VIEW_EVENT, { detail: { slug } }));
  };

  useEffect(() => {
    // Sayfa kayarken fare bir kartın üstünde "kalmış" olur; o sayaç da iptal edilir.
    const onScroll = () => {
      if (timer.current) cancel();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      clearTimeout(timer.current);
    };
  }, []);

  return (
    <article
      className={`${className ?? ""} pointer-coarse:select-none pointer-coarse:[-webkit-touch-callout:none]`}
      onPointerEnter={(event) => {
        if (event.pointerType !== "mouse") return;
        cancel();
        timer.current = setTimeout(open, HOVER_MS);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") cancel();
      }}
      onPointerDown={(event) => {
        lastPointerType.current = event.pointerType;
        cancel();
        if (event.pointerType === "mouse") return;
        origin.current = { x: event.clientX, y: event.clientY };
        suppressClick.current = false;
        timer.current = setTimeout(openFromTouch, LONG_PRESS_MS);
      }}
      onPointerMove={(event) => {
        if (event.pointerType === "mouse" || !origin.current) return;
        if (Math.hypot(event.clientX - origin.current.x, event.clientY - origin.current.y) > MOVE_TOLERANCE_PX) cancel();
      }}
      onPointerUp={(event) => {
        if (event.pointerType !== "mouse") cancel();
      }}
      onPointerCancel={cancel}
      // Android'de uzun basış bağlantı menüsünü açar: menü engellenir ve yerine hızlı bakış açılır
      // (fare sağ tıkı etkilenmez).
      onContextMenu={(event) => {
        if (lastPointerType.current === "touch" || lastPointerType.current === "pen") {
          event.preventDefault();
          openFromTouch();
        }
      }}
      // Uzun basmanın ardından parmak kalkınca gelen tıklama ürün sayfasını açmasın.
      onClickCapture={(event) => {
        if (suppressClick.current) {
          event.preventDefault();
          event.stopPropagation();
          suppressClick.current = false;
        }
      }}
    >
      {children}
    </article>
  );
}
