import Link from "next/link";
import { ArrowRight, MapPin, Phone } from "lucide-react";
import HeroShowcase from "@/components/HeroShowcase";
import ProductGrid from "@/components/ProductGrid";
import Scribble from "@/components/Scribble";
import ShowcaseMarquee from "@/components/ShowcaseMarquee";
import { getDiscountedProducts, getFeaturedProducts, getNavCategories, getNewestProducts, type ProductCardData } from "@/lib/catalog";
import { site, stats } from "@/lib/site";

// note: başlığın yanına el yazısıyla düşülen kısa not; ok başlığı gösterir.
function ProductSection({ title, href, note, products }: { title: string; href?: string; note?: string; products: ProductCardData[] }) {
  if (products.length === 0) return null;

  return (
    <section className="container-page mt-8 md:mt-12">
      <div className="mb-4 flex items-end justify-between gap-4 md:mb-5">
        <h2 className="flex items-end text-xl font-extrabold md:text-2xl">
          <span className="marker">{title}</span>
          {note && (
            <span aria-hidden className="ml-2 flex -rotate-3 items-start gap-0.5 font-hand text-xl font-bold leading-none text-neutral-500 md:ml-3 md:text-2xl">
              <Scribble variant="arrow" className="scribble-scroll mt-1 h-6 w-8 shrink-0 md:h-7 md:w-10" />
              {note}
            </span>
          )}
        </h2>
        {href && (
          <Link href={href} className="flex items-center gap-1 text-sm font-bold hover:underline">
            Tümünü gör <ArrowRight size={16} />
          </Link>
        )}
      </div>
      <ProductGrid products={products} />
    </section>
  );
}

export default async function HomePage() {
  const [categories, featured, discounted, newest] = await Promise.all([
    getNavCategories(),
    getFeaturedProducts(8),
    getDiscountedProducts(4),
    getNewestProducts(8),
  ]);

  return (
    <>
      <HeroShowcase />

      {/* Sürekli kayan vitrin: kategoriler ve mağaza mesajları */}
      <ShowcaseMarquee categories={categories} />

      {/* Rakam bandı: siyah zemin, sarı büyük rakamlar, el yazısı açıklamalar. Mobilde 2x2. */}
      <section className="container-page mt-3 md:mt-4">
        <dl className="theme-fixed pattern-grid grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/15 bg-[#2e2e2e] [--pattern-color:rgb(255_255_255/0.06)] lg:grid-cols-4">
          {stats.map((stat) => (
            // Etiket (dt) okuma sırasında önce gelir, görsel olarak rakamın altında durur.
            <div key={stat.label} className="flex min-w-0 flex-col-reverse bg-ink px-4 py-5 text-center sm:py-7">
              <dt className="mt-1.5 font-hand text-xl leading-none text-white/80 sm:mt-2 sm:text-2xl">{stat.label}</dt>
              <dd className="truncate text-3xl font-extrabold leading-none tracking-tight text-brand-500 sm:text-5xl">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <ProductSection title="Öne Çıkanlar" products={featured} />

      {/* Kampanya bandı */}
      {discounted.length > 0 && (
        <section className="mt-8 bg-ink py-7 md:mt-12 md:py-10">
          <div className="container-page">
            <h2 className="mb-4 text-xl font-extrabold text-white md:mb-5 md:text-2xl">
              <span className="relative text-brand-500">
                İndirimli
                <Scribble variant="underline" className="scribble-scroll absolute -bottom-2 left-0 h-2.5 w-full" />
              </span>{" "}
              ürünler
            </h2>
            <ProductGrid products={discounted} />
          </div>
        </section>
      )}

      <ProductSection title="Yeni Gelenler" note="taze geldi!" products={newest} />

      {/* Mağaza */}
      <section className="container-page mt-8 md:mt-12">
        <div className="theme-fixed pattern-dots flex flex-col gap-5 rounded-2xl bg-brand-500 p-5 sm:p-7 md:flex-row md:items-center md:justify-between md:p-10">
          <div className="min-w-0">
            <h2 className="text-xl font-extrabold sm:text-2xl md:text-3xl">Mağazamıza bekleriz</h2>
            <p className="mt-2 flex items-start gap-2 text-sm font-medium sm:text-base">
              <MapPin size={20} className="mt-0.5 shrink-0" /> {site.address.full}
            </p>
            <ul className="mt-2 text-sm font-medium text-ink/80 sm:flex sm:gap-4">
              {site.hours.map((row) => (
                <li key={row.days}>
                  {row.days}: {row.time}
                </li>
              ))}
            </ul>
          </div>
          <div className="grid gap-2.5 sm:flex sm:flex-wrap sm:gap-3">
            <a href={site.mapsUrl} target="_blank" rel="noopener noreferrer" className="btn btn-dark">
              Yol Tarifi Al
            </a>
            <a href={site.phoneHref} className="btn border border-ink/30 hover:border-ink">
              <Phone size={16} /> {site.phone}
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
