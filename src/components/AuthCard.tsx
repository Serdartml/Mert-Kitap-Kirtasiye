import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import AuthForm from "./AuthForm";
import CategoryArt from "./CategoryArt";
import { Gift } from "lucide-react";
import { getCurrentUser, safeNextPath } from "@/lib/auth";
import { campaignTexts, WELCOME_CAMPAIGN } from "@/lib/campaign";

interface AuthCardProps {
  mode: "login" | "register";
  searchParams: Promise<{ sonra?: string; sifre?: string; eposta?: string }>;
}

const copy = {
  login: {
    title: "Giriş Yap",
    text: "Siparişlerinizi takip etmek için hesabınıza girin.",
    switchText: "Hesabınız yok mu?",
    switchLabel: "Üye olun",
    switchHref: "/kayit",
  },
  register: {
    title: "Üye Ol",
    text: "Siparişlerinizi tek yerden takip edin, bilgilerinizi her seferinde yeniden yazmayın.",
    switchText: "Zaten üye misiniz?",
    switchLabel: "Giriş yapın",
    switchHref: "/giris",
  },
};

// Giriş ve kayıt sayfalarının ortak gövdesi.
export default function AuthCard({ mode, searchParams }: AuthCardProps) {
  const text = copy[mode];

  return (
    <div className="container-page grid max-w-4xl gap-6 py-8 md:grid-cols-2 md:py-14">
      <div className="theme-fixed pattern-dots relative hidden overflow-hidden rounded-2xl bg-brand-500 p-8 md:block">
        <p className="inline-block -rotate-2 rounded-sm bg-ink px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-500 shadow-md">
          Hesabım
        </p>
        <p className="mt-5 text-3xl font-extrabold leading-tight">
          Kalem kutunuz
          <br />
          <span className="marker marker-light">hep yanınızda</span>
        </p>
        <CategoryArt rootSlug="kirtasiye" className="pointer-events-none absolute -bottom-2 -right-2 w-56 animate-float" />
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-raised p-5 sm:p-8">
        <h1 className="text-2xl font-extrabold">
          <span className="marker">{text.title}</span>
        </h1>
        <p className="mb-6 mt-2 text-sm text-neutral-600">{text.text}</p>
        {/* Hoş geldin kampanyası (lib/campaign.ts): kayıtta ve girişte hatırlatılır. */}
        {WELCOME_CAMPAIGN.active && (
          <Link
            href={WELCOME_CAMPAIGN.href}
            className="theme-fixed -mt-2 mb-6 flex items-start gap-2.5 rounded-xl border-2 border-ink bg-brand-500 p-3 text-sm text-ink shadow-[3px_3px_0_0_#111]"
          >
            <Gift size={20} aria-hidden className="mt-0.5 shrink-0" />
            <span>
              <span className="font-extrabold">
                {mode === "register" ? "Hoş geldin hediyesi: " : "Henüz sipariş vermediyseniz: "}
              </span>
              ilk siparişinizde {campaignTexts.min} ve üzerine {campaignTexts.discount} indirim.{" "}
              <span className="underline underline-offset-2">Koşullar</span>
            </span>
          </Link>
        )}
        {/* ?sonra= ve oturum çerezi istek anında okunur. */}
        <Suspense fallback={<AuthForm mode={mode} />}>
          <AuthFormWithNext mode={mode} searchParams={searchParams} />
        </Suspense>
        <Suspense fallback={null}>
          <SwitchLink mode={mode} searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function AuthFormWithNext({ mode, searchParams }: AuthCardProps) {
  const { sonra, sifre, eposta } = await searchParams;
  // Zaten giriş yapmış biri formu görmez.
  if (await getCurrentUser()) redirect(safeNextPath(sonra));
  return (
    <>
      {mode === "login" && sifre === "yenilendi" && (
        <p role="status" className="mb-4 rounded-xl bg-green-100 p-3 text-sm font-semibold text-green-800 dark:bg-green-950 dark:text-green-300">
          Parolanız yenilendi. Yeni parolanızla giriş yapabilirsiniz.
        </p>
      )}
      {mode === "login" && eposta === "dogrulandi" && (
        <p role="status" className="mb-4 rounded-xl bg-green-100 p-3 text-sm font-semibold text-green-800 dark:bg-green-950 dark:text-green-300">
          E-posta adresiniz doğrulandı. Giriş yapabilirsiniz.
        </p>
      )}
      <AuthForm mode={mode} next={sonra ? safeNextPath(sonra) : undefined} />
    </>
  );
}

// Giriş ile kayıt arasında geçerken dönülecek adres korunur.
async function SwitchLink({ mode, searchParams }: AuthCardProps) {
  const { sonra } = await searchParams;
  const text = copy[mode];
  const query = sonra ? `?sonra=${encodeURIComponent(safeNextPath(sonra))}` : "";

  return (
    <p className="mt-6 text-center text-sm text-neutral-600">
      {text.switchText}{" "}
      <Link href={`${text.switchHref}${query}`} className="font-bold text-fg underline underline-offset-2">
        {text.switchLabel}
      </Link>
    </p>
  );
}
