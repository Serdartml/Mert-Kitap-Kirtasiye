"use client";

import { useEffect } from "react";

// Ana sayfa için masaüstü "duraklı kaydırma" (yalnızca fare tekeri; dokunmatik ve dar ekranlarda hiçbir şey yapmaz).
// Duraklar yukarıdan aşağı:
//   0  sayfa başı
//   1  "Öne Çıkanlar" vitrini görünür alanın ortasında
//   2  ürünler bölümünün başı (vitrinin hemen altındaki kategori şeridi)
//   -- 2 ile 3 arası serbest: normal kaydırma --
//   3  ürünler bölümünün sonu (sipariş takip kutusu ekranın altında biter)
//   4  mağaza bandı (açık günler; ekranda ortalı)
//   5  sayfa sonu (alt bar / footer)
// Tek bir tekerlek hareketi bir durak ilerler. Konum her olayda yeniden hesaplanır (durum tutulmaz): sayfa
// elle kaydırılsa da, yeniden yüklense de doğru durak seçilir. Tespit için sayfadaki data-snap işaretleri:
// "vitrin" (vitrin bölümü, hemen sonrasındaki öğe ürünler bölümünün başıdır), "serbest-son" ve "alt-blok" (mağaza bandı).
const ANIMATION_MS = 750;
// Bir hareket sayılması için iki tekerlek olayı arasında gereken sessizlik (dokunmatik yüzey ataleti yeni hareket sayılmasın).
const GESTURE_GAP_MS = 160;
const TOLERANCE = 12;

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function absoluteTop(el: Element): number {
  return el.getBoundingClientRect().top + window.scrollY;
}

// Yapışkan üst çubukların (logo satırı + kategori menüsü) toplam yüksekliği.
function stickyHeaderHeight(): number {
  const bar = document.querySelector<HTMLElement>(".sticky.top-20");
  return bar ? parseFloat(getComputedStyle(bar).top) + bar.offsetHeight : 126;
}

interface Stops {
  y1: number;
  y2: number;
  y3: number;
  y4: number;
  y5: number;
}

function measureStops(): Stops | null {
  const showcase = document.querySelector<HTMLElement>("[data-snap=vitrin]");
  const zoneStart = showcase?.nextElementSibling;
  const zoneEnd = document.querySelector<HTMLElement>("[data-snap=serbest-son]");
  const blockStart = document.querySelector<HTMLElement>("[data-snap=alt-blok]");
  const blockEnd = blockStart;
  if (!showcase || !zoneStart || !zoneEnd || !blockStart || !blockEnd) return null;

  const vh = window.innerHeight;
  const header = stickyHeaderHeight();
  const visibleMid = (header + vh) / 2;
  const showcaseMid = absoluteTop(showcase) + showcase.offsetHeight / 2;

  const y1 = Math.max(0, showcaseMid - visibleMid);
  const y2 = absoluteTop(zoneStart) - header - 16;
  const y3 = absoluteTop(zoneEnd) + zoneEnd.offsetHeight - vh;
  // Mağaza bandının üstündeki yırtık kenar (~24px) dahil; blok ekrana sığıyorsa ortalanır, sığmıyorsa başı hizalanır.
  const blockTop = absoluteTop(blockStart) - 24;
  const blockBottom = absoluteTop(blockEnd) + blockEnd.offsetHeight;
  const fits = blockBottom - blockTop <= vh - header - 24;
  const y4 = fits ? (blockTop + blockBottom) / 2 - visibleMid : blockTop - header - 12;
  const y5 = document.documentElement.scrollHeight - vh;

  // Duraklar artan sırada ve birbirinden en az 24px uzak olmalı (ilk durak sayfa başına yakın olabilir).
  const ordered = [y1, y2, y3, y4, y5].every((value, i, all) => i === 0 || value - all[i - 1] > 24);
  return ordered ? { y1, y2, y3, y4, y5 } : null;
}

// Tekerlek olayı kendi kaydırılabilir alanı olan bir öğenin (açılır liste, çekmece) üstündeyse sayfa durakları devreye girmez.
function insideScrollable(target: EventTarget | null): boolean {
  let el = target instanceof Element ? target : null;
  while (el && el !== document.body) {
    const style = getComputedStyle(el);
    // Yatay kayan şeritler (vitrin, kategori şeridi, mobil ürün şeridi) overflow-x ile overflow-y'yi de "auto"ya çevirir
    // ama dikey kaymaz; yalnızca gerçekten dikey kayan öğeler sayılır.
    const horizontalStrip = style.overflowX === "auto" || style.overflowX === "scroll";
    if (!horizontalStrip && (style.overflowY === "auto" || style.overflowY === "scroll") && el.scrollHeight > el.clientHeight + 1) return true;
    el = el.parentElement;
  }
  return false;
}

export default function HomeSnapScroll() {
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 768px) and (hover: hover) and (pointer: fine)");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animating = false;
    let frame = 0;
    let lastWheel = 0;

    const jump = (top: number) => window.scrollTo({ top, behavior: "instant" as ScrollBehavior });

    const goTo = (target: number) => {
      const from = window.scrollY;
      if (reduceMotion.matches || Math.abs(target - from) < 2) {
        jump(target);
        return;
      }
      animating = true;
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / ANIMATION_MS);
        jump(from + (target - from) * easeInOutCubic(t));
        if (t < 1) frame = requestAnimationFrame(tick);
        else animating = false;
      };
      frame = requestAnimationFrame(tick);
    };

    const onWheel = (event: WheelEvent) => {
      if (!desktop.matches || event.ctrlKey || event.metaKey || event.deltaY === 0) return;
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      if (document.body.style.overflow === "hidden" || document.querySelector("dialog[open], [aria-modal=true]")) return;
      if (insideScrollable(event.target)) return;

      const now = performance.now();
      const newGesture = now - lastWheel > GESTURE_GAP_MS;
      lastWheel = now;

      // Animasyon sürerken gelen olaylar yutulur (sayfa kendi başına kaymasın).
      if (animating) {
        event.preventDefault();
        return;
      }

      const stops = measureStops();
      if (!stops) return;
      const { y1, y2, y3, y4, y5 } = stops;
      const y = window.scrollY;
      const down = event.deltaY > 0;
      const pixels = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaMode === 2 ? event.deltaY * window.innerHeight : event.deltaY;

      let target: number | null = null; // null: normal kaydırma
      if (down) {
        if (y < y1 - TOLERANCE) target = y1;
        else if (y < y2 - TOLERANCE) target = y2;
        else if (y < y3 - TOLERANCE) {
          // Serbest bölge: normal kaydırma; ama bu hareket sonu aşacaksa tam sonda durulur.
          if (y + pixels > y3) target = y3;
        } else if (y < y4 - TOLERANCE) target = y4;
        else if (y < y5 - TOLERANCE) target = y5;
      } else if (y > y4 + TOLERANCE) target = y4;
      else if (y > y3 + TOLERANCE) target = y3;
      else if (y > y2 + TOLERANCE) {
        if (y + pixels < y2) target = y2;
      } else if (y > y1 + TOLERANCE) target = y1;
      else if (y > TOLERANCE) target = 0;

      if (target === null) return;
      event.preventDefault();
      // Aynı hareketin devamı (atalet, hızlı çevirme) yeni bir durak başlatmaz; yalnızca yutulur.
      if (newGesture || (y + pixels > y3 && y < y3) || (y + pixels < y2 && y > y2)) goTo(target);
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      window.removeEventListener("wheel", onWheel);
      cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
