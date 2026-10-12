"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";

// Sayfa bu kadar kaydırılınca düğme görünür ve sayfanın başına dönene kadar ekranda kalır.
const SHOW_AFTER_PX = 60;
// Düğmenin ekran kenarından ve alttaki yapışkan çubuktan (varsa) uzaklığı.
const GAP_PX = 16;
// Alttaki yapışkan çubuklar bu öznitelikle işaretlenir (StickyBuyBar, SchoolListBuilder): düğme onların üstünde durur.
const BOTTOM_BAR_SELECTOR = "[data-bottom-bar]";

// Sağ altta küçük yuvarlak "yukarı çık" düğmesi ve sayfanın üstünde ince okuma ilerleme çubuğu. StoreLayout'ta bir
// kez durur. Düğme sayfadan ayrı, ekrana sabit bir öğedir: kaydırma boyunca aynı yerde kalır; ekranın altına
// yapışan bir çubuk (satın alma, liste toplamı) görünüyorsa onun yüksekliği kadar yukarı çıkar, üstüne binmez.
// Dinleyiciler pasif ve requestAnimationFrame ile sınırlıdır.
export default function ScrollTop() {
  const bar = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [lift, setLift] = useState(0);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      if (bar.current) bar.current.style.transform = `scaleX(${progress})`;
      setVisible(window.scrollY > SHOW_AFTER_PX);

      // Ekranın alt kenarına değen görünür çubuklar: en yükseğinin üst kenarından ekran altına olan mesafe.
      let needed = 0;
      for (const element of document.querySelectorAll<HTMLElement>(BOTTOM_BAR_SELECTOR)) {
        const rect = element.getBoundingClientRect();
        const touchesBottom = rect.height > 0 && rect.top < window.innerHeight && rect.bottom > window.innerHeight - 40;
        if (touchesBottom) needed = Math.max(needed, window.innerHeight - rect.top);
      }
      setLift(Math.round(needed));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    // Alttaki çubuklar geçişle girip çıkar (StickyBuyBar); geçiş bitince konum yeniden hesaplanır.
    document.addEventListener("transitionend", schedule, true);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      document.removeEventListener("transitionend", schedule, true);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <>
      <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[70] h-1">
        <div ref={bar} className="h-full origin-left bg-brand-500" style={{ transform: "scaleX(0)" }} />
      </div>

      <button
        type="button"
        aria-label="Sayfanın başına çık"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        tabIndex={visible ? 0 : -1}
        // bottom, alt çubuk yüksekliğine ve iPhone'un ana ekran çubuğuna (safe-area) göre hesaplanır.
        style={{ bottom: `calc(env(safe-area-inset-bottom, 0px) + ${lift + GAP_PX}px)` }}
        className={`fixed right-3 z-40 grid size-11 place-items-center rounded-full border border-neutral-200 bg-raised text-fg shadow-lg transition-[opacity,translate,bottom] duration-200 hover:bg-neutral-100 md:right-6 ${
          visible ? "" : "pointer-events-none translate-y-3 opacity-0"
        }`}
      >
        <ArrowUp size={20} aria-hidden />
      </button>
    </>
  );
}
