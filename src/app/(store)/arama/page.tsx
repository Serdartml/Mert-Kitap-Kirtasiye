import { Suspense } from "react";
import type { Metadata } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";
import EmptyState from "@/components/EmptyState";
import { ListingSkeleton } from "@/components/Skeletons";
import { Pagination, SortBar } from "@/components/ListingControls";
import ProductGrid from "@/components/ProductGrid";
import { listProducts, parsePage, parseSort } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Arama",
  robots: { index: false },
};

interface PageProps {
  searchParams: Promise<{ q?: string; sirala?: string; sayfa?: string; stok?: string }>;
}

export default function SearchPage(props: PageProps) {
  return (
    <Suspense fallback={<ListingSkeleton />}>
      <SearchContent {...props} />
    </Suspense>
  );
}

async function SearchContent({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = (params.q ?? "").trim().slice(0, 100);

  const state = {
    basePath: "/arama",
    query,
    sort: parseSort(params.sirala),
    inStockOnly: params.stok === "1",
    page: parsePage(params.sayfa),
  };

  const result = query ? await listProducts(state) : { items: [], total: 0, pageCount: 1 };

  return (
    <div className="container-page py-6">
      <Breadcrumbs items={[{ label: "Arama" }]} />
      <h1 className="text-2xl font-extrabold md:text-3xl">
        {query ? <>&ldquo;{query}&rdquo; için sonuçlar</> : "Arama"}
      </h1>

      <div className="mt-5">
        {!query ? (
          <EmptyState title="Ne aramıştınız?" text="Aramak istediğiniz ürünü yukarıdaki kutuya yazın." />
        ) : (
          <>
            <SortBar state={state} total={result.total} />
            {result.items.length > 0 ? (
              <ProductGrid products={result.items} dense />
            ) : (
              <EmptyState
                title="Aramanızla eşleşen ürün bulunamadı"
                text="Farklı bir kelime deneyin veya kategorilere göz atın."
                action={{ href: "/", label: "Ana sayfaya dön" }}
              />
            )}
            <Pagination state={state} pageCount={result.pageCount} />
          </>
        )}
      </div>
    </div>
  );
}
