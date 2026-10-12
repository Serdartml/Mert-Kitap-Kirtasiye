"use client";

import { useId, useState } from "react";

export interface DailyBar {
  // Eksendeki kısa etiket ("12 Eki") ve okuma için tam tarih.
  label: string;
  fullLabel: string;
  value: number;
  // Değerin biçimli hali ("3 sipariş", "₺1.249,00"); sunucuda biçimlenir, burada metin olarak gösterilir.
  valueLabel: string;
}

interface DailyBarsProps {
  title: string;
  subtitle: string;
  data: DailyBar[];
  // Y ekseninin üst değerinin biçimli hali.
  maxLabel: string;
  emptyText: string;
}

// Günlük sütun grafiği (tek seri: başlık neyin çizildiğini söyler, bu yüzden gösterge yok).
// Ölçüler grafik rehberine göre: sütun en çok 24px, üst uç 4px yuvarlak, taban düz; sütunlar arası 2px boşluk;
// ızgara ince ve sakin. Her sütun kendi ipucunu taşır (fare, dokunma ve klavye odağı aynı bilgiyi gösterir) ve
// tüm değerler "tablo olarak göster" bölümünde de vardır. Metinler veri rengini taşımaz; sütun rengi metin tonunda,
// seçili sütun marka sarısı + siyah çerçevedir (sarı beyaz zeminde tek başına okunmaz).
export default function DailyBars({ title, subtitle, data, maxLabel, emptyText }: DailyBarsProps) {
  const [active, setActive] = useState<number | null>(null);
  const captionId = useId();
  const max = Math.max(...data.map((bar) => bar.value), 0);
  const empty = max === 0;

  // İpucunun yatay hizası: kenardaki sütunlarda taşmasın diye kaydırılır.
  const tooltipShift = (index: number) => (index <= 1 ? 12 : index >= data.length - 2 ? 88 : 50);

  return (
    <figure aria-labelledby={captionId} className="rounded-xl border border-neutral-200 bg-raised p-4 sm:p-5">
      <figcaption id={captionId}>
        <span className="block text-lg font-extrabold">{title}</span>
        <span className="block text-sm text-neutral-600">{subtitle}</span>
      </figcaption>

      <div className="mt-4 flex gap-2">
        {/* Y ekseni: yalnızca tavan ve sıfır (kalanı ipucu ve tablo taşır). */}
        <div aria-hidden className="flex h-40 w-14 shrink-0 flex-col justify-between text-right text-xs tabular-nums text-neutral-500">
          <span>{empty ? "" : maxLabel}</span>
          <span>0</span>
        </div>

        <div className="relative h-40 min-w-0 flex-1" onPointerLeave={() => setActive(null)}>
          {/* Izgara: üst, orta ve taban; ince, düz, zeminden bir ton açık/koyu. */}
          <div aria-hidden className="absolute inset-0 flex flex-col justify-between">
            <span className="block h-px bg-neutral-200" />
            <span className="block h-px bg-neutral-200" />
            <span className="block h-px bg-neutral-300" />
          </div>

          {empty ? (
            <p className="absolute inset-0 grid place-items-center text-center text-sm text-neutral-500">{emptyText}</p>
          ) : (
            <div className="relative flex h-full items-end gap-[2px]">
              {data.map((bar, index) => {
                const isActive = active === index;
                return (
                  <button
                    key={bar.fullLabel}
                    type="button"
                    aria-label={`${bar.fullLabel}: ${bar.valueLabel}`}
                    onPointerEnter={() => setActive(index)}
                    onFocus={() => setActive(index)}
                    onBlur={() => setActive(null)}
                    onClick={() => setActive(isActive ? null : index)}
                    // Tıklama alanı sütunun kendisinden geniş: tüm yükseklik ve slot genişliği.
                    className="relative flex h-full min-w-0 flex-1 items-end justify-center outline-none"
                  >
                    <span
                      className={`block w-full max-w-6 rounded-t-[4px] transition-colors ${
                        isActive ? "bg-brand-500 outline outline-2 -outline-offset-1 outline-ink" : "bg-fg/80"
                      }`}
                      style={{ height: `${(bar.value / max) * 100}%`, minHeight: bar.value > 0 ? 3 : 0 }}
                    />
                    {isActive && (
                      <span
                        role="status"
                        className="pointer-events-none absolute bottom-full z-20 mb-1.5 w-max max-w-44 rounded-lg bg-ink px-2.5 py-1.5 text-left text-white shadow-lg"
                        style={{ left: "50%", transform: `translateX(-${tooltipShift(index)}%)` }}
                      >
                        <span className="block text-sm font-extrabold">{bar.valueLabel}</span>
                        <span className="block text-xs text-white/70">{bar.fullLabel}</span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* X ekseni: yalnızca ilk, orta ve son gün. */}
      <div aria-hidden className="mt-1.5 flex gap-2 text-xs text-neutral-500">
        <span className="w-14 shrink-0" />
        <span className="flex min-w-0 flex-1 justify-between">
          <span>{data[0]?.label}</span>
          <span>{data[Math.floor(data.length / 2)]?.label}</span>
          <span>{data[data.length - 1]?.label}</span>
        </span>
      </div>

      <details className="mt-3 text-sm">
        <summary className="inline-flex min-h-11 cursor-pointer items-center font-bold hover:underline">Tablo olarak göster</summary>
        <table className="mt-1 w-full text-left">
          <caption className="sr-only">{title}</caption>
          <thead>
            <tr className="border-b border-neutral-200 text-xs text-neutral-500">
              <th scope="col" className="py-1.5 font-bold">Gün</th>
              <th scope="col" className="py-1.5 text-right font-bold">Değer</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {data.map((bar) => (
              <tr key={bar.fullLabel}>
                <th scope="row" className="py-1.5 font-semibold">{bar.fullLabel}</th>
                <td className="py-1.5 text-right tabular-nums">{bar.valueLabel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
