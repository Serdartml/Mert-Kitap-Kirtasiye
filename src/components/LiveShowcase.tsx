"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import Scribble from "./Scribble";

export interface ShowcaseTab {
  id: string;
  // El yazısıyla kategori düğmesinde görünen ad.
  label: string;
  // Sunucuda çizilmiş vitrin kartları (şeridin doğrudan çocukları olmalı).
  content: ReactNode;
}

// Bir sayfa kayışının süresi ve iki kayış arasındaki bekleme (ms). Kayış yumuşak (ease-in-out) animasyonludur.
const SLIDE_MS = 1100;
const HOLD_MS = 2200;

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// Ana sayfa vitrini: limon sarısı bant, el yazısı "Öne Çıkanlar" başlığı, el yazısı kategori düğmeleri ve altında seçili
// kategorinin öne çıkan ürünleri (lüks vitrin kartları). defaultTabId açılışta seçili kategoridir.
// 768 px ve üstünde üç kart görünür ve üçer üçer kayar; üç kart sığmayan (daha dar) ekranlarda tek kart görünür ve
// birer birer kayar. Kayış kendiliğinden döner ve sona gelince başa sarar. Kayma şu durumlarda durur: fare ya da
// klavye odağı vitrindeyken, parmak dokunurken, vitrin ekranda değilken, sekme arka plandayken, kullanıcı "Durdur"
// dediğinde ve "hareketi azalt" açıkken (hiç başlamaz). Elle kaydırma ve oklar her zaman çalışır.
// Tüm kategorilerin kartları sayfada bulunur (yalnızca seçili olan görünür).
export default function LiveShowcase({ tabs, defaultTabId }: { tabs: ShowcaseTab[]; defaultTabId?: string }) {
  const section = useRef<HTMLElement>(null);
  const strips = useRef<(HTMLDivElement | null)[]>([]);
  const tabButtons = useRef<(HTMLButtonElement | null)[]>([]);
  const tabList = useRef<HTMLDivElement>(null);
  // Kategori düğmeleri satırında solda / sağda gizli düğme var mı (dar ekranda ok gösterilir).
  const [edges, setEdges] = useState({ left: false, right: false });
  const animation = useRef<number | undefined>(undefined);
  const [active, setActive] = useState(() => Math.max(0, tabs.findIndex((tab) => tab.id === defaultTabId)));
  const [userPaused, setUserPaused] = useState(false);
  const [touching, setTouching] = useState(false);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = section.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.3 });
    observer.observe(el);
    return () => {
      observer.disconnect();
      if (animation.current) cancelAnimationFrame(animation.current);
    };
  }, []);

  // scrollLeft'i yumuşakça hedefe götürür. Animasyon sırasında scroll-snap kapanır (yoksa tarayıcı araya girer).
  const animateTo = useCallback((el: HTMLElement, target: number) => {
    if (animation.current) cancelAnimationFrame(animation.current);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.scrollLeft = target;
      return;
    }
    const from = el.scrollLeft;
    const start = performance.now();
    el.style.scrollSnapType = "none";
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / SLIDE_MS);
      el.scrollLeft = from + (target - from) * easeInOutCubic(t);
      if (t < 1) animation.current = requestAnimationFrame(tick);
      else el.style.scrollSnapType = "";
    };
    animation.current = requestAnimationFrame(tick);
  }, []);

  // Görünen kart sayısı kadar (3 / 1) ileri ya da geri kayar; sondaysa başa döner.
  const advance = useCallback(
    (direction: 1 | -1) => {
      const el = strips.current[active];
      if (!el || el.children.length < 2) return;
      const first = el.children[0] as HTMLElement;
      const second = el.children[1] as HTMLElement;
      const cardStep = second.offsetLeft - first.offsetLeft;
      const style = getComputedStyle(el);
      const visibleWidth = el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      const gap = cardStep - first.offsetWidth;
      // +0,05: tam üç kartta kayan nokta hatası 2,999... verip bir kart eksik kaydırmasın.
      const perView = Math.max(1, Math.floor((visibleWidth + gap) / cardStep + 0.05));
      const max = el.scrollWidth - el.clientWidth;
      const atEnd = el.scrollLeft >= max - 4;
      if (direction === 1 && atEnd) animateTo(el, 0);
      else animateTo(el, Math.min(max, Math.max(0, el.scrollLeft + direction * perView * cardStep)));
    },
    [animateTo, active],
  );

  useEffect(() => {
    if (userPaused || touching || !inView) return;
    // "Hareketi azalt" açıkken kendiliğinden kayma hiç başlamaz.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => {
      const root = section.current;
      // Fare ya da klavye odağı vitrindeyken beklenir (durum yerine anlık DOM sorgusu: olay kaçsa da doğru çalışır).
      // :hover yalnızca gerçek fare olan cihazlarda sayılır: dokunmatik ekranda en son dokunulan yerde "takılı" kalır ve vitrini sonsuza dek durdururdu.
      const mouseHover = window.matchMedia("(hover: hover)").matches && root?.matches(":hover");
      if (document.hidden || document.querySelector("[role=dialog][aria-label=Menü]") || !root || mouseHover || root.querySelector(":focus-visible")) return;
      advance(1);
    }, SLIDE_MS + HOLD_MS);
    return () => clearInterval(id);
  }, [userPaused, touching, inView, advance]);

  const updateEdges = useCallback(() => {
    const el = tabList.current;
    if (!el) return;
    const left = el.scrollLeft > 4;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
    setEdges((previous) => (previous.left === left && previous.right === right ? previous : { left, right }));
  }, []);

  useEffect(() => {
    const el = tabList.current;
    if (!el) return;
    const observer = new ResizeObserver(updateEdges);
    observer.observe(el);
    // İlk ölçüm bir sonraki karede (yerleşim bitince).
    const frame = requestAnimationFrame(updateEdges);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [updateEdges]);

  const scrollTabs = (direction: 1 | -1) => {
    const el = tabList.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.6, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };

  // Logoya basılınca (LogoLink) vitrin açılış hâline döner: varsayılan kategori seçilir, şeritler başa sarılır.
  useEffect(() => {
    const reset = () => {
      if (animation.current) cancelAnimationFrame(animation.current);
      const initial = Math.max(0, tabs.findIndex((tab) => tab.id === defaultTabId));
      for (const strip of strips.current) {
        if (!strip) continue;
        strip.style.scrollSnapType = "";
        strip.scrollLeft = 0;
      }
      setActive(initial);
    };
    window.addEventListener("home:reset", reset);
    return () => window.removeEventListener("home:reset", reset);
  }, [tabs, defaultTabId]);

  const select = (index: number) => {
    if (index === active) return;
    if (animation.current) cancelAnimationFrame(animation.current);
    const strip = strips.current[index];
    if (strip) {
      strip.style.scrollSnapType = "";
      strip.scrollLeft = 0;
    }
    setActive(index);
  };

  const onTabKeyDown = (event: KeyboardEvent, index: number) => {
    const next = event.key === "ArrowRight" ? (index + 1) % tabs.length : event.key === "ArrowLeft" ? (index - 1 + tabs.length) % tabs.length : -1;
    if (next < 0) return;
    event.preventDefault();
    select(next);
    tabButtons.current[next]?.focus();
  };

  return (
    <section
      ref={section}
      aria-labelledby="vitrin-baslik"
      aria-roledescription="carousel"
      onTouchStart={() => setTouching(true)}
      onTouchEnd={() => setTouching(false)}
      onTouchCancel={() => setTouching(false)}
      className="container-page mt-4 md:mt-5"
    >
      {/* data-cat: bant seçili kategorinin rengine döner (globals.css, "Kategori renkleri"). */}
      <div
        data-cat={tabs[active]?.id}
        className="theme-fixed pattern-dots relative overflow-hidden rounded-2xl bg-brand-500 p-2.5 pb-3 transition-colors duration-500 sm:p-4 sm:pb-3.5 md:p-5 md:pb-4"
      >
        <div className="flex items-end justify-between gap-3">
          <h1 id="vitrin-baslik" className="min-w-0 font-hand text-3xl font-bold leading-none sm:text-4xl md:text-5xl">
            <span className="relative inline-block -rotate-2">
              Öne Çıkanlar
              <Scribble variant="underline" className="scribble-scroll absolute -bottom-2 left-0 h-3 w-full" />
            </span>
          </h1>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => setUserPaused((value) => !value)}
              aria-label={userPaused ? "Otomatik kaydırmayı başlat" : "Otomatik kaydırmayı durdur"}
              className="grid size-10 place-items-center rounded-full border-2 border-ink bg-white hover:bg-brand-100"
            >
              {userPaused ? <Play size={18} aria-hidden /> : <Pause size={18} aria-hidden />}
            </button>
            <button
              type="button"
              onClick={() => advance(-1)}
              aria-label="Önceki ürünler"
              className="hidden size-10 place-items-center rounded-full border-2 border-ink bg-white hover:bg-brand-100 md:grid"
            >
              <ChevronLeft size={20} aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => advance(1)}
              aria-label="Sonraki ürünler"
              className="hidden size-10 place-items-center rounded-full border-2 border-ink bg-white hover:bg-brand-100 md:grid"
            >
              <ChevronRight size={20} aria-hidden />
            </button>
          </div>
        </div>

        <p className="mt-1.5 max-w-xl text-xs font-medium text-ink/80 sm:text-sm">
          Bu haftanın seçkisi. Sepete ekle, mağazadan teslim al.{" "}
          <Link href="/kategori/kirtasiye" className="inline-flex items-center gap-1 font-extrabold underline underline-offset-2">
            Tüm ürünler <ArrowRight size={16} aria-hidden />
          </Link>
        </p>

        {/* Kategori düğmeleri: el yazısıyla yazılmış etiketler. Seçili olan koyu zeminde, hafif eğik durur. Dar ekranda
            yatay kayar; kayılacak yönü kenarda animasyonlu bir ok gösterir (tıklanınca o yöne kaydırır). */}
        {tabs.length > 1 && (
          <div className="relative -mx-2.5 mt-2 sm:mx-0">
            <div
              ref={tabList}
              role="tablist"
              aria-label="Kategori seç"
              onScroll={updateEdges}
              className="flex gap-1.5 overflow-x-auto px-2.5 pb-1 [scrollbar-width:none] sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden"
            >
              {tabs.map((tab, index) => {
                const selected = index === active;
                return (
                  <button
                    key={tab.id}
                    ref={(element) => {
                      tabButtons.current[index] = element;
                    }}
                    type="button"
                    role="tab"
                    id={`vitrin-sekme-${tab.id}`}
                    aria-selected={selected}
                    aria-controls={`vitrin-panel-${tab.id}`}
                    tabIndex={selected ? 0 : -1}
                    onClick={() => select(index)}
                    onKeyDown={(event) => onTabKeyDown(event, index)}
                    className={`min-h-10 shrink-0 whitespace-nowrap rounded-full border-2 border-ink px-3.5 font-hand text-xl font-bold leading-none transition-transform duration-200 sm:text-2xl ${
                      selected ? "-rotate-2 bg-ink text-brand-500 shadow-md" : "bg-white/60 hover:-rotate-1 hover:bg-white"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
            {edges.left && (
              <button
                type="button"
                onClick={() => scrollTabs(-1)}
                aria-label="Önceki kategoriler"
                className="absolute inset-y-0 left-0 flex w-12 items-center justify-start bg-gradient-to-r from-brand-500 via-brand-500/80 to-transparent pb-1 pl-1.5 sm:hidden"
              >
                <ChevronLeft size={26} strokeWidth={3} aria-hidden className="animate-nudge-left" />
              </button>
            )}
            {edges.right && (
              <button
                type="button"
                onClick={() => scrollTabs(1)}
                aria-label="Sonraki kategoriler"
                className="absolute inset-y-0 right-0 flex w-12 items-center justify-end bg-gradient-to-l from-brand-500 via-brand-500/80 to-transparent pb-1 pr-1.5 sm:hidden"
              >
                <ChevronRight size={26} strokeWidth={3} aria-hidden className="animate-nudge-right" />
              </button>
            )}
          </div>
        )}
        {tabs.map((tab, index) => (
          <div
            key={tab.id}
            role="tabpanel"
            id={`vitrin-panel-${tab.id}`}
            aria-labelledby={`vitrin-sekme-${tab.id}`}
            hidden={index !== active}
          >
            {/* Kenarlara kadar uzar (bandın iç boşluğu geri alınır). scroll-pl: kartlar bandın iç boşluğuna hizalı durur. */}
            <div
              ref={(element) => {
                strips.current[index] = element;
              }}
              className="-mx-2.5 mt-2 flex snap-x snap-mandatory scroll-pl-2.5 gap-2.5 overflow-x-auto overscroll-x-contain px-2.5 pb-2.5 pt-1 [scrollbar-width:none] sm:-mx-4 sm:scroll-pl-4 sm:gap-3 sm:px-4 md:-mx-5 md:scroll-pl-5 md:gap-4 md:px-5 [&::-webkit-scrollbar]:hidden"
            >
              {tab.content}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
