import Link from "next/link";
import { Gift } from "lucide-react";
import { campaignHintText, WELCOME_CAMPAIGN, type CampaignHint } from "@/lib/campaign";

// Sepet ve ödeme özetinde hoş geldin kampanyasının durumu: uygulandı / şu kadar daha ekleyin / üye olun.
// next: üye ol / giriş bağlantılarından sonra dönülecek sayfa.
export default function CampaignHintBox({ hint, next }: { hint: CampaignHint; next: string }) {
  if (!hint) return null;
  const applied = hint.kind === "applied";
  return (
    <div
      className={`theme-fixed mt-4 flex gap-2.5 rounded-xl border-2 p-3 text-sm ${
        applied ? "border-ink bg-brand-500 text-ink" : "border-dashed border-ink/40 bg-brand-50 text-ink dark:border-neutral-400"
      }`}
    >
      <Gift size={20} aria-hidden className="mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="font-bold">{campaignHintText(hint)}</p>
        <p className="mt-1 text-xs">
          {hint.kind === "sign-up" && (
            <>
              <Link href={`/kayit?sonra=${encodeURIComponent(next)}`} className="font-extrabold underline underline-offset-2">Üye ol</Link>
              {" · "}
              <Link href={`/giris?sonra=${encodeURIComponent(next)}`} className="font-extrabold underline underline-offset-2">Giriş yap</Link>
              {" · "}
            </>
          )}
          <Link href={WELCOME_CAMPAIGN.href} className="underline underline-offset-2">Kampanya koşulları</Link>
        </p>
      </div>
    </div>
  );
}
