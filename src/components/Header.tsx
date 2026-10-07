import { Suspense } from "react";
import Link from "next/link";
import { Clock, MapPin, Phone, Search, ShoppingCart } from "lucide-react";
import AccountLink, { GuestAccountLink } from "./AccountLink";
import CartBadge from "./CartBadge";
import CategoryArt from "./CategoryArt";
import Logo from "./Logo";
import MobileMenu from "./MobileMenu";
import ThemeToggle from "./ThemeToggle";
import { site } from "@/lib/site";
import { getNavCategories } from "@/lib/catalog";
import { categoryIcons, categoryPatterns, fallbackCategoryIcon, fallbackCategoryPattern } from "@/lib/category-icons";

function SearchForm({ className = "" }: { className?: string }) {
  return (
    <form action="/arama" role="search" className={`flex ${className}`}>
      {/* Mobilde 16px: daha küçük yazı iOS'ta odaklanınca sayfayı yakınlaştırır. */}
      <input
        type="search"
        name="q"
        required
        placeholder="Ürün, kategori veya marka ara"
        aria-label="Ürün ara"
        className="min-w-0 flex-1 rounded-l-lg border-2 border-r-0 border-brand-500 bg-surface px-4 py-2 text-base outline-none placeholder:text-neutral-400 md:py-2.5 md:text-sm"
      />
      <button
        type="submit"
        aria-label="Ara"
        className="grid w-12 shrink-0 place-items-center rounded-r-lg bg-brand-500 text-ink hover:bg-brand-400"
      >
        <Search size={20} />
      </button>
    </form>
  );
}

export default async function Header() {
  const categories = await getNavCategories();

  return (
    <>
      {/* Üst bilgi şeridi: sayfayla birlikte kayar, yapışmaz. */}
      <div className="theme-fixed bg-ink text-xs text-white">
        <div className="container-page flex h-9 items-center justify-between gap-4">
          <a href={site.phoneHref} className="flex items-center gap-1.5 font-semibold hover:text-brand-500">
            <Phone size={13} /> {site.phone}
          </a>
          <div className="hidden items-center gap-5 text-neutral-300 md:flex">
            <span className="flex items-center gap-1.5">
              <Clock size={13} /> {site.hours[0].days}: {site.hours[0].time}
            </span>
            <a href={site.mapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-brand-500">
              <MapPin size={13} /> {site.address.district}, {site.address.city}
            </a>
          </div>
          <nav className="flex items-center gap-4 text-neutral-300">
            <Link href="/hakkimizda" className="hover:text-brand-500">Hakkımızda</Link>
            <Link href="/iletisim" className="hover:text-brand-500">İletişim</Link>
          </nav>
        </div>
      </div>

      {/*
        Yapışma davranışı: masaüstünde logo satırı ve kategori menüsü birlikte üstte kalır.
        Mobilde logo satırı sayfayla birlikte kayar, yalnızca arama çubuğu üstte kalır.
        Üç parça da kardeş öğedir; position: sticky ancak uzun bir kapsayıcının doğrudan çocuğunda işe yarar.
      */}
      <header className="bg-raised md:sticky md:top-0 md:z-40">
        {/* Menü (mobil), logo, arama, hesap ve sepet */}
        <div className="container-page flex h-14 items-center gap-2 md:h-20 md:gap-8">
          <MobileMenu categories={categories} />
          <Logo />
          <SearchForm className="hidden flex-1 md:flex" />
          <div className="ml-auto flex items-center md:ml-0 md:gap-1">
            <Suspense fallback={<GuestAccountLink />}>
              <AccountLink />
            </Suspense>
            <Link
              href="/sepet"
              className="flex items-center gap-2 rounded-lg p-2 text-sm font-bold hover:bg-neutral-100 md:px-3 md:py-2"
            >
              {/* data-cart-target: sepete eklenen ürünün uçtuğu nokta (lib/fly-to-cart). */}
              <span data-cart-target className="relative">
                <ShoppingCart size={22} aria-hidden />
                <Suspense fallback={null}>
                  <CartBadge />
                </Suspense>
              </span>
              <span className="sr-only lg:not-sr-only">Sepetim</span>
            </Link>
            <span className="flex md:ml-2">
              <ThemeToggle />
            </span>
          </div>
        </div>

      </header>

      <div className="sticky top-0 z-40 border-b border-neutral-200 bg-raised py-2 shadow-sm md:hidden dark:shadow-[0_6px_16px_rgb(0_0_0/0.7)]">
        <div className="container-page">
          <SearchForm />
        </div>
      </div>

      {/* Masaüstü kategori menüsü; mobilde kategoriler MobileMenu içinde. top-20 = logo satırının yüksekliği. */}
      <nav
        aria-label="Kategoriler"
        className="sticky top-20 z-30 hidden border-y border-neutral-200 bg-raised shadow-sm md:block dark:shadow-[0_6px_16px_rgb(0_0_0/0.7)]"
      >
        <ul className="container-page flex flex-wrap gap-1">
          {categories.map((category, index) => {
            const Icon = categoryIcons[category.slug] ?? fallbackCategoryIcon;
            const pattern = categoryPatterns[category.slug] ?? fallbackCategoryPattern;
            // Sağdaki kategorilerde açılır kutu ekrandan taşmasın diye sağa hizalanır.
            const alignRight = index >= categories.length - 2;
            return (
              <li key={category.id} className="group relative">
                <Link
                  href={`/kategori/${category.slug}`}
                  className="flex items-center gap-2 px-3 py-3 text-sm font-bold lg:px-4"
                >
                  <Icon size={16} aria-hidden className="shrink-0" />
                  <span className="marker-hover">{category.name}</span>
                </Link>
                {category.children.length > 0 && (
                  <div
                    className={`invisible absolute top-full z-50 flex w-80 overflow-hidden rounded-b-xl border border-t-0 border-neutral-200 bg-raised opacity-0 shadow-lg transition-opacity group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100 ${
                      alignRight ? "right-0" : "left-0"
                    }`}
                  >
                    <ul className="flex-1 py-2">
                      <li>
                        <Link href={`/kategori/${category.slug}`} className="block px-4 py-2 text-sm font-extrabold hover:bg-brand-50">
                          Tüm {category.name}
                        </Link>
                      </li>
                      {category.children.map((child) => (
                        <li key={child.id}>
                          <Link href={`/kategori/${child.slug}`} className="block px-4 py-2 text-sm font-medium hover:bg-brand-50">
                            {child.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                    {/* Kategorinin dokusu ve çizimi */}
                    <div className={`theme-fixed ${pattern} grid w-28 shrink-0 place-items-end bg-brand-500`}>
                      <CategoryArt rootSlug={category.slug} className="-mb-1 -mr-2 w-28" />
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
