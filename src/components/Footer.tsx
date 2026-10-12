import { cacheLife } from "next/cache";
import Link from "next/link";
import { Clock, Mail, MapPin, MessageCircle, PackageCheck, Phone, ShieldCheck, Store, Wallet } from "lucide-react";
import Logo from "./Logo";
import OpenStatus from "./OpenStatus";
import { infoPages, site, whatsappHref } from "@/lib/site";
import { getNavCategories } from "@/lib/catalog";

export default async function Footer() {
  // Yıl için tarih okunduğundan bileşen önbelleğe alınır; günde bir yenilenir.
  "use cache";
  cacheLife("days");

  const categories = await getNavCategories();
  const year = new Date().getFullYear();
  const whatsapp = whatsappHref("Merhaba, bilgi almak istiyorum.");

  return (
    <footer className="theme-fixed mt-16 bg-ink text-neutral-300">
      {/* Sarı cetvel şeridi */}
      <div aria-hidden className="ruler h-4 bg-brand-500" />
      <div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <Logo className="h-10" />
          <p className="text-sm leading-relaxed">{site.about.footer}</p>
          <p className="flex items-center gap-2 text-sm font-bold text-brand-500">
            <ShieldCheck size={18} /> Orijinal Ürün Garantisi
          </p>
          {/* Sipariş akışındaki gerçek durum (actions/order.ts); akış değişirse burası da güncellenmeli. */}
          <ul className="space-y-2 rounded-xl border border-white/10 p-3.5 text-sm">
            <li className="flex items-start gap-2.5">
              <Store size={18} className="mt-0.5 shrink-0 text-brand-500" aria-hidden /> Mağazadan teslim
            </li>
            <li className="flex items-start gap-2.5">
              <Wallet size={18} className="mt-0.5 shrink-0 text-brand-500" aria-hidden /> Ödeme mağazada
            </li>
            <li className="flex items-start gap-2.5">
              <PackageCheck size={18} className="mt-0.5 shrink-0 text-brand-500" aria-hidden /> Sipariş verdiğiniz ürün sizin için ayrılır
            </li>
          </ul>
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
            <li><Link href="/siparis-takip" className="hover:text-brand-500">Sipariş Takibi</Link></li>
            <li><Link href="/okul-listeleri" className="hover:text-brand-500">Okula Dönüş Listeleri</Link></li>
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
          <OpenStatus className="mb-4" />
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
            {whatsapp && (
              <li>
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 font-extrabold text-ink hover:bg-brand-400"
                >
                  <MessageCircle size={18} aria-hidden /> WhatsApp&apos;tan yazın
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-page flex flex-wrap items-center justify-between gap-3 py-5">
          <p className="text-xs text-neutral-400">
            © {year} {site.name}. Tüm hakları saklıdır.
          </p>
</div>
      </div>
    </footer>
  );
}
