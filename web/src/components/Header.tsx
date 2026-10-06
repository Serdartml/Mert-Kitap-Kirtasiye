import Link from "next/link";
import { Clock, MapPin, Phone, Search, ShoppingCart, User } from "lucide-react";
import Logo from "./Logo";
import { site } from "@/lib/site";
import { getNavCategories } from "@/lib/catalog";
import { getCartCount } from "@/lib/cart";

function SearchForm({ className = "" }: { className?: string }) {
  return (
    <form action="/arama" role="search" className={`flex ${className}`}>
      <input
        type="search"
        name="q"
        required
        placeholder="Ürün, kategori veya marka ara"
        aria-label="Ürün ara"
        className="min-w-0 flex-1 rounded-l-lg border-2 border-r-0 border-brand-500 bg-white px-4 py-2.5 text-sm outline-none placeholder:text-neutral-400"
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
  const [categories, cartCount] = await Promise.all([getNavCategories(), getCartCount()]);

  return (
    <header className="sticky top-0 z-40 bg-white shadow-sm">
      {/* Üst bilgi şeridi */}
      <div className="bg-ink text-xs text-white">
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

      {/* Logo, arama, hesap ve sepet */}
      <div className="container-page flex h-16 items-center gap-4 md:h-20 md:gap-8">
        <Logo />
        <SearchForm className="hidden flex-1 md:flex" />
        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <Link href="/giris" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold hover:bg-neutral-100">
            <User size={20} />
            <span className="hidden lg:inline">Giriş Yap</span>
          </Link>
          <Link href="/sepet" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold hover:bg-neutral-100">
            <span className="relative">
              <ShoppingCart size={20} />
              {cartCount > 0 && (
                <span className="absolute -right-2.5 -top-2.5 grid min-w-5 place-items-center rounded-full bg-brand-500 px-1 text-[11px] font-extrabold leading-5 text-ink">
                  {cartCount}
                </span>
              )}
            </span>
            <span className="hidden lg:inline">Sepetim</span>
          </Link>
        </div>
      </div>

      <div className="container-page pb-3 md:hidden">
        <SearchForm />
      </div>

      {/* Kategori menüsü: masaüstünde hover ile açılır, mobilde yatay kayar */}
      <nav aria-label="Kategoriler" className="border-t border-neutral-200">
        <ul className="container-page flex gap-1 overflow-x-auto md:overflow-visible">
          {categories.map((category) => (
            <li key={category.id} className="group relative shrink-0">
              <Link
                href={`/kategori/${category.slug}`}
                className="block border-b-[3px] border-transparent px-3 py-3 text-sm font-bold group-hover:border-brand-500 md:px-4"
              >
                {category.name}
              </Link>
              {category.children.length > 0 && (
                <ul className="invisible absolute left-0 top-full z-50 hidden min-w-56 rounded-b-lg border border-t-0 border-neutral-200 bg-white py-2 opacity-0 shadow-lg transition-opacity group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100 md:block">
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
  );
}
