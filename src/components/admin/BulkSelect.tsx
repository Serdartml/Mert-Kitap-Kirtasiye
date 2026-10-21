"use client";

import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { Star, Trash2 } from "lucide-react";

// Ürün listesinde toplu seçim ve silme. Seçim sayfalar arasında kalsın diye tarayıcı oturumunda (sekme kapanana kadar)
// saklanır; hem mobil kartlar hem masaüstü tablo aynı seçimi paylaşır. Form yalnızca araç çubuğunu sarar; seçili
// kimlikler gizli alanlarla gönderilir.

const STORAGE_KEY = "yonetim-urun-secimi";
// Tek seferde gönderilebilecek en fazla kimlik (sunucudaki sınırla aynı); fazlası için "tüm sonuçlar" seçilir.
export const MAX_SELECTED = 5000;
// Bu kadar üründen fazlası silinirken ek onay olarak "sil" yazılması istenir.
const TYPED_CONFIRM_FROM = 25;

interface Stored {
  ids: string[];
  // Boş değilse "bu aramadaki tüm ürünler" seçilidir; değer, seçimin yapıldığı süzgecin imzasıdır (başka süzgeçte geçersiz).
  all: string;
}

const EMPTY: Stored = { ids: [], all: "" };
let current: Stored | null = null;
const listeners = new Set<() => void>();

function load(): Stored {
  try {
    const parsed: unknown = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "null");
    if (parsed && typeof parsed === "object" && Array.isArray((parsed as Stored).ids)) {
      const { ids, all } = parsed as Stored;
      return { ids: ids.filter((id) => typeof id === "string"), all: typeof all === "string" ? all : "" };
    }
  } catch {
    // Depolama kapalı ya da bozuk: boş seçimle devam.
  }
  return EMPTY;
}

const getSnapshot = (): Stored => (current ??= load());
const getServerSnapshot = (): Stored => EMPTY;

function setStored(next: Stored) {
  current = next;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Depolama yazılamıyorsa seçim yalnızca bu sayfada kalır.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

interface Selection {
  isSelected: (id: string) => boolean;
  toggle: (id: string) => void;
}

const SelectionContext = createContext<Selection | null>(null);

interface BulkSelectProps {
  // Bu sayfadaki ürünlerin kimlikleri.
  pageIds: string[];
  // Filtreye uyan tüm ürünlerin sayısı (sayfa sayısından büyük olabilir).
  total: number;
  // "Tüm sonuçları seç" için: sunucu aynı filtreyle listeyi yeniden kurar.
  filter: { q: string; kategori: string; filtre: string };
  // Silme tamamlandıktan sonraki sayfada true: saklanan seçim temizlenir.
  reset: boolean;
  deleteAction: (formData: FormData) => void | Promise<void>;
  // Toplu öne çıkarma; aynı seçimle (gizli alanlar) gönderilir.
  editAction: (formData: FormData) => void | Promise<void>;
  children: ReactNode;
}

const EDIT_OPERATIONS = [
  { value: "one-cikar", label: "Öne çıkanlara ekle" },
  { value: "one-cikarma", label: "Öne çıkanlardan kaldır" },
] as const;

export default function BulkSelect({ pageIds, total, filter, reset, deleteAction, editAction, children }: BulkSelectProps) {
  const [operation, setOperation] = useState<(typeof EDIT_OPERATIONS)[number]["value"]>("one-cikar");
  const operationConfig = EDIT_OPERATIONS.find((item) => item.value === operation)!;
  const stored = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const signature = `${filter.q}|${filter.kategori}|${filter.filtre}`;
  const allMatching = stored.all !== "" && stored.all === signature;

  useEffect(() => {
    if (reset) setStored(EMPTY);
  }, [reset]);

  const selected = useMemo(() => new Set(stored.ids), [stored.ids]);
  const isSelected = (id: string) => allMatching || selected.has(id);

  const selection = useMemo<Selection>(
    () => ({
      isSelected: (id) => allMatching || selected.has(id),
      toggle: (id) => {
        // "Tüm sonuçlar" modundayken tek ürünü çıkarmak, seçimi bu sayfadaki ürünlere indirir.
        const base = allMatching ? pageIds : stored.ids;
        setStored({ ids: base.includes(id) ? base.filter((item) => item !== id) : [...base, id], all: "" });
      },
    }),
    [allMatching, selected, pageIds, stored.ids],
  );

  const pageSelected = pageIds.length > 0 && pageIds.every(isSelected);
  const count = allMatching ? total : selected.size;
  const tooMany = count > MAX_SELECTED;

  const togglePage = () => {
    if (allMatching) return setStored(EMPTY);
    const rest = stored.ids.filter((id) => !pageIds.includes(id));
    setStored({ ids: pageSelected ? rest : [...rest, ...pageIds], all: "" });
  };
  const clear = () => setStored(EMPTY);

  return (
    <SelectionContext.Provider value={selection}>
      <form action={deleteAction} className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-neutral-200 bg-raised px-3 py-2">
        <label className="flex min-h-10 cursor-pointer items-center gap-2.5 text-sm font-bold">
          <input type="checkbox" checked={pageSelected} onChange={togglePage} disabled={pageIds.length === 0} className="size-5 shrink-0 accent-brand-500" />
          Sayfadakileri seç
        </label>

        {allMatching ? (
          <>
            <input type="hidden" name="scope" value="all" />
            <input type="hidden" name="q" value={filter.q} />
            <input type="hidden" name="kategori" value={filter.kategori} />
            <input type="hidden" name="filtre" value={filter.filtre} />
          </>
        ) : (
          stored.ids.map((id) => <input key={id} type="hidden" name="ids" value={id} />)
        )}

        <span className="text-sm text-neutral-600" aria-live="polite">
          {count > 0 ? (
            <>
              <span className="font-bold text-fg">{count}</span> {allMatching ? "ürün (bu aramadaki tümü)" : "ürün"} seçili
            </>
          ) : (
            "Seçili ürün yok"
          )}
        </span>

        {pageSelected && !allMatching && total > pageIds.length && (
          <button type="button" onClick={() => setStored({ ids: [], all: signature })} className="text-sm font-bold underline">
            Bu aramadaki tüm {total} ürünü seç
          </button>
        )}
        {count > 0 && (
          <button type="button" onClick={clear} className="text-sm font-bold text-neutral-600 underline">
            Seçimi kaldır
          </button>
        )}
        {tooMany && (
          <span role="alert" className="basis-full text-sm font-semibold text-red-700 dark:text-red-400">
            Tek seferde en fazla {MAX_SELECTED} ürün seçilebilir. Daha fazlası için filtreleyip &quot;Bu aramadaki tüm ürünü seç&quot; seçeneğini kullanın.
          </span>
        )}

        {/* Toplu öne çıkarma (indirim ürün sayfasından düzenlenir). Silme düğmesinden ayrı eylemle gönderilir. */}
        <div className="flex basis-full flex-wrap items-center gap-2 border-t border-neutral-200 pt-2">
          <select name="islem" value={operation} onChange={(event) => setOperation(event.target.value as typeof operation)} aria-label="Toplu işlem" className="field min-w-0 flex-1 sm:max-w-64 sm:flex-none">
            {EDIT_OPERATIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            formAction={editAction}
            formNoValidate
            disabled={count === 0 || tooMany}
            className="btn btn-dark py-2 disabled:cursor-not-allowed disabled:opacity-40"
            onClick={(event) => {
              if (!window.confirm(`${count} ürün için "${operationConfig.label}" uygulanacak. Emin misiniz?`)) event.preventDefault();
            }}
          >
            <Star size={16} aria-hidden /> Seçilenlere uygula
          </button>
        </div>

        <button
          type="submit"
          formNoValidate
          disabled={count === 0 || tooMany}
          className="btn ml-auto border border-red-300 py-2 text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
          onClick={(event) => {
            const message = `${count} ürün kalıcı olarak silinecek. Bu işlem geri alınamaz; siparişler korunur ama ürüne bağlantıları kopar.`;
            if (count >= TYPED_CONFIRM_FROM) {
              const answer = window.prompt(`${message}\n\nOnaylamak için SİL yazın.`);
              if (answer?.trim().toLocaleLowerCase("tr") !== "sil") event.preventDefault();
            } else if (!window.confirm(`${message} Emin misiniz?`)) {
              event.preventDefault();
            }
          }}
        >
          <Trash2 size={16} aria-hidden /> Seçilenleri sil
        </button>
      </form>
      {children}
    </SelectionContext.Provider>
  );
}

// Satırdaki onay kutusu; BulkSelect içinde kullanılmalıdır.
export function BulkCheckbox({ id, label }: { id: string; label: string }) {
  const selection = useContext(SelectionContext);
  if (!selection) return null;
  return (
    <input
      type="checkbox"
      checked={selection.isSelected(id)}
      onChange={() => selection.toggle(id)}
      aria-label={`Seç: ${label}`}
      className="size-5 shrink-0 cursor-pointer accent-brand-500"
    />
  );
}
