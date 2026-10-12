"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Check, Minus, Plus, ShoppingCart } from "lucide-react";
import { addManyToCart, type AddManyResult } from "@/actions/cart";
import { CART_ADDED_EVENT, type CartAddedDetail } from "./AddToCartButton";
import { formatPrice } from "@/lib/format";
import type { SchoolListOption } from "@/lib/catalog";

export interface BuilderRow {
  id: string;
  label: string;
  quantity: number;
  options: SchoolListOption[];
}

interface RowState {
  checked: boolean;
  optionId: string;
  quantity: number;
}

// Okula dönüş listesi: her satırda ürün seçilir, adet ayarlanır; seçilenler tek tuşla sepete eklenir.
// Stokta ürün bulunamayan satır pasiftir. Toplam seçimlerle birlikte canlı hesaplanır.
export default function SchoolListBuilder({ rows }: { rows: BuilderRow[] }) {
  const [state, setState] = useState<RowState[]>(() =>
    rows.map((row) => ({ checked: row.options.length > 0, optionId: row.options[0]?.id ?? "", quantity: row.quantity })),
  );
  const [result, setResult] = useState<AddManyResult | null>(null);
  const [pending, startTransition] = useTransition();

  const update = (index: number, patch: Partial<RowState>) => {
    setResult(null);
    setState((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const selected = useMemo(
    () =>
      rows.flatMap((row, index) => {
        const entry = state[index];
        const option = row.options.find((o) => o.id === entry.optionId);
        return entry.checked && option ? [{ option, quantity: Math.min(entry.quantity, option.stock) }] : [];
      }),
    [rows, state],
  );
  const totalKurus = selected.reduce((sum, item) => sum + item.option.priceKurus * item.quantity, 0);
  const totalCount = selected.reduce((sum, item) => sum + item.quantity, 0);

  const submit = () => {
    startTransition(async () => {
      const response = await addManyToCart(selected.map((item) => ({ productId: item.option.id, quantity: item.quantity })));
      setResult(response);
      if (response.ok) {
        window.dispatchEvent(
          new CustomEvent<CartAddedDetail>(CART_ADDED_EVENT, {
            detail: { name: `${response.added} ürün listeden eklendi`, message: response.message, adjusted: false },
          }),
        );
      }
    });
  };

  return (
    <div>
      <ul className="space-y-3">
        {rows.map((row, index) => {
          const entry = state[index];
          const option = row.options.find((o) => o.id === entry.optionId);
          const empty = row.options.length === 0;
          return (
            <li key={row.id} className={`rounded-xl border bg-raised p-3.5 sm:p-4 ${empty ? "border-neutral-200 opacity-70" : entry.checked ? "border-fg" : "border-neutral-200"}`}>
              <div className="flex items-start gap-3">
                {/* Tüm satır başlığı tıklanır; 44px'lik dokunma alanı. */}
                <label className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={entry.checked && !empty}
                    disabled={empty}
                    onChange={(event) => update(index, { checked: event.target.checked })}
                    className="size-5 shrink-0"
                  />
                  <span className="min-w-0 text-base font-extrabold">{row.label}</span>
                </label>
                {option && (
                  <span className="shrink-0 pt-2.5 text-sm font-extrabold">{formatPrice(option.priceKurus * Math.min(entry.quantity, option.stock))}</span>
                )}
              </div>

              {empty ? (
                <p className="mt-1 text-sm text-neutral-500 sm:pl-8">Bu kalem için şu an stokta ürün yok. Mağazamızdan sorabilirsiniz.</p>
              ) : (
                // Mobilde alt alta: ürün seçimi tam genişlik, altında adet ve birim fiyat. sm ve üstünde tek satır.
                <div className="mt-1 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:pl-8">
                  <label className="min-w-0 flex-1">
                    <span className="sr-only">{row.label} için ürün seçin</span>
                    <select
                      value={entry.optionId}
                      onChange={(event) => update(index, { optionId: event.target.value })}
                      className="field truncate"
                    >
                      {row.options.map((o) => (
                        // Fiyat satırda ve "Birim" yazısında zaten görünür; seçenekte ad kalır (mobilde fiyat "…" ile kesiliyordu).
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="flex items-center justify-between gap-3 sm:justify-start">
                    <div className="flex w-fit items-center rounded-lg border border-neutral-300" role="group" aria-label={`${row.label} adedi`}>
                      <button
                        type="button"
                        aria-label="Adedi azalt"
                        disabled={entry.quantity <= 1}
                        onClick={() => update(index, { quantity: entry.quantity - 1 })}
                        className="grid size-11 place-items-center disabled:opacity-30"
                      >
                        <Minus size={16} aria-hidden />
                      </button>
                      <span className="w-8 text-center text-sm font-bold" aria-live="polite">
                        {Math.min(entry.quantity, option?.stock ?? entry.quantity)}
                      </span>
                      <button
                        type="button"
                        aria-label="Adedi artır"
                        disabled={entry.quantity >= (option?.stock ?? 1)}
                        onClick={() => update(index, { quantity: entry.quantity + 1 })}
                        className="grid size-11 place-items-center disabled:opacity-30"
                      >
                        <Plus size={16} aria-hidden />
                      </button>
                    </div>
                    {option && (
                      <span className="text-right text-xs text-neutral-500 sm:text-left">
                        Birim {formatPrice(option.priceKurus)}
                        {option.stock <= 5 && <span className="block font-bold text-red-700 dark:text-red-400">Son {option.stock} adet</span>}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {/* Toplam ve ekleme düğmesi ekranın altına yapışır; liste uzasa da her zaman erişilir. */}
      <div data-bottom-bar className="sticky bottom-3 z-20 mt-5 rounded-2xl border border-neutral-200 bg-raised p-2.5 shadow-lg sm:p-4">
        <div className="flex items-center gap-3">
          <p className="min-w-0 flex-1 text-sm leading-tight">
            <span className="block text-xs text-neutral-600 sm:text-sm">{totalCount} ürün seçili</span>
            <span className="block truncate text-lg font-extrabold sm:text-xl">{formatPrice(totalKurus)}</span>
          </p>
          <button type="button" onClick={submit} disabled={pending || selected.length === 0} className="btn btn-primary min-h-12 shrink-0 px-4 sm:px-5">
            {pending ? (
              "Ekleniyor..."
            ) : result?.ok ? (
              <>
                <Check size={18} strokeWidth={3} aria-hidden /> Eklendi
              </>
            ) : (
              <>
                <ShoppingCart size={18} aria-hidden /> Sepete ekle
              </>
            )}
          </button>
        </div>
        {result && (
          <p role="status" className={`mt-2 text-sm font-semibold ${result.ok ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>
            {result.message}{" "}
            {result.ok && (
              <Link href="/sepet" className="underline">
                Sepete git
              </Link>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
