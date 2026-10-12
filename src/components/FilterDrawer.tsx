"use client";

import { useRef } from "react";
import Form from "next/form";
import Link from "next/link";
import { SlidersHorizontal, X } from "lucide-react";
import { kurusToInput } from "@/lib/slug";

export interface FilterDrawerProps {
  // Formun gönderildiği adres (kategori sayfası) ve temizle bağlantısı (filtresiz hali).
  basePath: string;
  clearHref: string;
  // Filtre dışında korunacak adres parametreleri (sıralama, görünüm, stok).
  preserved: Record<string, string>;
  brands: { slug: string; name: string }[];
  selectedBrands: string[];
  min: string;
  max: string;
  // Kategorideki en düşük / en yüksek fiyat (kuruş): alanlarda ipucu olarak gösterilir.
  priceRange: { min: number | null; max: number | null };
}

// "Filtrele" düğmesi ve açılan çekmece: mobilde alttan çıkan sayfa, masaüstünde sağdan gelen panel.
// Form, next/form ile istemci tarafında gezinir (sayfa yenilenmez); sayfa numarası sıfırlanır.
export default function FilterDrawer({ basePath, clearHref, preserved, brands, selectedBrands, min, max, priceRange }: FilterDrawerProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const activeCount = selectedBrands.length + (min ? 1 : 0) + (max ? 1 : 0);

  const open = () => {
    dialog.current?.showModal();
    document.body.style.overflow = "hidden";
  };
  const close = () => dialog.current?.close();

  return (
    <>
      <button
        type="button"
        onClick={open}
        className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-2 text-xs font-bold sm:px-3 sm:py-1.5 ${
          activeCount > 0 ? "border-fg bg-fg text-surface" : "border-neutral-300 hover:border-fg"
        }`}
      >
        <SlidersHorizontal size={14} aria-hidden /> Filtrele{activeCount > 0 && ` (${activeCount})`}
      </button>

      <dialog
        ref={dialog}
        aria-label="Filtrele"
        onClose={() => {
          document.body.style.overflow = "";
        }}
        onClick={(event) => {
          if (event.target === dialog.current) close();
        }}
        className="fixed inset-x-0 bottom-0 top-auto m-0 max-h-[88svh] w-full max-w-none overflow-y-auto overscroll-contain rounded-t-2xl bg-raised p-0 text-fg shadow-2xl backdrop:bg-black/55 sm:inset-y-0 sm:left-auto sm:right-0 sm:h-full sm:max-h-none sm:max-w-sm sm:rounded-none"
      >
        <Form
          action={basePath}
          onSubmit={close}
          className="flex min-h-full flex-col p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6"
        >
          {Object.entries(preserved).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}

          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold">Filtrele</h2>
            <button type="button" onClick={close} aria-label="Kapat" className="grid size-10 place-items-center rounded-full hover:bg-neutral-100">
              <X size={18} aria-hidden />
            </button>
          </div>

          <fieldset className="mt-5">
            <legend className="text-sm font-extrabold">Fiyat aralığı (₺)</legend>
            <div className="mt-2 flex items-center gap-2">
              <label className="min-w-0 flex-1">
                <span className="sr-only">En düşük fiyat</span>
                <input
                  name="min"
                  defaultValue={min}
                  inputMode="decimal"
                  maxLength={10}
                  placeholder={priceRange.min !== null ? `En düşük ${kurusToInput(priceRange.min).replace(",00", "")}` : "En düşük"}
                  className="field w-full"
                />
              </label>
              <span aria-hidden className="text-neutral-400">–</span>
              <label className="min-w-0 flex-1">
                <span className="sr-only">En yüksek fiyat</span>
                <input
                  name="max"
                  defaultValue={max}
                  inputMode="decimal"
                  maxLength={10}
                  placeholder={priceRange.max !== null ? `En yüksek ${kurusToInput(priceRange.max).replace(",00", "")}` : "En yüksek"}
                  className="field w-full"
                />
              </label>
            </div>
          </fieldset>

          {brands.length > 0 && (
            <fieldset className="mt-6">
              <legend className="text-sm font-extrabold">Marka</legend>
              <ul className="mt-2 grid grid-cols-1 gap-1">
                {brands.map((brand) => (
                  <li key={brand.slug}>
                    {/* Tüm satır tıklanır; 44px yükseklik parmakla rahat basılır. */}
                    <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 hover:bg-neutral-100">
                      <input type="checkbox" name="marka" value={brand.slug} defaultChecked={selectedBrands.includes(brand.slug)} className="size-5 accent-brand-500" />
                      <span className="text-sm font-semibold">{brand.name}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
          )}

          <div className="mt-auto flex gap-2.5 pt-8">
            <Link href={clearHref} onClick={close} className="btn btn-outline min-h-12 flex-1">
              Temizle
            </Link>
            <button type="submit" className="btn btn-primary min-h-12 flex-[2]">
              Ürünleri göster
            </button>
          </div>
        </Form>
      </dialog>
    </>
  );
}
