import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumbs, { type Crumb } from "@/components/Breadcrumbs";
import CategoryArt from "@/components/CategoryArt";
import EmptyState from "@/components/EmptyState";
import { Pagination, SortBar } from "@/components/ListingControls";
import ProductGrid from "@/components/ProductGrid";
import { ProductListSkeleton } from "@/components/Skeletons";
import {
  countCategoryProducts,
  getAllCategorySlugs,
  getCategoryBySlug,
  listProducts,
  parsePage,
  parseSort,
} from "@/lib/catalog";
import { categoryIcons, categoryPatterns, fallbackCategoryIcon, fallbackCategoryPattern } from "@/lib/category-icons";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sirala?: string; sayfa?: string; stok?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return {};
  return {
    title: category.name,
    description: category.description ?? `${category.name} kategorisindeki ürünler.`,
    alternates: { canonical: `/kategori/${category.slug}` },
  };
}

// Bilinçli tercih: params <Suspense> dışında okunuyor (aşağıdaki 404 kontrolü için). Geliştirme modunda
// Next.js bunu "instant-shell-url-data" uyarısıyla bildirir; okunan veri önbellekten geldiği için
// bekleme birkaç ms'dir. Uyarıyı susturmak için `export const instant = false` EKLEMEYİN: denendi,
// olmayan adresler arama motoru botlarına 404 yerine 200 dönmeye başlıyor.

// Bütün kategori sayfaları build sırasında üretilir.
export async function generateStaticParams() {
  return (await getAllCategorySlugs()).map((slug) => ({ slug }));
}

// Başlık şeridi ve sekmeler yalnızca kategoriye bağlıdır; önbellekten gelir ve hemen çizilir.
// Varlık kontrolü de burada, <Suspense>'ten önce yapılır: akış başladıktan sonra durum kodu
// değiştirilemez, olmayan kategori gerçek bir 404 dönsün diye notFound() burada çağrılır.
// Ürün listesi searchParams'a (sıralama, sayfa) bağlı olduğu için <Suspense> içinde akar.
export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  // Alt kategorideysek doku, çizim ve sekmeler üst kategoriden gelir.
  const root = category.parent ? await getCategoryBySlug(category.parent.slug) : category;
  if (!root) notFound();

  // Üst kategoride alt kategorilerin ürünleri de listelenir.
  const categoryIds = [category.id, ...category.children.map((child) => child.id)];
  const productCount = await countCategoryProducts(categoryIds);

  const Icon = categoryIcons[root.slug] ?? fallbackCategoryIcon;
  const pattern = categoryPatterns[root.slug] ?? fallbackCategoryPattern;
  const description = category.description ?? root.description;

  const crumbs: Crumb[] = category.parent
    ? [{ label: category.parent.name, href: `/kategori/${category.parent.slug}` }, { label: category.name }]
    : [{ label: category.name }];

  const tabs = [{ id: root.id, slug: root.slug, name: "Tümü" }, ...root.children];

  return (
    <div className="container-page py-4 md:py-6">
      <Breadcrumbs items={crumbs} />

      {/* Kategori şeridi: kategoriye özel kâğıt dokusu ve çizim. Sol alt köşe düz; sekmeler oradan sarkar. */}
      <header
        className={`theme-fixed ${pattern} relative overflow-hidden rounded-2xl rounded-bl-none bg-brand-500 px-5 py-6 sm:px-8 sm:py-8 md:py-10`}
      >
        <div className="relative z-10 max-w-[70%] sm:max-w-xl">
          <p className="inline-flex -rotate-2 items-center gap-1.5 rounded-sm bg-ink px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-brand-500 shadow-md sm:text-xs">
            <Icon size={14} aria-hidden />
            {category.parent ? root.name : `${productCount} ürün`}
          </p>
          <h1 className="mt-3 text-2xl font-extrabold leading-tight tracking-tight sm:text-4xl md:text-5xl">
            <span className="marker marker-light">{category.name}</span>
          </h1>
          {description && <p className="mt-2 text-sm font-medium text-ink/80 sm:text-base">{description}</p>}
          {category.parent && <p className="mt-1 text-xs font-bold text-ink/70 sm:text-sm">{productCount} ürün</p>}
        </div>
        <CategoryArt
          rootSlug={root.slug}
          className="pointer-events-none absolute -bottom-3 -right-3 w-32 animate-float sm:right-4 sm:w-48 md:right-10 md:w-60"
        />
      </header>

      {/* Alt kategoriler: şeritten sarkan klasör ayracı sekmeleri. Mobilde yatay kayar. */}
      <nav aria-label={`${root.name} alt kategorileri`} className="overflow-x-auto pb-1">
        <ul className="flex w-max gap-1">
          {tabs.map((tab) => {
            const active = tab.id === category.id;
            return (
              <li key={tab.id}>
                <Link
                  href={`/kategori/${tab.slug}`}
                  aria-current={active ? "page" : undefined}
                  className={`block whitespace-nowrap rounded-b-xl border border-t-0 px-3.5 text-sm font-bold transition-[padding,background-color] sm:px-4 ${
                    active
                      ? "border-brand-500 bg-brand-500 pb-2.5 pt-3.5 text-ink"
                      : "border-neutral-200 bg-raised py-2 hover:bg-neutral-100 hover:pt-3"
                  }`}
                >
                  {tab.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-5">
        <Suspense fallback={<ProductListSkeleton />}>
          <CategoryProducts
            slug={category.slug}
            rootSlug={root.slug}
            categoryIds={categoryIds}
            searchParams={searchParams}
          />
        </Suspense>
      </div>
    </div>
  );
}

interface CategoryProductsProps {
  slug: string;
  rootSlug: string;
  categoryIds: string[];
  searchParams: PageProps["searchParams"];
}

async function CategoryProducts({ slug, rootSlug, categoryIds, searchParams }: CategoryProductsProps) {
  const query = await searchParams;

  const state = {
    basePath: `/kategori/${slug}`,
    sort: parseSort(query.sirala),
    inStockOnly: query.stok === "1",
    page: parsePage(query.sayfa),
  };

  const { items, total, pageCount } = await listProducts({ categoryIds, ...state });

  return (
    <>
      <SortBar state={state} total={total} />
      {items.length > 0 ? (
        <ProductGrid products={items} dense />
      ) : (
        <EmptyState
          rootSlug={rootSlug}
          title="Bu seçime uygun ürün bulunamadı"
          text="Filtreyi kaldırmayı veya başka bir alt kategoriye bakmayı deneyin."
          action={{ href: `/kategori/${slug}`, label: "Filtreleri temizle" }}
        />
      )}
      <Pagination state={state} pageCount={pageCount} />
    </>
  );
}
