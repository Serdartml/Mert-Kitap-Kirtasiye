import Link from "next/link";
import { ArrowRight, Gift } from "lucide-react";
import { campaignTexts, WELCOME_CAMPAIGN } from "@/lib/campaign";

// Ana sayfadaki hoş geldin kampanyası bandı (lib/campaign.ts). Sarı zemin, kalın siyah çerçeve, sert gölge:
// sitedeki kayan bant kartlarıyla aynı dil. Solda damga gibi büyük tutar, sağda üye ol düğmesi.
export default function WelcomeCampaignBanner({ className = "" }: { className?: string }) {
  if (!WELCOME_CAMPAIGN.active) return null;
  return (
    <section className={`container-page ${className}`} aria-labelledby="hos-geldin-kampanyasi">
      <div className="theme-fixed pattern-dots relative flex flex-col gap-5 overflow-hidden rounded-2xl border-[3px] border-ink bg-brand-500 p-5 text-ink shadow-[6px_6px_0_0_#111] sm:flex-row sm:items-center sm:gap-8 sm:p-7">
        {/* Damga: dönük, kesik çizgili daire içinde tutar */}
        <div
          aria-hidden
          className="mx-auto grid size-32 shrink-0 -rotate-6 place-items-center rounded-full border-4 border-dashed border-ink bg-white text-center shadow-[4px_4px_0_0_#111] sm:mx-0 sm:size-40"
        >
          <span>
            <span className="block text-4xl font-black leading-none tracking-tight sm:text-5xl">{campaignTexts.discount.replace(" TL", "")}</span>
            <span className="block text-lg font-extrabold leading-none sm:text-xl">TL</span>
            <span className="mt-1 block font-hand text-lg leading-none">indirim</span>
          </span>
        </div>

        <div className="min-w-0 flex-1 text-center sm:text-left">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-brand-500">
            <Gift size={14} aria-hidden /> Hoş geldin hediyesi
          </p>
          <h2 id="hos-geldin-kampanyasi" className="mt-2 text-2xl font-black leading-tight md:text-3xl">
            Üye ol, ilk siparişinde {campaignTexts.min} ve üzerine {campaignTexts.discount} indirim!
          </h2>
          <p className="mt-2 text-sm font-medium text-ink/80 sm:text-base">
            Kod yok, kupon yok: üye girişiyle verdiğin ilk siparişte indirim sepette kendiliğinden düşer.
          </p>
        </div>

        <div className="grid shrink-0 gap-2 sm:w-48">
          <Link href={`/kayit?sonra=${encodeURIComponent("/")}`} className="btn btn-dark min-h-12 text-base">
            Hemen Üye Ol <ArrowRight size={18} />
          </Link>
          <Link href={WELCOME_CAMPAIGN.href} className="btn min-h-11 border-2 border-ink bg-white text-sm hover:bg-brand-50">
            Kampanya koşulları
          </Link>
        </div>
      </div>
    </section>
  );
}
