import Link from "next/link";
import { ArrowRight, MapPin, MessageCircle, PackageSearch, Phone } from "lucide-react";
import HeroShowcase from "@/components/HeroShowcase";
import HowItWorks from "@/components/HowItWorks";
import OrderTrackBox from "@/components/OrderTrackBox";
import OpenStatus from "@/components/OpenStatus";
import ProductGrid from "@/components/ProductGrid";
import Scribble from "@/components/Scribble";
import SchoolListCards from "@/components/SchoolListCards";
import SectionEdge from "@/components/SectionEdge";
import ShowcaseMarquee from "@/components/ShowcaseMarquee";
import { getDiscountedProducts, getFeaturedProducts, getNavCategories, getNewestProducts, type ProductCardData } from "@/lib/catalog";
import { site, stats, whatsappHref } from "@/lib/site";

// note: başlığın yanına el yazısıyla düşülen kısa not; ok başlığı gösterir.
// scroll: mobilde ürünler tek satırda yana kayar (sayfa kısalır); masaüstünde ızgara olarak kalır.
function ProductSection({
  title,
  href,
  note,
  products,
  scroll = false,
}: {
  title: string;
  href?: string;
  note?: string;
  products: ProductCardData[];
  scroll?: boolean;
}) {
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
      <ProductGrid products={products} scrollOnMobile={scroll} />
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

  const whatsappLink = whatsappHref("Merhaba, bilgi almak istiyorum.");

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

      {/* Okula dönüş listeleri: sınıf seviyesine göre hazır malzeme listeleri */}
      <section className="container-page mt-10 md:mt-14" aria-labelledby="okul-listeleri">
        {/* Mobilde başlık tek satır; el yazısı not yalnızca sm ve üstünde (dar ekranda başlığı iki satıra böldüğü için). */}
        <div className="mb-4 flex items-center justify-between gap-3 md:mb-5">
          <h2 id="okul-listeleri" className="flex min-w-0 items-end text-lg font-extrabold sm:text-xl md:text-2xl">
            <span className="marker">Okula dönüş listeleri</span>
            <span aria-hidden className="ml-3 hidden -rotate-3 font-hand text-2xl font-bold leading-none text-neutral-500 sm:inline">tek tuşla sepete</span>
          </h2>
          <Link href="/okul-listeleri" className="flex min-h-11 shrink-0 items-center gap-1 text-sm font-bold hover:underline">
            Tümü <ArrowRight size={16} />
          </Link>
        </div>
        <SchoolListCards />
      </section>

      <ProductSection title="Öne Çıkanlar" products={featured} />

      {/* Kampanya bandı: kenarları yırtık kâğıt gibi dişli */}
      {discounted.length > 0 && (
        <section className="relative mt-10 bg-ink py-7 md:mt-16 md:py-10">
          <SectionEdge position="top" colorClass="text-ink" />
          <SectionEdge position="bottom" colorClass="text-ink" />
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

      <ProductSection title="Yeni Gelenler" note="taze geldi!" products={newest} scroll />

      <HowItWorks />

      {/* Sipariş takibi: üyeliksiz verilen siparişin numarasıyla durumu görülür */}
      <section className="container-page mt-6 md:mt-8" aria-labelledby="siparis-takip">
        <div className="flex flex-col gap-4 rounded-2xl border-2 border-ink bg-raised p-4 sm:p-6 md:flex-row md:items-center md:justify-between md:gap-8 dark:border-neutral-300">
          <div className="min-w-0">
            <h2 id="siparis-takip" className="flex items-center gap-2 text-lg font-extrabold md:text-xl">
              <PackageSearch size={22} aria-hidden className="shrink-0" /> Siparişini takip et
            </h2>
            <p className="mt-1 text-sm text-neutral-600">
              Sipariş numaranı yaz, durumunu hemen gör. Üye olmana gerek yok.
            </p>
          </div>
          <div className="md:w-full md:max-w-md">
            <OrderTrackBox />
          </div>
        </div>
      </section>

      {/* Mağaza: tam genişlik sarı bant, yırtık kâğıt kenarlı; canlı açık/kapalı durumu ve büyük iletişim düğmeleri */}
      <section className="theme-fixed pattern-dots relative mt-14 bg-brand-500 py-8 sm:py-10 md:mt-20 md:py-12">
        <SectionEdge position="top" colorClass="text-brand-500" />
        <SectionEdge position="bottom" colorClass="text-brand-500" />
        <div className="container-page flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <h2 className="text-2xl font-extrabold md:text-3xl">Mağazamıza bekleriz</h2>
            <OpenStatus className="mt-3" />
            <p className="mt-3 flex items-start gap-2 text-sm font-medium sm:text-base">
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
          {/* Mobilde tam genişlik, parmakla rahat basılan yüksek düğmeler. */}
          <div className="grid gap-2.5 sm:grid-cols-3 md:flex md:flex-wrap md:gap-3">
            <a href={site.mapsUrl} target="_blank" rel="noopener noreferrer" className="btn btn-dark min-h-12 text-base md:min-h-0 md:text-sm">
              <MapPin size={18} /> Yol Tarifi Al
            </a>
            <a href={site.phoneHref} className="btn min-h-12 border border-ink/30 text-base hover:border-ink md:min-h-0 md:text-sm">
              <Phone size={18} /> Ara
            </a>
            {whatsappLink && (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="btn min-h-12 border border-ink/30 text-base hover:border-ink md:min-h-0 md:text-sm"
              >
                <MessageCircle size={18} /> WhatsApp
              </a>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
