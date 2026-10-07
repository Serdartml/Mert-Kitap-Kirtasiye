import Link from "next/link";
import { ArrowRight, Award, MapPin, Phone, ShieldCheck, Store } from "lucide-react";
import HeroShowcase from "@/components/HeroShowcase";
import ProductGrid from "@/components/ProductGrid";
import Scribble from "@/components/Scribble";
import { getDiscountedProducts, getFeaturedProducts, getNavCategories, getNewestProducts, type ProductCardData } from "@/lib/catalog";
import { categoryIcons, fallbackCategoryIcon } from "@/lib/category-icons";
import { site } from "@/lib/site";

const trustItems = [
  { icon: Award, title: "20 yıllık tecrübe", text: "Eğitimde yol arkadaşınız" },
  { icon: ShieldCheck, title: "Orijinal ürün garantisi", text: "Özenle seçilmiş ürünler" },
  { icon: Store, title: "Bornova'da mağaza", text: "Haftanın 7 günü açık" },
  { icon: Phone, title: site.phone, text: "Telefonla destek" },
];

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

      {/* Güven şeridi */}
      <section className="container-page mt-3 md:mt-4">
        <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-200 lg:grid-cols-4">
          {trustItems.map((item) => (
            <li key={item.title} className="flex items-center gap-2.5 bg-raised p-3 sm:gap-3 sm:p-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-100 sm:size-10">
                <item.icon size={18} />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-extrabold leading-tight sm:text-sm">{item.title}</span>
                <span className="mt-0.5 block text-[11px] leading-tight text-neutral-500 sm:text-xs">{item.text}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Kategoriler */}
      <section className="container-page mt-8 md:mt-12">
        <h2 className="mb-4 text-xl font-extrabold md:mb-5 md:text-2xl">
          <span className="marker">Kategoriler</span>
        </h2>
        {/* Mobilde yalnızca ikon + ad; açıklama ve alt kategoriler sm ve üstünde görünür. */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-3">
          {categories.map((category) => {
            const Icon = categoryIcons[category.slug] ?? fallbackCategoryIcon;
            return (
              <div key={category.id} className="min-w-0 rounded-2xl border border-neutral-200 bg-raised p-3 sm:p-6">
                <Link href={`/kategori/${category.slug}`} className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-500 sm:size-12">
                    <Icon className="size-5 sm:size-6" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-extrabold leading-tight hover:underline sm:text-lg">{category.name}</span>
                    <span className="hidden text-xs text-neutral-500 sm:block">{category.description}</span>
                  </span>
                </Link>
                <ul className="mt-5 hidden flex-wrap gap-2 sm:flex">
                  {category.children.map((child) => (
                    <li key={child.id}>
                      <Link
                        href={`/kategori/${child.slug}`}
                        className="block rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-bold hover:bg-brand-200"
                      >
                        {child.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
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
