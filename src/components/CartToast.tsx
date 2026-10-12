"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { CART_ADDED_EVENT, type CartAddedDetail } from "./AddToCartButton";

const VISIBLE_MS = 3600;

// Sepete ürün eklenince alttan çıkan kısa bildirim ve sepet ikonunun sallanması. StoreLayout'ta bir kez durur;
// AddToCartButton'ın yayınladığı olayı dinler. Bildirimin üzerine gelince ya da odaklanınca kapanmaz.
export default function CartToast() {
  const [toast, setToast] = useState<(CartAddedDetail & { id: number }) | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hovering = useRef(false);
  // Süre dolduğunda fare üstündeyse kapanma, fare ayrılana kadar ertelenir.
  const hidePending = useRef(false);

  const hideLater = useCallback((ms: number) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (hovering.current) hidePending.current = true;
      else setToast(null);
    }, ms);
  }, []);

  useEffect(() => {
    const onAdded = (event: Event) => {
      const detail = (event as CustomEvent<CartAddedDetail>).detail;
      setToast({ ...detail, id: Date.now() });
      hidePending.current = false;
      hideLater(VISIBLE_MS);

      // Görünen sepet bağlantısındaki ikon sallanır (globals.css, cart-wiggle).
      const target = [...document.querySelectorAll<HTMLElement>("[data-cart-target]")].find((el) => el.getClientRects().length > 0);
      if (target) {
        target.classList.remove("cart-wiggle");
        // Aynı sınıf art arda eklenirse animasyon yeniden başlamaz; yeniden akış zorlanır.
        void target.offsetWidth;
        target.classList.add("cart-wiggle");
        target.addEventListener("animationend", () => target.classList.remove("cart-wiggle"), { once: true });
      }
    };
    window.addEventListener(CART_ADDED_EVENT, onAdded);
    return () => {
      window.removeEventListener(CART_ADDED_EVENT, onAdded);
      clearTimeout(timer.current);
    };
  }, [hideLater]);

  if (!toast) return null;

  return (
    <div
      key={toast.id}
      role="status"
      onPointerEnter={() => (hovering.current = true)}
      onPointerLeave={() => {
        hovering.current = false;
        if (hidePending.current) {
          hidePending.current = false;
          hideLater(1200);
        }
      }}
      // Mobilde yapışan satın alma çubuğunun (ürün sayfası) üstünde kalır ve sağda "yukarı çık" düğmesine yer bırakır;
      // masaüstünde sağ altta, düğmenin üstünde durur. Konum düz sınıflarla verilir; özel değerli, hesaplamalı bir
      // sınıf gerekmiyor.
      className="toast-in fixed bottom-24 left-3 right-[4.5rem] z-[60] flex max-w-md items-center gap-3 rounded-xl bg-ink px-4 py-3 text-white shadow-xl md:bottom-24 md:left-auto md:right-6"
    >
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-500 text-ink">
        <Check size={16} strokeWidth={3} aria-hidden />
      </span>
      <span className="min-w-0 flex-1 text-sm">
        <span className="block font-extrabold">{toast.adjusted ? "Sepet güncellendi" : "Sepete eklendi"}</span>
        <span className="block truncate text-xs text-white/70">{toast.adjusted ? toast.message : (toast.name ?? "")}</span>
      </span>
      <Link href="/sepet" onClick={() => setToast(null)} className="shrink-0 rounded-lg bg-brand-500 px-3 py-2 text-sm font-extrabold text-ink hover:bg-brand-400">
        Sepete git
      </Link>
    </div>
  );
}
