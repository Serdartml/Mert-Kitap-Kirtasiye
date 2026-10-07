"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import CategoryArt from "./CategoryArt";
import HeroArt from "./HeroArt";
import { site } from "@/lib/site";

type Tone = "yellow" | "dark" | "paper";

interface Slide {
  // Alttaki sekmede görünen kısa ad.
  tab: string;
  tone: Tone;
  // Zemindeki kâğıt dokusu (globals.css).
  pattern: string;
  kicker: string;
  title: [string, string];
  text: string;
  cta: { href: string; label: string };
  secondary?: { href: string; label: string };
  // Çizimin köşesine yapıştırılan etiket.
  sticker: string;
  art: ReactNode;
}

const slides: Slide[] = [
  {
    tab: "Okul",
    tone: "yellow",
    pattern: "pattern-dots",
    kicker: "Okula Dönüş Fırsatları",
    title: ["Gelecek", "burada başlar"],
    text: site.description,
    cta: { href: "/kategori/kirtasiye", label: "Alışverişe Başla" },
    secondary: { href: "/hakkimizda", label: "Hakkımızda" },
    sticker: "Haftanın 7 günü açık",
    art: <HeroArt className="w-full" />,
  },
  {
    tab: "Sınav",
    tone: "dark",
    pattern: "pattern-grid",
    kicker: "Hazırlık Kitapları",
    title: ["Hedefe", "adım adım"],
    text: "Sınavlara hazırlık ve okula yardımcı kaynaklar, soru bankaları ve denemeler.",
    cta: { href: "/kategori/hazirlik-kitaplari", label: "Kaynakları Keşfet" },
    sticker: "Soru bankası · Deneme",
    art: <CategoryArt rootSlug="hazirlik-kitaplari" className="w-full" />,
  },
  {
    tab: "Sanat",
    tone: "paper",
    pattern: "pattern-blobs",
    kicker: "Sanat ve Hobi",
    title: ["Hayal et,", "boya, çiz"],
    text: "Boyalar, fırçalar ve yaratıcı hobi malzemeleriyle atölyenizi kurun.",
    cta: { href: "/kategori/sanatsal", label: "Malzemelere Göz At" },
    sticker: "Boya · Fırça · Tuval",
    art: <CategoryArt rootSlug="sanatsal" className="w-full" />,
  },
  {
    tab: "Kitap",
    tone: "yellow",
    pattern: "pattern-lines",
    kicker: "Kültür Kitapları",
    title: ["Bir sayfa", "daha"],
    text: "Roman, klasikler, çocuk kitapları ve daha fazlası raflarımızda.",
    cta: { href: "/kategori/kultur-kitaplari", label: "Raflara Göz At" },
    sticker: "Roman · Klasik · Çocuk",
    art: <CategoryArt rootSlug="kultur-kitaplari" className="w-full" />,
  },
];

// Her zemin için renkler. Çizimler siyah çizgi + beyaz dolgu olduğundan koyu ve beyaz zeminde sarı bir
// dairenin, sarı zeminde yarı saydam beyaz bir dairenin üstünde durur.
const tones: Record<Tone, { slide: string; pattern: string; kicker: string; highlight: string; text: string; cta: string; secondary: string; disc: string; sticker: string }> = {
  yellow: {
    slide: "bg-brand-500",
    pattern: "",
    kicker: "bg-ink text-brand-500",
    highlight: "marker marker-light",
    text: "text-ink/80",
    cta: "btn-dark",
    secondary: "border border-ink/30 hover:border-ink",
    disc: "bg-white/40",
    sticker: "bg-ink text-brand-500",
  },
  dark: {
    slide: "bg-ink text-white",
    pattern: "[--pattern-color:rgb(255_255_255/0.09)]",
    kicker: "bg-brand-500 text-ink",
    highlight: "text-brand-500",
    text: "text-neutral-300",
    cta: "btn-primary",
    secondary: "border border-white/30 hover:border-white",
    disc: "bg-brand-500",
    sticker: "bg-white text-ink",
  },
  paper: {
    // Çerçeve ::after ile en üste çizilir; yoksa sarı daire köşede çerçevenin üstüne biner.
    slide:
      "bg-white after:pointer-events-none after:absolute after:inset-0 after:z-20 after:rounded-[inherit] after:ring-2 after:ring-inset after:ring-ink",
    pattern: "[--pattern-color:rgb(17_17_17/0.06)]",
    kicker: "bg-ink text-brand-500",
    highlight: "marker",
    text: "text-ink/80",
    cta: "btn-primary",
    secondary: "border border-ink/30 hover:border-ink",
    disc: "bg-brand-500",
    sticker: "bg-ink text-brand-500",
  },
};

// Ana sayfa vitrini: yana kayan büyük sahneler. Kaydırma tarayıcının kendi scroll-snap'i ile yapılır
// (telefonda parmakla çalışır); sekmeler ve otomatik geçiş aynı şeridi kaydırır.
export default function HeroShowcase() {
  const track = useRef<HTMLDivElement>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const section = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  // Otomatik geçiş, parmak vitrinin üstündeyken ve vitrin ekranda değilken bekler.
  const [touching, setTouching] = useState(false);
  const [inView, setInView] = useState(true);
  const paused = touching || !inView;

  useEffect(() => () => clearTimeout(settleTimer.current), []);

  useEffect(() => {
    if (!section.current) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.25 });
    observer.observe(section.current);
    return () => observer.disconnect();
  }, []);

  const goTo = (index: number) => {
    const el = track.current;
    if (!el) return;
    setActive(index);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: index * el.clientWidth, behavior: reduceMotion ? "auto" : "smooth" });
  };

  // Kaydırma durduktan sonra hangi sahnede kalındığına bakılır; aradan geçilen sahneler sekmeyi oynatmaz.
  const onScroll = () => {
    clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      const el = track.current;
      if (el) setActive(Math.round(el.scrollLeft / el.clientWidth));
    }, 120);
  };

  return (
    <section
      ref={section}
      aria-roledescription="carousel"
      aria-label="Vitrin"
      onTouchStart={() => setTouching(true)}
      onTouchEnd={() => setTouching(false)}
      onTouchCancel={() => setTouching(false)}
      className="group/vitrin container-page mt-4 md:mt-5"
    >
      <div
        ref={track}
        onScroll={onScroll}
        className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-2xl rounded-bl-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((slide, index) => {
          const tone = tones[slide.tone];
          const Heading = index === 0 ? "h1" : "h2";
          return (
            <div
              key={slide.tab}
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} / ${slides.length}: ${slide.kicker}`}
              className={`theme-fixed relative flex min-h-[24rem] w-full shrink-0 snap-start snap-always flex-col overflow-hidden rounded-2xl rounded-bl-none p-5 pb-40 min-[375px]:min-h-[28rem] min-[375px]:pb-48 sm:min-h-[24rem] sm:justify-center sm:p-9 md:min-h-[30rem] md:p-12 lg:px-16 ${tone.slide}`}
            >
              <div aria-hidden className={`absolute inset-0 ${slide.pattern} ${tone.pattern}`} />

              <div className="relative z-10 sm:max-w-[52%]">
                {/* Etiket hafif eğik: yapıştırılmış bir bant gibi. */}
                <p className={`inline-block -rotate-2 rounded-sm px-3 py-1 text-[11px] font-bold uppercase tracking-wider shadow-md sm:text-xs ${tone.kicker}`}>
                  {slide.kicker}
                </p>
                <Heading className="mt-4 text-[2rem] font-extrabold min-[375px]:text-[2.25rem] leading-[1.05] tracking-tight sm:text-5xl md:mt-5 md:text-6xl lg:text-7xl">
                  {slide.title[0]}
                  <br />
                  <span className={tone.highlight}>{slide.title[1]}</span>
                </Heading>
                <p className={`mt-3 max-w-md text-sm font-medium sm:text-base md:mt-5 md:text-lg ${tone.text}`}>{slide.text}</p>
                <div className="mt-5 flex flex-wrap gap-2.5 md:mt-7 md:gap-3">
                  <Link href={slide.cta.href} className={`btn ${tone.cta}`}>
                    {slide.cta.label} <ArrowRight size={18} />
                  </Link>
                  {slide.secondary && (
                    // Mobilde gizli: dar ekranda ikinci satıra düşüp vitrini uzatıyor; bağlantı üst şeritte zaten var.
                    <Link href={slide.secondary.href} className={`btn hidden sm:inline-flex ${tone.secondary}`}>
                      {slide.secondary.label}
                    </Link>
                  )}
                </div>
              </div>

              {/* Çizim: bir dairenin üstünde süzülür; mobilde sağ alt köşeden taşar. */}
              <div
                aria-hidden
                className={`pointer-events-none absolute -bottom-8 -right-6 grid size-44 place-items-center rounded-full min-[375px]:-bottom-10 min-[375px]:-right-8 min-[375px]:size-56 sm:bottom-auto sm:right-6 sm:top-1/2 sm:size-64 sm:-translate-y-1/2 md:right-10 md:size-80 lg:right-20 lg:size-[25rem] ${tone.disc}`}
              >
                <div className="w-[88%] animate-float">{slide.art}</div>
                <span
                  className={`absolute left-0 top-4 -rotate-12 min-[375px]:top-6 whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-extrabold shadow-md sm:top-8 md:px-4 md:py-2 md:text-sm lg:top-14 ${tone.sticker}`}
                >
                  {slide.sticker}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sekmeler: vitrinden sarkan klasör ayraçları. Etkin sekmedeki çizgi dolunca sıradaki sahneye geçilir. */}
      <ul className="flex gap-1">
        {slides.map((slide, index) => {
          const current = index === active;
          return (
            <li key={slide.tab} className="flex-1 sm:flex-none">
              <button
                type="button"
                onClick={() => goTo(index)}
                aria-current={current ? "true" : undefined}
                aria-label={`${slide.kicker} sahnesine git`}
                // Mobilde sekmeler satırı doldurur ve parmakla rahat basılacak kadar yüksektir (44px).
                className={`relative block w-full overflow-hidden rounded-b-xl border border-t-0 px-2 text-sm font-bold transition-[padding,background-color] sm:w-auto sm:px-5 ${
                  current
                    ? "border-brand-500 bg-brand-500 pb-3 pt-4 text-ink sm:pb-2.5 sm:pt-3.5"
                    : "border-neutral-200 bg-raised py-3 hover:bg-neutral-100 sm:py-2 sm:hover:pt-3"
                }`}
              >
                {slide.tab}
                {current && (
                  // Hareket azaltma açıkken animasyon uygulanmaz; otomatik geçiş de böylece kapanır.
                  // Duraklatma sınıfları "!" ile yazılır: animate-* kısayolu play-state değerini de sıfırlar.
                  <span
                    key={active}
                    aria-hidden
                    onAnimationEnd={() => goTo((active + 1) % slides.length)}
                    className={`absolute inset-x-0 bottom-0 h-1 origin-left bg-ink motion-safe:animate-vitrin group-focus-within/vitrin:[animation-play-state:paused]! group-hover/vitrin:[animation-play-state:paused]! ${
                      paused ? "[animation-play-state:paused]!" : ""
                    }`}
                  />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
