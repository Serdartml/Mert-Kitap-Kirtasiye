import Form from "next/form";
import { Search } from "lucide-react";

// Sipariş numarası kutusu: GET formu, /siparis-takip?no=... adresine gider (adres paylaşılabilir; JavaScript'siz de
// çalışır). Ana sayfadaki şeritte ve takip sayfasında kullanılır.
export default function OrderTrackBox({ defaultValue = "", autoFocus = false }: { defaultValue?: string; autoFocus?: boolean }) {
  return (
    <Form action="/siparis-takip" role="search" aria-label="Sipariş takibi" className="flex gap-2">
      <label className="min-w-0 flex-1">
        <span className="sr-only">Sipariş numarası</span>
        {/* Mobilde 16px: daha küçük yazı iOS'ta odaklanınca sayfayı yakınlaştırır. */}
        <input
          name="no"
          type="text"
          required
          defaultValue={defaultValue}
          autoFocus={autoFocus}
          maxLength={30}
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          autoComplete="off"
          placeholder="MK-261007-7HQ4KD"
          className="field font-bold uppercase tracking-wide placeholder:font-normal placeholder:normal-case placeholder:tracking-normal"
        />
      </label>
      <button type="submit" className="btn btn-primary min-h-12 shrink-0 px-5">
        <Search size={18} aria-hidden /> <span className="hidden min-[400px]:inline">Sorgula</span>
        <span className="sr-only min-[400px]:hidden">Sorgula</span>
      </button>
    </Form>
  );
}
