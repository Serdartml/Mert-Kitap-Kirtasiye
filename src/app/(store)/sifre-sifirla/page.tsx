import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { NewPasswordForm } from "@/components/PasswordResetForms";

export const metadata: Metadata = {
  title: "Yeni Parola",
  robots: { index: false },
};

export default function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  return (
    <div className="container-page max-w-md py-8 md:py-14">
      <div className="rounded-2xl border border-neutral-200 bg-raised p-5 sm:p-8">
        <h1 className="text-2xl font-extrabold">
          <span className="marker">Yeni Parola</span>
        </h1>
        {/* ?token= istek anında okunur. */}
        <Suspense fallback={null}>
          <ResetBody searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function ResetBody({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  if (!token) {
    return (
      <p className="mt-4 text-sm text-neutral-600">
        Bu bağlantı eksik. E-postanızdaki bağlantıyı açın ya da{" "}
        <Link href="/sifremi-unuttum" className="font-bold text-fg underline underline-offset-2">
          yeni bir bağlantı isteyin
        </Link>
        .
      </p>
    );
  }
  return (
    <>
      <p className="mb-6 mt-2 text-sm text-neutral-600">Hesabınız için yeni bir parola belirleyin.</p>
      <NewPasswordForm token={token} />
    </>
  );
}
