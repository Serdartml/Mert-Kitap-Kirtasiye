import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import AuthForm from "./AuthForm";
import CategoryArt from "./CategoryArt";
import { getCurrentUser, safeNextPath } from "@/lib/auth";

interface AuthCardProps {
  mode: "login" | "register";
  searchParams: Promise<{ sonra?: string }>;
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
  const { sonra } = await searchParams;
  // Zaten giriş yapmış biri formu görmez.
  if (await getCurrentUser()) redirect(safeNextPath(sonra));
  return <AuthForm mode={mode} next={sonra ? safeNextPath(sonra) : undefined} />;
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
