import Link from "next/link";
import { Award, Clock, Gift, ShieldCheck, ShoppingBag, Sparkles, Store, Truck, type LucideIcon } from "lucide-react";
import Marquee, { type MarqueeRowData } from "./Marquee";
import { categoryIcons, fallbackCategoryIcon } from "@/lib/category-icons";
import type { getNavCategories } from "@/lib/catalog";
import { site, stats } from "@/lib/site";

type NavCategories = Awaited<ReturnType<typeof getNavCategories>>;

// Kategori kartları kendi kategorilerinin renginde (data-cat, globals.css "Kategori renkleri") ve üç görünümde döner:
// dolu, siyah ve açık. Hepsi kalın çerçeveli ve sert gölgelidir: sade değil, "kendinden emin" durur. Çerçeve ve gölge
// siyahtır (siyah kartta kategori rengi); her iki temada aynıdır. Koyu temada gölgeler görünsün diye şeridin zemini tam siyah değil gri yapılır (Marquee.tsx).
const tones = [
  { card: "border-ink bg-brand-500 text-ink shadow-[4px_4px_0_0_#111]", icon: "bg-ink text-brand-500", sub: "text-ink/70" },
  { card: "border-brand-500 bg-ink text-white shadow-[4px_4px_0_0_var(--color-brand-500)]", icon: "bg-brand-500 text-ink", sub: "text-white/70" },
  { card: "border-ink bg-brand-100 text-ink shadow-[4px_4px_0_0_#111]", icon: "bg-brand-500 text-ink", sub: "text-ink/70" },
];

// Kategori kartları arasına serpiştirilen kısa mesajlar (satırlara farklı noktalardan başlayarak dağıtılır).
const messages: { icon: LucideIcon; text: string; href?: string }[] = [
  { icon: Award, text: `${stats[0].value} yıllık tecrübe` },
  { icon: ShieldCheck, text: "Orijinal ürün garantisi" },
  { icon: Store, text: `${site.address.district}'da mağaza · her gün açık` },
  { icon: Truck, text: "Mağazadan teslim, ödeme mağazada" },
  { icon: Gift, text: "Hediyelik ürünlerde özel seçki" },
  { icon: ShoppingBag, text: "10.000'den fazla çeşit ürün" },
  { icon: Sparkles, text: "Okula dönüş listeleri tek tuşla sepette" },
  { icon: Clock, text: "Sipariş verdiğiniz ürün sizin için ayrılır" },
  { icon: Store, text: `Bizi arayın: ${site.phone}`, href: site.phoneHref },
];

const ROW_DIRECTIONS: MarqueeRowData["direction"][] = ["right", "left", "right"];
// Her satırın hızı biraz farklıdır (paralaks); bir kart ortalama bu kadar saniyede ekrandan geçer.
const SECONDS_PER_ITEM = [5.5, 4.8, 6.2];
// Bir satırdaki her N kategori kartından sonra bir mesaj kartı gelir.
const MESSAGE_EVERY = 3;
// Satır başına en az bu kadar kategori kartı olsun (kategori azsa baştan tekrarlanır).
const MIN_CARDS_PER_ROW = 8;

// Ana sayfadaki sürekli kayan vitrin: üç sıra, kategori kartları ve mağaza mesajları. Üstteki soldan sağa, ortadaki
// sağdan sola, alttaki yine soldan sağa kayar; dokunulan / üstüne gelinen satır durur, bırakılınca devam eder.
export default function ShowcaseMarquee({ categories }: { categories: NavCategories }) {
  const cards = categories.flatMap((root) => [
    { id: root.id, slug: root.slug, name: root.name, sub: "Tüm ürünler", rootSlug: root.slug },
    ...root.children.map((child) => ({ id: child.id, slug: child.slug, name: child.name, sub: root.name, rootSlug: root.slug })),
  ]);

  if (cards.length === 0) return null;

  const rows: MarqueeRowData[] = ROW_DIRECTIONS.map((direction, rowIndex) => {
    // Kartlar satırlara dağıtılır (0,3,6.. / 1,4,7.. / 2,5,8..); az kategori varsa baştan tekrarlanır.
    let rowCards = cards.filter((_, index) => index % ROW_DIRECTIONS.length === rowIndex);
    if (rowCards.length === 0) rowCards = cards;
    while (rowCards.length < MIN_CARDS_PER_ROW) rowCards = [...rowCards, ...rowCards];

    const items: React.ReactNode[] = [];
    rowCards.forEach((card, index) => {
      const tone = tones[(index + rowIndex) % tones.length];
      const Icon = categoryIcons[card.rootSlug] ?? fallbackCategoryIcon;
      items.push(
        <Link
          key={`c${index}-${card.id}`}
          href={`/kategori/${card.slug}`}
          data-cat={card.rootSlug}
          className={`group/card theme-fixed flex w-56 shrink-0 items-center gap-3 rounded-2xl border-2 p-3 transition-all duration-200 hover:-translate-x-0.5 hover:-translate-y-1 hover:rotate-[-1deg] sm:w-64 sm:p-4 ${tone.card}`}
        >
          <span className={`grid size-12 shrink-0 place-items-center rounded-xl transition-transform duration-200 group-hover/card:rotate-6 group-hover/card:scale-110 ${tone.icon}`}>
            <Icon size={24} strokeWidth={2.25} aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-base font-extrabold leading-tight sm:text-lg">{card.name}</span>
            <span className={`block truncate text-xs font-semibold ${tone.sub}`}>{card.sub}</span>
          </span>
        </Link>,
      );

      if ((index + 1) % MESSAGE_EVERY === 0) {
        const message = messages[(Math.floor(index / MESSAGE_EVERY) * 3 + rowIndex * 4) % messages.length];
        const content = (
          <>
            <message.icon size={18} aria-hidden className="shrink-0" />
            <span className="whitespace-nowrap text-sm font-extrabold">{message.text}</span>
          </>
        );
        const className =
          "theme-fixed flex shrink-0 items-center gap-2 rounded-full border-2 border-ink bg-white px-4 py-2.5 text-ink shadow-[3px_3px_0_0_#111]";
        items.push(
          message.href ? (
            <a key={`m${index}`} href={message.href} className={`${className} transition-transform hover:-translate-y-0.5`}>
              {content}
            </a>
          ) : (
            <span key={`m${index}`} className={className}>
              {content}
            </span>
          ),
        );
      }
    });

    return { items, direction, duration: Math.round(items.length * SECONDS_PER_ITEM[rowIndex]) };
  });

  return <Marquee label="Kategoriler ve mağaza bilgileri" rows={rows} />;
}
