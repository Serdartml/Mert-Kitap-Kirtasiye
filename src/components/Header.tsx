import { Suspense } from "react";
import Link from "next/link";
import { Clock, MapPin, Phone, Search, ShoppingCart, User } from "lucide-react";
import CartBadge from "./CartBadge";
import Logo from "./Logo";
import MobileMenu from "./MobileMenu";
import ThemeToggle from "./ThemeToggle";
import { site } from "@/lib/site";
import { getNavCategories } from "@/lib/catalog";

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

      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-surface shadow-sm">
        {/* Menü (mobil), logo, arama, hesap ve sepet */}
        <div className="container-page flex h-14 items-center gap-2 md:h-20 md:gap-8">
          <MobileMenu categories={categories} />
          <Logo />
          <SearchForm className="hidden flex-1 md:flex" />
          <div className="ml-auto flex items-center md:ml-0 md:gap-1">
            <Link href="/giris" aria-label="Giriş yap" className="flex items-center gap-2 rounded-lg p-2 text-sm font-bold hover:bg-neutral-100 md:px-3 md:py-2">
              <User size={22} />
              <span className="hidden lg:inline">Giriş Yap</span>
            </Link>
            <Link
              href="/sepet"
              className="flex items-center gap-2 rounded-lg p-2 text-sm font-bold hover:bg-neutral-100 md:px-3 md:py-2"
            >
              <span className="relative">
                <ShoppingCart size={22} aria-hidden />
                <Suspense fallback={null}>
                  <CartBadge />
                </Suspense>
              </span>
              <span className="sr-only lg:not-sr-only">Sepetim</span>
            </Link>
            <span className="ml-1 flex md:ml-2">
              <ThemeToggle />
            </span>
          </div>
        </div>

        <div className="container-page pb-2.5 md:hidden">
          <SearchForm />
        </div>

        {/* Masaüstü kategori menüsü; mobilde kategoriler MobileMenu içinde. */}
        <nav aria-label="Kategoriler" className="hidden border-t border-neutral-200 md:block">
          <ul className="container-page flex flex-wrap gap-1">
            {categories.map((category) => (
              <li key={category.id} className="group relative">
                <Link
                  href={`/kategori/${category.slug}`}
                  className="block border-b-[3px] border-transparent px-3 py-3 text-sm font-bold group-hover:border-brand-500 lg:px-4"
                >
                  {category.name}
                </Link>
                {category.children.length > 0 && (
                  <ul className="invisible absolute left-0 top-full z-50 min-w-56 rounded-b-lg border border-t-0 border-neutral-200 bg-surface py-2 opacity-0 shadow-lg transition-opacity group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                    {category.children.map((child) => (
                      <li key={child.id}>
                        <Link href={`/kategori/${child.slug}`} className="block px-4 py-2 text-sm font-medium hover:bg-brand-50">
                          {child.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </header>
    </>
  );
}
