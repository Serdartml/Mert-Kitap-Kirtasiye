import Link from "next/link";
import { ArrowRight, Award, BookOpen, GraduationCap, MapPin, PenLine, Phone, ShieldCheck, Store } from "lucide-react";
import ProductGrid from "@/components/ProductGrid";
import { getDiscountedProducts, getFeaturedProducts, getNavCategories, getNewestProducts, type ProductCardData } from "@/lib/catalog";
import { categoryIcons, fallbackCategoryIcon } from "@/lib/category-icons";
import { site } from "@/lib/site";

const trustItems = [
  { icon: Award, title: "20 yıllık tecrübe", text: "Eğitimde yol arkadaşınız" },
  { icon: ShieldCheck, title: "Orijinal ürün garantisi", text: "Özenle seçilmiş ürünler" },
  { icon: Store, title: "Bornova'da mağaza", text: "Haftanın 7 günü açık" },
  { icon: Phone, title: site.phone, text: "Telefonla destek" },
];

function ProductSection({ title, href, products }: { title: string; href?: string; products: ProductCardData[] }) {
  if (products.length === 0) return null;

  return (
    <section className="container-page mt-12">
      <div className="mb-5 flex items-end justify-between gap-4">
        <h2 className="border-l-4 border-brand-500 pl-3 text-xl font-extrabold md:text-2xl">{title}</h2>
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
      {/* Vitrin */}
      <section className="container-page mt-5 grid gap-4 lg:grid-cols-3">
        <div className="relative overflow-hidden rounded-2xl bg-brand-500 p-7 md:p-12 lg:col-span-2">
          <p className="inline-block rounded-full bg-ink px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-500">
            Okula Dönüş Fırsatları
          </p>
          <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">
            Gelecek
            <br />
            burada başlar
          </h1>
          <p className="mt-4 max-w-xl text-base font-medium text-ink/80 md:text-lg">{site.description}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/kategori/kirtasiye" className="btn btn-dark">
              Alışverişe Başla <ArrowRight size={18} />
            </Link>
            <Link href="/hakkimizda" className="btn border border-ink/30 hover:border-ink">
              Hakkımızda
            </Link>
          </div>
          <PenLine aria-hidden className="absolute -bottom-8 -right-6 hidden size-56 text-ink/10 md:block" strokeWidth={1} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <Link href="/kategori/hazirlik-kitaplari" className="group flex flex-col justify-between rounded-2xl bg-ink p-7 text-white">
            <GraduationCap className="text-brand-500" size={32} />
            <div className="mt-6">
              <h2 className="text-2xl font-extrabold">Hazırlık Kitapları</h2>
              <p className="mt-1 text-sm text-neutral-300">Sınavlara hazırlık ve okula yardımcı kaynaklar</p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-brand-500">
                Keşfet <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </span>
            </div>
          </Link>
          <Link href="/kategori/kultur-kitaplari" className="group flex flex-col justify-between rounded-2xl border-2 border-ink bg-white p-7">
            <BookOpen size={32} />
            <div className="mt-6">
              <h2 className="text-2xl font-extrabold">Kültür Kitapları</h2>
              <p className="mt-1 text-sm text-neutral-600">Roman, klasikler, çocuk kitapları ve daha fazlası</p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold">
                Keşfet <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </span>
            </div>
          </Link>
        </div>
      </section>

      {/* Güven şeridi */}
      <section className="container-page mt-4">
        <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-200 lg:grid-cols-4">
          {trustItems.map((item) => (
            <li key={item.title} className="flex items-center gap-3 bg-white p-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-100">
                <item.icon size={20} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-extrabold">{item.title}</span>
                <span className="block text-xs text-neutral-500">{item.text}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Kategoriler */}
      <section className="container-page mt-12">
        <h2 className="mb-5 border-l-4 border-brand-500 pl-3 text-xl font-extrabold md:text-2xl">Kategoriler</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => {
            const Icon = categoryIcons[category.slug] ?? fallbackCategoryIcon;
            return (
              <div key={category.id} className="rounded-2xl border border-neutral-200 p-6">
                <Link href={`/kategori/${category.slug}`} className="flex items-center gap-3">
                  <span className="grid size-12 place-items-center rounded-xl bg-brand-500">
                    <Icon size={24} />
                  </span>
                  <span>
                    <span className="block text-lg font-extrabold hover:underline">{category.name}</span>
                    <span className="block text-xs text-neutral-500">{category.description}</span>
                  </span>
                </Link>
                <ul className="mt-5 flex flex-wrap gap-2">
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
        <section className="mt-12 bg-ink py-10">
          <div className="container-page">
            <h2 className="mb-5 text-xl font-extrabold text-white md:text-2xl">
              <span className="text-brand-500">İndirimli</span> ürünler
            </h2>
            <ProductGrid products={discounted} />
          </div>
        </section>
      )}

      <ProductSection title="Yeni Gelenler" products={newest} />

      {/* Mağaza */}
      <section className="container-page mt-12">
        <div className="flex flex-col gap-6 rounded-2xl bg-brand-500 p-7 md:flex-row md:items-center md:justify-between md:p-10">
          <div>
            <h2 className="text-2xl font-extrabold md:text-3xl">Mağazamıza bekleriz</h2>
            <p className="mt-2 flex items-start gap-2 font-medium">
              <MapPin size={20} className="mt-0.5 shrink-0" /> {site.address.full}
            </p>
            <p className="mt-1 text-sm font-medium text-ink/80">
              {site.hours.map((row) => `${row.days}: ${row.time}`).join("  ·  ")}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
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
