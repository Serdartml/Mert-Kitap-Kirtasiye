"use client";

import { useRef, useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Loader2 } from "lucide-react";
import { applyWeeklyImport, previewWeeklyImport, type WeeklyPreview } from "@/actions/weekly-import";
import { formatPrice } from "@/lib/format";
import type { WeeklyStats } from "@/lib/weekly-import";

type Preview = Extract<WeeklyPreview, { ok: true }>;

// Haftalık Turna dosyası: seç → önizle → onayla. Sütun eşleme yoktur, dosya biçimi sabittir.
export default function WeeklyImport() {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [zeroMissing, setZeroMissing] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [applied, setApplied] = useState<WeeklyStats | null>(null);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  const form = (selected: File, zero: boolean) => {
    const data = new FormData();
    data.set("file", selected);
    data.set("zeroMissing", zero ? "1" : "0");
    return data;
  };

  const load = (selected: File | null, zero: boolean) => {
    setFile(selected);
    setZeroMissing(zero);
    setApplied(null);
    setConfirming(false);
    setError("");
    setPreview(null);
    if (!selected) return;
    startTransition(async () => {
      const result = await previewWeeklyImport(form(selected, zero));
      if (result.ok) setPreview(result);
      else setError(result.error);
    });
  };

  const apply = () => {
    if (!file) return;
    startTransition(async () => {
      const result = await applyWeeklyImport(form(file, zeroMissing));
      setConfirming(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setApplied(result.stats);
      setPreview(null);
      setFile(null);
      if (input.current) input.current.value = "";
    });
  };

  const stats = preview?.stats;
  const changeCount = stats ? stats.created + stats.priceChanged + stats.stockChanged : 0;

  return (
    <div className="space-y-4">
      {applied && (
        <div role="status" className="rounded-xl border border-green-300 bg-green-50 p-4 text-sm text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
          <p className="flex items-center gap-2 font-extrabold">
            <CheckCircle2 size={18} aria-hidden /> Haftalık güncelleme tamamlandı
          </p>
          <p className="mt-1">
            {applied.stockChanged} stok ve {applied.priceChanged} fiyat güncellendi, {applied.created} yeni ürün eklendi, {applied.excluded} silinmiş ürün yeniden eklenmedi.
          </p>
          {applied.created > 0 && (
            <p className="mt-1">
              Yeni ürünlerin görselleri için bilgisayarda <code className="font-bold">npm run gorsel:yeni</code> komutunu çalıştırın.
            </p>
          )}
        </div>
      )}

      <section className="rounded-xl border border-neutral-200 bg-raised p-4 sm:p-5">
        <label className="block text-sm font-bold" htmlFor="weekly-file">
          Turna stok dosyası (.xlsx)
        </label>
        <input
          ref={input}
          id="weekly-file"
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(event) => load(event.target.files?.[0] ?? null, zeroMissing)}
          className="field mt-1 w-full"
        />
        <p className="mt-1.5 text-xs text-neutral-500">Sitedeki ürünlerin yalnızca stok ve fiyatı değişir, indirimler korunur. Silinen ürünler geri gelmez, yeni ürünler eklenir.</p>
        <label className="mt-3 flex items-start gap-2 text-sm">
          <input type="checkbox" checked={zeroMissing} onChange={(event) => load(file, event.target.checked)} className="mt-1" />
          <span>
            <span className="font-bold">Dosyada olmayan ürünlerin stoğunu 0 yap</span>
            <span className="block text-xs text-neutral-600">Turna dökümü tüm stoklu ürünleri içeriyorsa açın. Eksik ya da filtreli dosyada açmayın.</span>
          </span>
        </label>
      </section>

      {pending && !preview && (
        <p className="flex items-center gap-2 text-sm text-neutral-600" role="status">
          <Loader2 size={16} className="animate-spin" aria-hidden /> Dosya okunuyor...
        </p>
      )}

      {error && (
        <p role="alert" className="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden /> {error}
        </p>
      )}

      {preview && stats && (
        <section className="rounded-xl border border-neutral-200 bg-raised p-4 sm:p-5" aria-live="polite">
          <h2 className="flex flex-wrap items-center gap-2 font-extrabold">
            <FileSpreadsheet size={18} aria-hidden /> Önizleme <span className="text-xs font-normal text-neutral-500">(henüz hiçbir şey kaydedilmedi)</span>
          </h2>
          <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: "Stok değişecek", value: stats.stockChanged },
              { label: "Fiyat değişecek", value: stats.priceChanged },
              { label: "Yeni ürün", value: stats.created },
              { label: "Silinmiş, eklenmeyecek", value: stats.excluded },
            ].map((item) => (
              <div key={item.label} className="rounded-lg bg-neutral-100 px-3 py-2.5 dark:bg-white/5">
                <dt className="text-xs text-neutral-600">{item.label}</dt>
                <dd className="text-2xl font-extrabold">{item.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-neutral-600">
            {stats.discountKept} indirim korunuyor · {stats.unchanged} ürün zaten güncel · {stats.oldEdition} eski baskı ve {stats.undatedPrep} yılsız hazırlık kitabı eklenmiyor · {stats.notForSale} hizmet/kasa kalemi atlanıyor
            {stats.duplicates + stats.invalid > 0 ? ` · ${stats.duplicates + stats.invalid} tekrarlı ya da kodsuz satır atlanıyor` : ""}
          </p>
          {stats.missingFromFile > 0 && (
            <p className="mt-2 rounded-lg border border-brand-500 bg-brand-50 p-2.5 text-sm">
              Sitede stoklu {stats.missingFromFile} ürün bu dosyada yok. {zeroMissing ? "Stokları 0 yapılacak." : "Stokları değişmeyecek."}
            </p>
          )}
          {preview.newCategories.length > 0 && <p className="mt-2 text-sm"><b>Yeni kategoriler:</b> {preview.newCategories.join(", ")}</p>}

          {preview.sampleCreates.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-extrabold">Eklenecek ürün örnekleri</h3>
              <ul className="mt-1 divide-y divide-neutral-200 text-sm">
                {preview.sampleCreates.map((item) => (
                  <li key={item.sku} className="py-1.5">
                    <span className="font-bold">{item.name}</span>
                    <span className="block text-xs text-neutral-600">{formatPrice(item.priceKurus)} · stok {item.stock}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {preview.sampleUpdates.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-extrabold">Güncelleme örnekleri</h3>
              <ul className="mt-1 divide-y divide-neutral-200 text-sm">
                {preview.sampleUpdates.map((item) => (
                  <li key={item.sku} className="py-1.5">
                    <span className="font-bold">{item.name}</span>
                    <span className="block text-xs text-neutral-600">{item.changes.join(", ")}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            {!confirming ? (
              <button type="button" disabled={pending} onClick={() => setConfirming(true)} className="btn btn-primary disabled:opacity-50">
                {changeCount === 0 ? "Kaydet" : "Güncellemeyi uygula"}
              </button>
            ) : (
              <>
                <button type="button" disabled={pending} onClick={apply} className="btn btn-dark disabled:opacity-60">
                  {pending ? "Uygulanıyor..." : "Evet, uygula"}
                </button>
                <button type="button" disabled={pending} onClick={() => setConfirming(false)} className="btn btn-outline">
                  Vazgeç
                </button>
              </>
            )}
            {pending && <Loader2 size={16} className="animate-spin" aria-hidden />}
          </div>
        </section>
      )}
    </div>
  );
}
