import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Gift, ShoppingCart, UserPlus } from "lucide-react";
import WelcomeCampaignBanner from "@/components/WelcomeCampaignBanner";
import { campaignTerms, campaignTexts, WELCOME_CAMPAIGN } from "@/lib/campaign";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Hoş Geldin Kampanyası",
  description: `${site.name}: üye olun, ilk siparişinizde ${campaignTexts.min} ve üzerine ${campaignTexts.discount} indirim.`,
};

const steps = [
  { icon: UserPlus, title: "Üye ol", text: "Ad, e-posta ve parolanla bir dakikada hesabını aç." },
  { icon: ShoppingCart, title: `${campaignTexts.min} ve üzeri sepet`, text: "Kırtasiye, kitap, hediyelik: sepetindeki tüm ürünler toplama dahil." },
  { icon: Gift, title: `${campaignTexts.discount} indirim`, text: "Kod girmeden, ödeme adımında toplamdan kendiliğinden düşer." },
];

// Hoş geldin kampanyasının tanıtım ve koşullar sayfası (lib/campaign.ts). Afişlerdeki QR kod buraya gelir.
export default function CampaignPage() {
  if (!WELCOME_CAMPAIGN.active) notFound();

  return (
    <div className="pb-12 pt-6 md:pb-16 md:pt-10">
      <WelcomeCampaignBanner />

      <section className="container-page mt-10 md:mt-14" aria-labelledby="nasil">
        <h2 id="nasil" className="text-xl font-extrabold md:text-2xl">
          <span className="marker">Nasıl yararlanırım?</span>
        </h2>
        <ol className="mt-5 grid gap-4 sm:grid-cols-3">
          {steps.map((step, index) => (
            <li key={step.title} className="relative rounded-2xl border-2 border-ink bg-raised p-5 shadow-[4px_4px_0_0_#111] dark:border-neutral-300">
              <span className="theme-fixed absolute -top-3 left-4 grid size-8 place-items-center rounded-full bg-ink text-sm font-black text-brand-500">
                {index + 1}
              </span>
              <step.icon size={26} aria-hidden className="mt-2" />
              <p className="mt-3 text-lg font-extrabold">{step.title}</p>
              <p className="mt-1 text-sm text-neutral-600">{step.text}</p>
            </li>
          ))}
        </ol>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={`/kayit?sonra=${encodeURIComponent("/")}`} className="btn btn-primary min-h-12">
            Üye Ol, İndirimi Kap <ArrowRight size={18} />
          </Link>
          <Link href="/" className="btn btn-outline min-h-12">Alışverişe Başla</Link>
        </div>
      </section>

      <section className="container-page mt-10 md:mt-14" aria-labelledby="kosullar">
        <h2 id="kosullar" className="text-xl font-extrabold md:text-2xl">Kampanya koşulları</h2>
        <ul className="mt-4 max-w-3xl list-disc space-y-2 pl-5 text-sm leading-relaxed text-neutral-700">
          {campaignTerms.map((term) => (
            <li key={term}>{term}</li>
          ))}
        </ul>
        <p className="mt-5 max-w-3xl text-sm text-neutral-600">
          Sorunuz mu var? Bizi <a href={site.phoneHref} className="font-bold underline underline-offset-2">{site.phone}</a> numarasından arayın ya da
          mağazamıza uğrayın: {site.address.full}.
        </p>
      </section>
    </div>
  );
}
