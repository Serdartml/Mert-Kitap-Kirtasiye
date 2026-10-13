import type { Metadata } from "next";
import Link from "next/link";
import { RequestResetForm } from "@/components/PasswordResetForms";

export const metadata: Metadata = {
  title: "Parolamı Unuttum",
  robots: { index: false },
};

export default function ForgotPasswordPage() {
  return (
    <div className="container-page max-w-md py-8 md:py-14">
      <div className="rounded-2xl border border-neutral-200 bg-raised p-5 sm:p-8">
        <h1 className="text-2xl font-extrabold">
          <span className="marker">Parolamı Unuttum</span>
        </h1>
        <p className="mb-6 mt-2 text-sm text-neutral-600">
          Üyelik e-posta adresinizi yazın, parolanızı sıfırlamanız için bir bağlantı gönderelim.
        </p>
        <RequestResetForm />
        <p className="mt-6 text-center text-sm text-neutral-600">
          <Link href="/giris" className="font-bold text-fg underline underline-offset-2">
            Girişe dön
          </Link>
        </p>
      </div>
    </div>
  );
}
