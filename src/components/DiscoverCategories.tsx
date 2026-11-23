import Link from "next/link";
import { ArrowRight } from "lucide-react";
import ProductVisual from "@/components/ProductVisual";
import {
  categoryIcons,
  categoryPatterns,
  categoryTones,
  fallbackCategoryIcon,
  fallbackCategoryPattern,
  fallbackCategoryTone,
} from "@/lib/category-icons";

export interface DiscoverCategory {
  slug: string;
  name: string;
  subcategories: string[];
  image: { url: string };
}

// Ana sayfada rakam bandının altındaki bölüm: ana kategoriler, her biri kendi rengi ve kâğıt dokusuyla (lib/category-icons).
// Ürün fotoğrafları beyaz zeminli olduğu için renkli kartın üstünde hafif eğik bir beyaz "fotoğraf kâğıdı" içinde durur.
// Renkler sabittir, koyu temada da aynı görünür. Görsel süs amaçlıdır (alt boş); bağlantının adı kategori adıdır.
export default function DiscoverCategories({ categories }: { categories: DiscoverCategory[] }) {
  if (categories.length === 0) return null;

  return (
    <section className="container-page mt-8 md:mt-12" aria-labelledby="kesfet">
      <div className="mb-5 md:mb-7">
        <h2 id="kesfet" className="text-2xl font-extrabold tracking-tight md:text-3xl">
          Keşfet
        </h2>
        <p className="mt-1 text-sm text-neutral-600 md:text-base">Aradığınız ürüne kategoriler üzerinden kolayca ulaşın.</p>
      </div>
      <ul className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        {categories.map((category, index) => {
          const Icon = categoryIcons[category.slug] ?? fallbackCategoryIcon;
          const tone = categoryTones[category.slug] ?? fallbackCategoryTone;
          const pattern = categoryPatterns[category.slug] ?? fallbackCategoryPattern;
          return (
            <li key={category.slug} className="min-w-0">
              <Link
                href={`/kategori/${category.slug}`}
                className={`group flex h-full flex-col overflow-hidden rounded-2xl p-3 shadow-sm transition-shadow hover:shadow-lg sm:p-4 ${tone} ${pattern} [--pattern-color:color-mix(in_srgb,currentColor_16%,transparent)]`}
              >
                <span
                  className={`block rounded-lg bg-white p-1.5 shadow-md transition-transform duration-300 motion-safe:group-hover:-translate-y-0.5 motion-safe:group-hover:rotate-0 motion-safe:group-hover:scale-[1.02] ${
                    index % 2 === 0 ? "-rotate-1" : "rotate-1"
                  }`}
                >
                  <ProductVisual name={category.name} rootCategorySlug={category.slug} image={{ url: category.image.url, alt: "" }} sizes="(min-width: 1024px) 22vw, 45vw" />
                </span>
                <span className="mt-3.5 flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <Icon size={18} aria-hidden className="hidden shrink-0 sm:block" />
                    <span className="min-w-0 text-sm font-extrabold leading-tight sm:text-base">{category.name}</span>
                  </span>
                  <ArrowRight size={18} aria-hidden className="shrink-0 transition-transform motion-safe:group-hover:translate-x-1" />
                </span>
                {category.subcategories.length > 0 && <span className="mt-1 hidden text-xs font-medium leading-snug sm:block">{category.subcategories.join(" · ")}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
