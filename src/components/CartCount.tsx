"use client";

import { useEffect, useRef } from "react";

// Sepet rozetindeki sayı. Sayı arttığında rozet kısa bir zıplama yapar; ilk yüklemede yapmaz.
export default function CartCount({ count }: { count: number }) {
  const badge = useRef<HTMLSpanElement>(null);
  const previous = useRef(count);

  useEffect(() => {
    const grew = count > previous.current;
    previous.current = count;
    if (!grew || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    badge.current?.animate([{ scale: 1 }, { scale: 1.6 }, { scale: 0.9 }, { scale: 1 }], {
      duration: 450,
      easing: "ease-out",
    });
  }, [count]);

  if (count < 1) return null;

  return (
    <span
      ref={badge}
      className="absolute -right-2.5 -top-2.5 grid min-w-5 place-items-center rounded-full bg-brand-500 px-1 text-[11px] font-extrabold leading-5 text-ink"
    >
      <span className="sr-only">Sepette </span>
      {count}
      <span className="sr-only"> ürün</span>
    </span>
  );
}
