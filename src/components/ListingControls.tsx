import Link from "next/link";
import { ChevronLeft, ChevronRight, LayoutGrid, LibraryBig } from "lucide-react";
import { sortOptions, type SortKey } from "@/lib/catalog";

interface ListingState {
  basePath: string;
  query?: string;
  sort: SortKey;
  inStockOnly: boolean;
  page: number;
  // Yalnızca raf görünümü olan kategorilerde verilir (kültür kitapları); varsayılanı "raf".
  view?: "raf" | "liste";
}

function buildHref(state: ListingState, overrides: Partial<Pick<ListingState, "sort" | "inStockOnly" | "page" | "view">>) {
  const next = { ...state, ...overrides };
  const params = new URLSearchParams();
  if (next.query) params.set("q", next.query);
  if (next.view === "liste") params.set("gorunum", "liste");
  if (next.sort !== "onerilen") params.set("sirala", next.sort);
  if (next.inStockOnly) params.set("stok", "1");
  if (next.page > 1) params.set("sayfa", String(next.page));
  const qs = params.toString();
  return qs ? `${next.basePath}?${qs}` : next.basePath;
}

const viewOptions = [
  { key: "raf", label: "Raf", icon: LibraryBig },
  { key: "liste", label: "Liste", icon: LayoutGrid },
] as const;

export function SortBar({ state, total }: { state: ListingState; total: number }) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
      <p className="text-sm text-neutral-600 sm:mr-auto">
        <span className="font-bold text-fg">{total}</span> ürün
      </p>
      {/* Mobilde tek satır, yatay kayar; kenarlara kadar uzasın diye container boşluğu geri alınır. */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
      {state.view && (
        <div className="flex shrink-0 overflow-hidden rounded-full border border-neutral-300" role="group" aria-label="Görünüm">
          {viewOptions.map((option) => (
            <Link
              key={option.key}
              href={buildHref(state, { view: option.key })}
              aria-current={state.view === option.key ? "true" : undefined}
              className={`flex items-center gap-1.5 whitespace-nowrap px-3.5 py-2 text-xs font-bold sm:px-3 sm:py-1.5 ${
                state.view === option.key ? "bg-fg text-surface" : "hover:bg-neutral-100"
              }`}
            >
              <option.icon size={14} aria-hidden /> {option.label}
            </Link>
          ))}
        </div>
      )}
      <Link
        href={buildHref(state, { inStockOnly: !state.inStockOnly, page: 1 })}
        aria-pressed={state.inStockOnly}
        className={`shrink-0 whitespace-nowrap rounded-full border px-3.5 py-2 text-xs font-bold sm:px-3 sm:py-1.5 ${
          state.inStockOnly ? "border-fg bg-fg text-surface" : "border-neutral-300 hover:border-fg"
        }`}
      >
        Yalnızca stoktakiler
      </Link>
      {sortOptions.map((option) => (
        <Link
          key={option.key}
          href={buildHref(state, { sort: option.key, page: 1 })}
          aria-current={state.sort === option.key ? "true" : undefined}
          className={`shrink-0 whitespace-nowrap rounded-full border px-3.5 py-2 text-xs font-bold sm:px-3 sm:py-1.5 ${
            state.sort === option.key ? "border-brand-500 bg-brand-500 text-ink" : "border-neutral-300 hover:border-fg"
          }`}
        >
          {option.label}
        </Link>
      ))}
      </div>
    </div>
  );
}

// İlk sayfa, son sayfa ve geçerli sayfanın birer komşusu; aradaki boşluklar "gap" olur.
// Tek sayfalık boşlukta üç nokta yerine o sayfanın kendisi gösterilir.
function pageItems(current: number, pageCount: number): (number | "gap")[] {
  const pages = [...new Set([1, current - 1, current, current + 1, pageCount])]
    .filter((page) => page >= 1 && page <= pageCount)
    .sort((a, b) => a - b);

  const items: (number | "gap")[] = [];
  let previous = 0;
  for (const page of pages) {
    if (page - previous === 2) items.push(previous + 1);
    else if (page - previous > 2) items.push("gap");
    items.push(page);
    previous = page;
  }
  return items;
}

const pageBox = "size-10 place-items-center rounded-lg border text-sm font-bold";

function PageArrow({ href, label, rel, children }: { href: string | null; label: string; rel: "prev" | "next"; children: React.ReactNode }) {
  if (!href) {
    return (
      <span aria-hidden className={`grid ${pageBox} border-neutral-200 text-neutral-300`}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} rel={rel} aria-label={label} className={`grid ${pageBox} border-neutral-300 hover:border-fg`}>
      {children}
    </Link>
  );
}

export function Pagination({ state, pageCount }: { state: ListingState; pageCount: number }) {
  if (pageCount <= 1) return null;

  const current = Math.min(state.page, pageCount);

  return (
    <nav aria-label="Sayfalar" className="mt-8 flex justify-center gap-1.5 sm:gap-2">
      <PageArrow href={current > 1 ? buildHref(state, { page: current - 1 }) : null} label="Önceki sayfa" rel="prev">
        <ChevronLeft size={18} />
      </PageArrow>
      {pageItems(current, pageCount).map((item, index) => {
        if (item === "gap") {
          return (
            <span key={`gap-${index}`} aria-hidden className="grid w-6 place-items-center text-sm font-bold text-neutral-400 sm:w-10">
              …
            </span>
          );
        }
        // Dar ekranda yalnızca ilk, son ve geçerli sayfa; komşular sm ve üstünde görünür.
        const essential = item === 1 || item === pageCount || item === current;
        return (
          <Link
            key={item}
            href={buildHref(state, { page: item })}
            aria-current={item === current ? "page" : undefined}
            className={`${essential ? "grid" : "hidden sm:grid"} ${pageBox} ${
              item === current ? "border-fg bg-fg text-surface" : "border-neutral-300 hover:border-fg"
            }`}
          >
            {item}
          </Link>
        );
      })}
      <PageArrow href={current < pageCount ? buildHref(state, { page: current + 1 }) : null} label="Sonraki sayfa" rel="next">
        <ChevronRight size={18} />
      </PageArrow>
    </nav>
  );
}
