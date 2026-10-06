import Link from "next/link";
import { sortOptions, type SortKey } from "@/lib/catalog";

interface ListingState {
  basePath: string;
  query?: string;
  sort: SortKey;
  inStockOnly: boolean;
  page: number;
}

function buildHref(state: ListingState, overrides: Partial<Pick<ListingState, "sort" | "inStockOnly" | "page">>) {
  const next = { ...state, ...overrides };
  const params = new URLSearchParams();
  if (next.query) params.set("q", next.query);
  if (next.sort !== "onerilen") params.set("sirala", next.sort);
  if (next.inStockOnly) params.set("stok", "1");
  if (next.page > 1) params.set("sayfa", String(next.page));
  const qs = params.toString();
  return qs ? `${next.basePath}?${qs}` : next.basePath;
}

export function SortBar({ state, total }: { state: ListingState; total: number }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <p className="mr-auto text-sm text-neutral-600">
        <span className="font-bold text-ink">{total}</span> ürün
      </p>
      <Link
        href={buildHref(state, { inStockOnly: !state.inStockOnly, page: 1 })}
        aria-pressed={state.inStockOnly}
        className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
          state.inStockOnly ? "border-ink bg-ink text-white" : "border-neutral-300 hover:border-ink"
        }`}
      >
        Yalnızca stoktakiler
      </Link>
      {sortOptions.map((option) => (
        <Link
          key={option.key}
          href={buildHref(state, { sort: option.key, page: 1 })}
          aria-current={state.sort === option.key ? "true" : undefined}
          className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
            state.sort === option.key ? "border-brand-500 bg-brand-500 text-ink" : "border-neutral-300 hover:border-ink"
          }`}
        >
          {option.label}
        </Link>
      ))}
    </div>
  );
}

export function Pagination({ state, pageCount }: { state: ListingState; pageCount: number }) {
  if (pageCount <= 1) return null;

  return (
    <nav aria-label="Sayfalar" className="mt-8 flex flex-wrap justify-center gap-2">
      {Array.from({ length: pageCount }, (_, i) => i + 1).map((page) => (
        <Link
          key={page}
          href={buildHref(state, { page })}
          aria-current={page === state.page ? "page" : undefined}
          className={`grid size-10 place-items-center rounded-lg border text-sm font-bold ${
            page === state.page ? "border-ink bg-ink text-white" : "border-neutral-300 hover:border-ink"
          }`}
        >
          {page}
        </Link>
      ))}
    </nav>
  );
}
