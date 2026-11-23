import Link from "next/link";
import { ArrowRight } from "lucide-react";
import ProductVisual from "@/components/ProductVisual";

export interface DiscoverCategory {
  slug: string;
  name: string;
  subcategories: string[];
  image: { url: string };
}

// Ana sayfanın alt bölümü: ana kategoriler, her biri kendi vitrin ürününün görseliyle. Görsel süs amaçlıdır (alt boş);
// bağlantının adı kategori adıdır.
export default function DiscoverCategories({ categories }: { categories: DiscoverCategory[] }) {
  if (categories.length === 0) return null;

  return (
    <section className="container-page mt-12 md:mt-16" aria-labelledby="kesfet">
      <div className="mb-5 md:mb-7">
        <h2 id="kesfet" className="text-2xl font-extrabold tracking-tight md:text-3xl">
          Keşfet
        </h2>
        <p className="mt-1 text-sm text-neutral-600 md:text-base">Aradığınız ürüne kategoriler üzerinden kolayca ulaşın.</p>
      </div>
      <ul className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        {categories.map((category) => (
          <li key={category.slug} className="min-w-0">
            <Link
              href={`/kategori/${category.slug}`}
              className="group flex h-full flex-col rounded-xl border border-neutral-200 bg-raised p-2.5 transition-colors hover:border-fg focus-visible:border-fg sm:p-3"
            >
              <ProductVisual
                name={category.name}
                rootCategorySlug={category.slug}
                image={{ url: category.image.url, alt: "" }}
                sizes="(min-width: 1024px) 22vw, 45vw"
              />
              <span className="mt-3 flex items-center justify-between gap-2 px-0.5">
                <span className="min-w-0 text-sm font-extrabold leading-tight sm:text-base">{category.name}</span>
                <ArrowRight size={18} aria-hidden className="shrink-0 transition-transform group-hover:translate-x-0.5" />
              </span>
              {category.subcategories.length > 0 && (
                <span className="mt-1 hidden px-0.5 pb-0.5 text-xs leading-snug text-neutral-500 sm:block">{category.subcategories.join(" · ")}</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
