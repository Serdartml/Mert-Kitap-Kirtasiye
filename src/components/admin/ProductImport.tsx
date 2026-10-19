"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Loader2 } from "lucide-react";
import { applyImport, previewImport, type ApplyResult, type PreviewResult } from "@/actions/product-import";
import { formatPrice } from "@/lib/format";
import { IMPORT_FIELDS, type ImportMode, type Mapping } from "@/lib/product-import";

type Preview = Extract<PreviewResult, { ok: true }>;
type Applied = Extract<ApplyResult, { ok: true }>;

const VAT_OPTIONS = [
  { value: "", label: "KDV dahil (olduğu gibi)" },
  { value: "1", label: "KDV hariç, +%1" },
  { value: "10", label: "KDV hariç, +%10" },
  { value: "20", label: "KDV hariç, +%20" },
];

// Excel'den ürün içe aktarma: dosya seç → önizleme (hiçbir şey yazılmaz) → onayla. Dosya, önizleme ile uygulama arasında
// bu bileşende tutulur; seçenekler ya da sütun eşlemesi değişince önizleme yenilenir.
export default function ProductImport() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<ImportMode>("stok");
  const [vat, setVat] = useState("");
  const [createCategories, setCreateCategories] = useState(false);
  const [subtractReserved, setSubtractReserved] = useState(true);
  const [mapping, setMapping] = useState<Mapping | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState("");
  const [applied, setApplied] = useState<Applied | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  const build = (next: { file: File; mode: ImportMode; vat: string; createCategories: boolean; subtractReserved: boolean; mapping: Mapping | null }) => {
    const formData = new FormData();
    formData.set("file", next.file);
    formData.set("mode", next.mode);
    formData.set("vat", next.vat);
    formData.set("createCategories", next.createCategories ? "1" : "0");
    formData.set("subtractReserved", next.subtractReserved ? "1" : "0");
    if (next.mapping) formData.set("mapping", JSON.stringify(next.mapping));
    return formData;
  };

  const run = (next: Partial<{ file: File | null; mode: ImportMode; vat: string; createCategories: boolean; subtractReserved: boolean; mapping: Mapping | null }>) => {
    const state = { file, mode, vat, createCategories, subtractReserved, mapping, ...next };
    if ("file" in next) setFile(next.file ?? null);
    if (next.mode !== undefined) setMode(next.mode);
    if (next.vat !== undefined) setVat(next.vat);
    if (next.createCategories !== undefined) setCreateCategories(next.createCategories);
    if (next.subtractReserved !== undefined) setSubtractReserved(next.subtractReserved);
    if ("mapping" in next) setMapping(next.mapping ?? null);

    setApplied(null);
    setConfirming(false);
    const selected = state.file;
    if (!selected) {
      setPreview(null);
      return;
    }
    startTransition(async () => {
      const result = await previewImport(build({ ...state, file: selected }));
      if (!result.ok) {
        setError(result.error);
        setPreview(null);
        return;
      }
      setError("");
      setPreview(result);
      // Eşleme ilk seferde dosyadan tahmin edilir; sonra kullanıcının seçimi korunur.
      setMapping((current) => current ?? result.mapping);
    });
  };

  const apply = () => {
    if (!file) return;
    startTransition(async () => {
      const result = await applyImport(build({ file, mode, vat, createCategories, subtractReserved, mapping }));
      setConfirming(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError("");
      setApplied(result);
      setPreview(null);
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
    });
  };

  const summary = preview?.summary;
  const total = summary ? summary.creates + summary.updates : 0;

  return (
    <div className="space-y-6">
      {applied && (
        <div role="status" className="rounded-xl border border-green-300 bg-green-50 p-4 text-sm text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
          <p className="flex items-center gap-2 font-extrabold">
            <CheckCircle2 size={18} aria-hidden /> Aktarım tamamlandı
          </p>
          <p className="mt-1">
            {applied.created} ürün eklendi, {applied.updated} ürün güncellendi, {applied.unchanged} ürün zaten günceldi
            {applied.skipped > 0 ? `, ${applied.skipped} satır atlandı` : ""}.
            {applied.newCategories > 0 ? ` ${applied.newCategories} yeni kategori açıldı.` : ""}
            {applied.newBrands > 0 ? ` ${applied.newBrands} yeni marka açıldı.` : ""}
          </p>
          <Link href="/yonetim/urunler" className="mt-2 inline-block font-bold underline">
            Ürünlere git
          </Link>
        </div>
      )}

      <section className="rounded-xl border border-neutral-200 bg-raised p-4 sm:p-5">
        <h2 className="font-extrabold">1. Dosya ve seçenekler</h2>

        <label className="mt-3 block text-sm font-bold" htmlFor="import-file">
          Excel dosyası (.xlsx)
        </label>
        <input
          ref={fileInput}
          id="import-file"
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(event) => run({ file: event.target.files?.[0] ?? null, mapping: null })}
          className="field mt-1 w-full"
        />
        <p className="mt-1.5 text-xs text-neutral-500">
          İlk sayfa okunur, ilk satır başlıktır.{" "}
          {/* Sayfa değil dosya indirme (route handler): Link ile gezinme yanlış olur. */}
          <a href="/yonetim/urunler/ice-aktar/sablon" download className="inline-flex items-center gap-1 font-bold underline">
            <Download size={12} aria-hidden /> Örnek şablonu indir
          </a>
        </p>

        <fieldset className="mt-4">
          <legend className="text-sm font-bold">Ne yapılsın?</legend>
          <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
            {(
              [
                { value: "stok", title: "Yalnızca stok ve fiyat güncelle", text: "Katalogda olan ürünlerin stoku ve fiyatı değişir. Yeni ürün eklenmez, ad ve kategori değişmez." },
                { value: "tam", title: "Ürünleri içe aktar", text: "Yeni ürünler eklenir; var olanların adı, kategorisi, markası ve açıklaması da dosyaya göre güncellenir." },
              ] as const
            ).map((option) => (
              <label key={option.value} className={`flex cursor-pointer gap-2.5 rounded-lg border p-3 text-sm ${mode === option.value ? "border-brand-500 bg-brand-50" : "border-neutral-300"}`}>
                <input type="radio" name="mode" value={option.value} checked={mode === option.value} onChange={() => run({ mode: option.value })} className="mt-1" />
                <span>
                  <span className="block font-bold">{option.title}</span>
                  <span className="block text-xs text-neutral-600">{option.text}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-sm font-bold" htmlFor="import-vat">
              Dosyadaki fiyatlar
            </label>
            <select id="import-vat" value={vat} onChange={(event) => run({ vat: event.target.value })} className="field mt-1 w-full">
              {VAT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-neutral-500">Sitedeki fiyatlar KDV dahildir.</p>
          </div>
          <div className="space-y-2 text-sm">
            <label className="flex items-start gap-2">
              <input type="checkbox" checked={subtractReserved} onChange={(event) => run({ subtractReserved: event.target.checked })} className="mt-1" />
              <span>
                <span className="font-bold">Açık siparişlerin ayırdığı stoğu düş</span>
                <span className="block text-xs text-neutral-600">Henüz teslim edilmemiş siparişlerin ürünleri Turna&apos;da düşmemiştir; stok yazılırken çıkarılır.</span>
              </span>
            </label>
            {mode === "tam" && (
              <label className="flex items-start gap-2">
                <input type="checkbox" checked={createCategories} onChange={(event) => run({ createCategories: event.target.checked })} className="mt-1" />
                <span>
                  <span className="font-bold">Bilinmeyen kategorileri oluştur</span>
                  <span className="block text-xs text-neutral-600">Kapalıysa kategorisi bulunamayan satırlar atlanır ve listelenir.</span>
                </span>
              </label>
            )}
          </div>
        </div>
      </section>

      {pending && !summary && !error && (
        <p className="flex items-center gap-2 text-sm text-neutral-600" role="status">
          <Loader2 size={16} className="animate-spin" aria-hidden /> Dosya okunuyor...
        </p>
      )}

      {error && (
        <p role="alert" className="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden /> {error}
        </p>
      )}

      {preview && mapping && (
        <>
          <section className="rounded-xl border border-neutral-200 bg-raised p-4 sm:p-5">
            <details open={preview.missing.length > 0}>
              <summary className="cursor-pointer font-extrabold">2. Sütun eşleme ({preview.rowCount} satır)</summary>
              <p className="mt-2 text-xs text-neutral-600">Sütunlar başlıklardan otomatik bulundu. Yanlışsa buradan değiştirin; önizleme yenilenir.</p>
              <div className="mt-3 grid gap-x-4 gap-y-2.5 sm:grid-cols-2">
                {IMPORT_FIELDS.map((field) => (
                  <div key={field.key}>
                    <label className="text-sm font-bold" htmlFor={`map-${field.key}`}>
                      {field.label} <span className="font-normal text-neutral-500">{field.hint && `· ${field.hint}`}</span>
                    </label>
                    <select
                      id={`map-${field.key}`}
                      value={mapping[field.key] ?? ""}
                      onChange={(event) => {
                        const next = { ...mapping };
                        if (event.target.value === "") delete next[field.key];
                        else next[field.key] = Number(event.target.value);
                        run({ mapping: next });
                      }}
                      className="field mt-0.5 w-full"
                    >
                      <option value="">— yok —</option>
                      {preview.headers.map((header, index) => (
                        <option key={index} value={index}>
                          {header || `(sütun ${index + 1})`}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </details>
            {preview.missing.length > 0 && (
              <p role="alert" className="mt-3 flex items-start gap-2 text-sm font-semibold text-red-800 dark:text-red-300">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden /> Eşlenmesi gereken sütun var: {preview.missing.join(", ")}.
              </p>
            )}
          </section>

          {summary && (
            <section className="rounded-xl border border-neutral-200 bg-raised p-4 sm:p-5" aria-live="polite">
              <h2 className="flex items-center gap-2 font-extrabold">
                <FileSpreadsheet size={18} aria-hidden /> 3. Önizleme <span className="text-xs font-normal text-neutral-500">(henüz hiçbir şey kaydedilmedi)</span>
              </h2>
              <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { label: "Eklenecek", value: summary.creates },
                  { label: "Güncellenecek", value: summary.updates },
                  { label: "Zaten güncel", value: summary.unchanged },
                  { label: "Atlanacak (hatalı)", value: summary.errorCount },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg bg-neutral-100 px-3 py-2.5 dark:bg-white/5">
                    <dt className="text-xs text-neutral-600">{item.label}</dt>
                    <dd className="text-2xl font-extrabold">{item.value}</dd>
                  </div>
                ))}
              </dl>

              {(summary.newCategories.length > 0 || summary.newBrands.length > 0) && (
                <p className="mt-3 text-sm">
                  {summary.newCategories.length > 0 && (
                    <span className="block">
                      <b>Yeni kategoriler:</b> {summary.newCategories.map((category) => `${category.path.join(" > ")} (${category.rows})`).join(", ")}
                    </span>
                  )}
                  {summary.newBrands.length > 0 && (
                    <span className="block">
                      <b>Yeni markalar:</b> {summary.newBrands.slice(0, 20).join(", ")}
                      {summary.newBrands.length > 20 ? ` ve ${summary.newBrands.length - 20} tane daha` : ""}
                    </span>
                  )}
                </p>
              )}

              {summary.sampleUpdates.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-extrabold">Güncelleme örnekleri</h3>
                  <ul className="mt-1 divide-y divide-neutral-200 text-sm">
                    {summary.sampleUpdates.map((item) => (
                      <li key={item.sku} className="py-1.5">
                        <span className="font-bold">{item.name}</span> <span className="text-xs text-neutral-500">{item.sku}</span>
                        <span className="block text-xs text-neutral-600">{item.changes.join(", ")}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {summary.sampleCreates.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-extrabold">Eklenecek ürün örnekleri</h3>
                  <ul className="mt-1 divide-y divide-neutral-200 text-sm">
                    {summary.sampleCreates.map((item) => (
                      <li key={item.sku} className="py-1.5">
                        <span className="font-bold">{item.name}</span> <span className="text-xs text-neutral-500">{item.sku}</span>
                        <span className="block text-xs text-neutral-600">
                          {formatPrice(item.priceKurus)} · stok {item.stock} · {item.category}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {summary.errorCount > 0 && (
                <details className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950">
                  <summary className="cursor-pointer text-sm font-extrabold text-red-800 dark:text-red-300">
                    {summary.errorCount} satır atlanacak{summary.errorCount > summary.errors.length ? ` (ilk ${summary.errors.length} gösteriliyor)` : ""}
                  </summary>
                  <ul className="mt-2 max-h-72 space-y-1 overflow-y-auto text-xs">
                    {summary.errors.map((item, index) => (
                      <li key={index}>
                        <b>Satır {item.line}</b>
                        {item.sku ? ` (${item.sku})` : ""}: {item.message}
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              {summary.warningCount > 0 && (
                <details className="mt-3 rounded-lg border border-neutral-300 p-3">
                  <summary className="cursor-pointer text-sm font-bold">{summary.warningCount} uyarı (satırlar yine de işlenir)</summary>
                  <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-xs">
                    {summary.warnings.map((item, index) => (
                      <li key={index}>
                        <b>Satır {item.line}</b>
                        {item.sku ? ` (${item.sku})` : ""}: {item.message}
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              <div className="mt-5 flex flex-wrap items-center gap-3">
                {!confirming ? (
                  <button type="button" disabled={pending || total === 0} onClick={() => setConfirming(true)} className="btn btn-primary disabled:opacity-50">
                    {total === 0 ? "Değişecek ürün yok" : `${total} ürünü uygula`}
                  </button>
                ) : (
                  <>
                    <button type="button" disabled={pending} onClick={apply} className="btn btn-dark disabled:opacity-60">
                      {pending ? "Uygulanıyor..." : `Evet, ${summary.creates} ekle ${summary.updates} güncelle`}
                    </button>
                    <button type="button" disabled={pending} onClick={() => setConfirming(false)} className="btn btn-outline">
                      Vazgeç
                    </button>
                  </>
                )}
                {pending && <Loader2 size={16} className="animate-spin" aria-hidden />}
              </div>
              <p className="mt-2 text-xs text-neutral-500">Uygulama tek işlemdir: bir hata olursa hiçbir ürün değişmez. Ürün görselleri ve “öne çıkan” işaretleri korunur.</p>
            </section>
          )}
        </>
      )}
    </div>
  );
}
