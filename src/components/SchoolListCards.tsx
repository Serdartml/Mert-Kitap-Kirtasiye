import Link from "next/link";
import { ArrowRight, BookOpen, Calculator, GraduationCap, PenLine, type LucideIcon } from "lucide-react";
import { schoolLists } from "@/lib/school-lists";

const icons: Record<string, LucideIcon> = {
  ilkokul: PenLine,
  ortaokul: BookOpen,
  lise: Calculator,
  universite: GraduationCap,
};

// Kartlar marka renklerinde döner: sarı, beyaz, siyah, beyaz. Sarı ve siyah her temada aynı kalır.
const tones = [
  { card: "theme-fixed border-2 border-transparent bg-brand-500 text-ink", icon: "bg-ink text-brand-500", sub: "text-ink/70" },
  { card: "border-2 border-ink bg-raised text-fg dark:border-neutral-300", icon: "bg-brand-500 text-ink", sub: "text-neutral-500" },
  { card: "border-2 border-white/20 bg-ink text-white", icon: "bg-brand-500 text-ink", sub: "text-white/70" },
  { card: "border-2 border-ink bg-raised text-fg dark:border-neutral-300", icon: "bg-brand-500 text-ink", sub: "text-neutral-500" },
];

// Okula dönüş listelerine giden dört kart (ana sayfa ve /okul-listeleri).
export default function SchoolListCards() {
  return (
    <ul className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4 lg:gap-4">
      {schoolLists.map((list, index) => {
        const tone = tones[index % tones.length];
        const Icon = icons[list.slug] ?? PenLine;
        return (
          <li key={list.slug} className="min-w-0">
            <Link
              href={`/okul-listeleri/${list.slug}`}
              className={`group/card flex h-full flex-col gap-3 rounded-2xl p-3.5 shadow-sm transition-transform hover:-translate-y-0.5 sm:p-5 ${tone.card}`}
            >
              <span className={`grid size-11 place-items-center rounded-xl sm:size-12 ${tone.icon}`}>
                <Icon size={22} aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-base font-extrabold leading-tight sm:text-lg">{list.title}</span>
                <span className={`mt-0.5 block text-xs font-bold ${tone.sub}`}>{list.badge}</span>
                <span className={`mt-1.5 hidden text-xs leading-snug sm:block ${tone.sub}`}>{list.subtitle}</span>
              </span>
              <span className="mt-auto flex items-center gap-1 pt-1 text-sm font-extrabold">
                Listeyi aç <ArrowRight size={16} aria-hidden className="transition-transform group-hover/card:translate-x-0.5" />
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
