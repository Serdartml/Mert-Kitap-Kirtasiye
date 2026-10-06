import { cacheLife } from "next/cache";
import Link from "next/link";
import { Clock, Mail, MapPin, Phone, ShieldCheck } from "lucide-react";
import Logo from "./Logo";
import { infoPages, site } from "@/lib/site";
import { getNavCategories } from "@/lib/catalog";

export default async function Footer() {
  // Yıl için tarih okunduğundan bileşen önbelleğe alınır; günde bir yenilenir.
  "use cache";
  cacheLife("days");

  const categories = await getNavCategories();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 bg-ink text-neutral-300">
      <div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <Logo onDark />
          <p className="text-sm leading-relaxed">{site.about.footer}</p>
          <p className="flex items-center gap-2 text-sm font-bold text-brand-500">
            <ShieldCheck size={18} /> Orijinal Ürün Garantisi
          </p>
        </div>

        <div>
          <h2 className="mb-4 text-sm font-extrabold uppercase tracking-wider text-white">Kategoriler</h2>
          <ul className="space-y-2.5 text-sm">
            {categories.map((category) => (
              <li key={category.id}>
                <Link href={`/kategori/${category.slug}`} className="hover:text-brand-500">
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="mb-4 text-sm font-extrabold uppercase tracking-wider text-white">Kurumsal</h2>
          <ul className="space-y-2.5 text-sm">
            <li><Link href="/hakkimizda" className="hover:text-brand-500">Hakkımızda</Link></li>
            <li><Link href="/iletisim" className="hover:text-brand-500">İletişim</Link></li>
            {infoPages.map((page) => (
              <li key={page.slug}>
                <Link href={`/bilgi/${page.slug}`} className="hover:text-brand-500">{page.title}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="mb-4 text-sm font-extrabold uppercase tracking-wider text-white">Mağaza</h2>
          <ul className="space-y-3 text-sm">
            <li>
              <a href={site.mapsUrl} target="_blank" rel="noopener noreferrer" className="flex gap-2.5 hover:text-brand-500">
                <MapPin size={18} className="mt-0.5 shrink-0 text-brand-500" /> {site.address.full}
              </a>
            </li>
            <li>
              <a href={site.phoneHref} className="flex items-center gap-2.5 font-bold text-white hover:text-brand-500">
                <Phone size={18} className="shrink-0 text-brand-500" /> {site.phone}
              </a>
            </li>
            <li>
              <a href={`mailto:${site.email}`} className="flex items-center gap-2.5 break-all hover:text-brand-500">
                <Mail size={18} className="shrink-0 text-brand-500" /> {site.email}
              </a>
            </li>
            {site.hours.map((row) => (
              <li key={row.days} className="flex items-center gap-2.5">
                <Clock size={18} className="shrink-0 text-brand-500" /> {row.days}: {row.time}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <p className="container-page py-5 text-xs text-neutral-400">
          © {year} {site.name}. Tüm hakları saklıdır.
        </p>
      </div>
    </footer>
  );
}
