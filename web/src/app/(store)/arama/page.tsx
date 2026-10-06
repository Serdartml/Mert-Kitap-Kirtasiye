import type { Metadata } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";
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

export default async function SearchPage({ searchParams }: PageProps) {
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
          <p className="rounded-xl bg-neutral-100 p-8 text-center text-sm text-neutral-600">
            Aramak istediğiniz ürünü yukarıdaki kutuya yazın.
          </p>
        ) : (
          <>
            <SortBar state={state} total={result.total} />
            {result.items.length > 0 ? (
              <ProductGrid products={result.items} />
            ) : (
              <p className="rounded-xl bg-neutral-100 p-8 text-center text-sm text-neutral-600">
                Aramanızla eşleşen ürün bulunamadı. Farklı bir kelime deneyin.
              </p>
            )}
            <Pagination state={state} pageCount={result.pageCount} />
          </>
        )}
      </div>
    </div>
  );
}
