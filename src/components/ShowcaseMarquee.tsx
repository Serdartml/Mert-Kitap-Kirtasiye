import Link from "next/link";
import { Award, ShieldCheck, Store, type LucideIcon } from "lucide-react";
import Marquee from "./Marquee";
import { categoryIcons, fallbackCategoryIcon } from "@/lib/category-icons";
import type { getNavCategories } from "@/lib/catalog";
import { site } from "@/lib/site";

type NavCategories = Awaited<ReturnType<typeof getNavCategories>>;

// Kategori kartları marka renklerinde döner: sarı, beyaz, siyah. Sarı ve siyah her temada aynı kalır.
// Hepsinde 2 px kenarlık var (renksiz olanlarda saydam) ki kartların boyu eşit olsun; koyu temada siyah
// kart zeminle karışmasın diye ince açık bir kenar alır.
const tones = [
  { card: "theme-fixed border-2 border-transparent bg-brand-500 text-ink", icon: "bg-ink text-brand-500", sub: "text-ink/70" },
  { card: "border-2 border-ink bg-raised text-fg dark:border-neutral-300", icon: "bg-brand-500 text-ink", sub: "text-neutral-500" },
  { card: "border-2 border-white/20 bg-ink text-white", icon: "bg-brand-500 text-ink", sub: "text-white/70" },
];

// Kategori kartları arasına serpiştirilen kısa güven mesajları.
const messages: { icon: LucideIcon; text: string; href?: string }[] = [
  { icon: Award, text: "20 yıllık tecrübe" },
  { icon: ShieldCheck, text: "Orijinal ürün garantisi" },
  { icon: Store, text: "Bornova'da mağaza · haftanın 7 günü açık" },
  { icon: Store, text: `Bizi arayın: ${site.phone}`, href: site.phoneHref },
];

const MAX_CATEGORY_CARDS = 14;
// Bir kart ortalama bu kadar saniyede ekrandan geçer (kayma hızı sabit kalır).
const SECONDS_PER_ITEM = 5.5;

// Ana sayfadaki sürekli kayan vitrin: kategoriler ve mağaza mesajları. Görsel gerektirmez; ürün
// görselleri gelince ürün kartlarıyla aynı şeride eklenebilir.
export default function ShowcaseMarquee({ categories }: { categories: NavCategories }) {
  const cards = categories
    .flatMap((root) => [
      { id: root.id, slug: root.slug, name: root.name, sub: "Tüm ürünler", rootSlug: root.slug },
      ...root.children.map((child) => ({ id: child.id, slug: child.slug, name: child.name, sub: root.name, rootSlug: root.slug })),
    ])
    .slice(0, MAX_CATEGORY_CARDS);

  if (cards.length === 0) return null;

  const items: React.ReactNode[] = [];
  let messageIndex = 0;
  cards.forEach((card, index) => {
    const tone = tones[index % tones.length];
    const Icon = categoryIcons[card.rootSlug] ?? fallbackCategoryIcon;
    items.push(
      <Link
        key={card.id}
        href={`/kategori/${card.slug}`}
        className={`group/card flex w-56 shrink-0 items-center gap-3 rounded-2xl p-3 shadow-sm transition-transform hover:-translate-y-0.5 sm:w-64 sm:p-4 ${tone.card}`}
      >
        <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${tone.icon}`}>
          <Icon size={22} aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-extrabold sm:text-base">{card.name}</span>
          <span className={`block truncate text-xs font-semibold ${tone.sub}`}>{card.sub}</span>
        </span>
      </Link>,
    );

    // Her üç kategori kartında bir mesaj.
    if ((index + 1) % 3 === 0) {
      const message = messages[messageIndex++ % messages.length];
      const content = (
        <>
          <message.icon size={18} aria-hidden className="shrink-0" />
          <span className="whitespace-nowrap text-sm font-extrabold">{message.text}</span>
        </>
      );
      const className =
        "flex shrink-0 items-center gap-2 rounded-full border-2 border-dashed border-neutral-300 bg-surface px-4 py-2.5 text-fg";
      items.push(
        message.href ? (
          <a key={`m${index}`} href={message.href} className={`${className} hover:border-ink dark:hover:border-neutral-100`}>
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

  return (
    <Marquee label="Kategoriler ve mağaza bilgileri" duration={Math.round(items.length * SECONDS_PER_ITEM)}>
      {items}
    </Marquee>
  );
}
