import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumbs, { type Crumb } from "@/components/Breadcrumbs";
import { Pagination, SortBar } from "@/components/ListingControls";
import ProductGrid from "@/components/ProductGrid";
import { ListingSkeleton } from "@/components/Skeletons";
import { getAllCategorySlugs, getCategoryBySlug, listProducts, parsePage, parseSort } from "@/lib/catalog";

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

// Bütün kategori sayfaları build sırasında üretilir.
export async function generateStaticParams() {
  return (await getAllCategorySlugs()).map((slug) => ({ slug }));
}

// Varlık kontrolü <Suspense>'ten önce yapılır: akış başladıktan sonra durum kodu değiştirilemez,
// olmayan kategori gerçek bir 404 dönsün diye notFound() burada çağrılır.
// searchParams (sıralama, sayfa) istek anında bilindiği için liste <Suspense> içinde akar.
export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  if (!(await getCategoryBySlug(slug))) notFound();

  return (
    <Suspense fallback={<ListingSkeleton />}>
      <CategoryContent slug={slug} searchParams={searchParams} />
    </Suspense>
  );
}

async function CategoryContent({ slug, searchParams }: { slug: string; searchParams: PageProps["searchParams"] }) {
  const [category, query] = await Promise.all([getCategoryBySlug(slug), searchParams]);
  if (!category) notFound();

  const state = {
    basePath: `/kategori/${category.slug}`,
    sort: parseSort(query.sirala),
    inStockOnly: query.stok === "1",
    page: parsePage(query.sayfa),
  };

  // Üst kategoride alt kategorilerin ürünleri de listelenir.
  const categoryIds = [category.id, ...category.children.map((child) => child.id)];
  const { items, total, pageCount } = await listProducts({ categoryIds, ...state });

  const crumbs: Crumb[] = category.parent
    ? [{ label: category.parent.name, href: `/kategori/${category.parent.slug}` }, { label: category.name }]
    : [{ label: category.name }];

  // Yan menü: alt kategorideysek kardeşleri göstermek için üst kategorinin listesine ihtiyaç var.
  const root = category.parent ? await getCategoryBySlug(category.parent.slug) : category;
  const siblings = root?.children ?? [];

  return (
    <div className="container-page py-6">
      <Breadcrumbs items={crumbs} />

      <div className="grid gap-5 lg:grid-cols-[14rem_1fr] lg:gap-8">
        {/* min-w-0: yatay kayan liste grid sütununu ekrandan dışarı itmesin. */}
        <aside className="min-w-0">
          <h2 className="mb-3 hidden text-sm font-extrabold uppercase tracking-wider lg:block">{root?.name}</h2>
          <ul className="-mx-4 flex gap-2 overflow-x-auto whitespace-nowrap px-4 pb-1 sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:whitespace-normal lg:px-0">
            {root && (
              <li className="shrink-0">
                <Link
                  href={`/kategori/${root.slug}`}
                  aria-current={root.id === category.id ? "page" : undefined}
                  className={`block rounded-lg px-3 py-2 text-sm font-semibold ${
                    root.id === category.id ? "bg-brand-500 font-extrabold" : "bg-neutral-100 hover:bg-neutral-200 lg:bg-transparent lg:hover:bg-neutral-100"
                  }`}
                >
                  Tümü
                </Link>
              </li>
            )}
            {siblings.map((child) => (
              <li key={child.id} className="shrink-0">
                <Link
                  href={`/kategori/${child.slug}`}
                  aria-current={child.id === category.id ? "page" : undefined}
                  className={`block rounded-lg px-3 py-2 text-sm font-semibold ${
                    child.id === category.id ? "bg-brand-500 font-extrabold" : "bg-neutral-100 hover:bg-neutral-200 lg:bg-transparent lg:hover:bg-neutral-100"
                  }`}
                >
                  {child.name}
                </Link>
              </li>
            ))}
          </ul>
        </aside>

        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold md:text-3xl">{category.name}</h1>
          {category.description && <p className="mt-1 text-sm text-neutral-600">{category.description}</p>}

          <div className="mt-5">
            <SortBar state={state} total={total} />
            {items.length > 0 ? (
              <ProductGrid products={items} />
            ) : (
              <p className="rounded-xl bg-neutral-100 p-8 text-center text-sm text-neutral-600">
                Bu seçime uygun ürün bulunamadı.
              </p>
            )}
            <Pagination state={state} pageCount={pageCount} />
          </div>
        </div>
      </div>
    </div>
  );
}
