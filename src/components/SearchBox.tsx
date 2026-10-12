"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, FolderTree, Search } from "lucide-react";
import { categoryTones, fallbackCategoryTone } from "@/lib/category-icons";
import type { SearchSuggestions } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";

const DEBOUNCE_MS = 200;
const MIN_LENGTH = 2;

type Option = { id: string; href: string };

// Arama kutusu + otomatik tamamlama (combobox). Yazdıkça /api/arama-oneri'den kategori ve ürün önerir.
// Klavye: ↑ ↓ gezer, Enter seçileni açar (seçili yoksa normal arama), Esc kapatır. Öneri gelmese de
// form düz bir GET formu olarak çalışır (JS kapalıyken bile /arama'ya gider).
export default function SearchBox({ className = "" }: { className?: string }) {
  const router = useRouter();
  const listId = useId();
  const root = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [data, setData] = useState<SearchSuggestions | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const trimmed = query.trim();
  const ready = trimmed.length >= MIN_LENGTH;

  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/arama-oneri?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal });
        if (!response.ok) return;
        setData(await response.json());
        setActive(-1);
      } catch {
        // İptal edilen ya da başarısız istek: öneri gösterilmez, arama yine çalışır.
      }
    }, DEBOUNCE_MS);
    // Yeni harf yazılınca eski istek iptal edilir; geç gelen eski yanıt yenisinin üstüne yazılamaz.
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, ready]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const options: Option[] = [];
  if (data) {
    data.categories.forEach((c) => options.push({ id: `c-${c.slug}`, href: `/kategori/${c.slug}` }));
    data.products.forEach((p) => options.push({ id: `p-${p.slug}`, href: `/urun/${p.slug}` }));
    if (data.total > 0) options.push({ id: "all", href: `/arama?q=${encodeURIComponent(trimmed)}` });
  }
  const optionIndex = (id: string) => options.findIndex((o) => o.id === id);

  const showList = open && ready && data !== null;
  const close = () => setOpen(false);

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      close();
      return;
    }
    if (!showList || options.length === 0) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      // Liste uçlarında başa/sona sarar.
      setActive((current) =>
        event.key === "ArrowDown" ? (current + 1) % options.length : current <= 0 ? options.length - 1 : current - 1,
      );
    } else if (event.key === "Enter" && active >= 0) {
      event.preventDefault();
      close();
      router.push(options[active].href);
    }
  };

  const noResults = showList && data.categories.length === 0 && data.products.length === 0;

  return (
    <div ref={root} className={`relative ${className}`}>
      <form action="/arama" role="search" className="flex">
        {/* Mobilde 16px: daha küçük yazı iOS'ta odaklanınca sayfayı yakınlaştırır. */}
        <input
          type="search"
          name="q"
          required
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && active >= 0 ? `${listId}-${options[active].id}` : undefined}
          autoComplete="off"
          enterKeyHint="search"
          placeholder="Ürün, kategori veya marka ara"
          aria-label="Ürün ara"
          className="min-w-0 flex-1 rounded-l-lg border-2 border-r-0 border-brand-500 bg-surface px-4 py-2 text-base outline-none placeholder:text-neutral-400 md:py-2.5 md:text-sm"
        />
        <button
          type="submit"
          aria-label="Ara"
          className="grid w-12 shrink-0 place-items-center rounded-r-lg bg-brand-500 text-ink hover:bg-brand-400"
        >
          <Search size={20} />
        </button>
      </form>

      {showList && (
        <div className="absolute inset-x-0 top-full z-50 mt-1.5 max-h-[min(26rem,65svh)] overflow-y-auto overscroll-contain rounded-xl border border-neutral-200 bg-raised shadow-xl">
          <ul id={listId} role="listbox" aria-label="Arama önerileri" className="py-1.5">
            {data.categories.map((category) => {
              const id = `c-${category.slug}`;
              return (
                <li key={id} id={`${listId}-${id}`} role="option" aria-selected={active === optionIndex(id)}>
                  <Link
                    href={`/kategori/${category.slug}`}
                    onClick={close}
                    className={`flex min-h-12 items-center gap-3 px-3 py-2 ${active === optionIndex(id) ? "bg-brand-50" : "hover:bg-neutral-100"}`}
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-neutral-100">
                      <FolderTree size={18} aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold">{category.name}</span>
                      <span className="block truncate text-xs text-neutral-500">
                        Kategori{category.parentName ? ` · ${category.parentName}` : ""}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}

            {data.products.map((product) => {
              const id = `p-${product.slug}`;
              const tone = (categoryTones[product.rootSlug] ?? fallbackCategoryTone).split(" ");
              return (
                <li key={id} id={`${listId}-${id}`} role="option" aria-selected={active === optionIndex(id)}>
                  <Link
                    href={`/urun/${product.slug}`}
                    onClick={close}
                    className={`flex min-h-12 items-center gap-3 px-3 py-2 ${active === optionIndex(id) ? "bg-brand-50" : "hover:bg-neutral-100"}`}
                  >
                    {/* Görsel gelene kadar ürünün kapağındaki gibi renkli baş harf. */}
                    <span aria-hidden className={`grid size-10 shrink-0 place-items-center rounded-lg text-lg font-extrabold ${tone[0]} ${tone[1]}`}>
                      {product.name.match(/[\p{L}\p{N}]/u)?.[0].toLocaleUpperCase("tr-TR")}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">{product.name}</span>
                      <span className="block truncate text-xs text-neutral-500">{product.categoryName}</span>
                    </span>
                    <span className="shrink-0 text-sm font-extrabold">{formatPrice(product.priceKurus)}</span>
                  </Link>
                </li>
              );
            })}

            {data.total > 0 && (
              <li id={`${listId}-all`} role="option" aria-selected={active === optionIndex("all")} className="sticky bottom-0 -mb-1.5 mt-1 border-t border-neutral-200 bg-raised">
                <Link
                  href={`/arama?q=${encodeURIComponent(trimmed)}`}
                  onClick={close}
                  className={`flex min-h-12 items-center justify-between gap-2 px-4 py-2 text-sm font-extrabold ${active === optionIndex("all") ? "bg-brand-50" : "hover:bg-neutral-100"}`}
                >
                  <span className="min-w-0 truncate">&ldquo;{trimmed}&rdquo; için tüm sonuçlar ({data.total})</span>
                  <ArrowRight size={16} aria-hidden className="shrink-0" />
                </Link>
              </li>
            )}
          </ul>

          {noResults && (
            <p className="px-4 py-5 text-center text-sm text-neutral-500">
              &ldquo;{trimmed}&rdquo; ile eşleşen bir şey bulunamadı. Farklı bir kelime deneyin.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
