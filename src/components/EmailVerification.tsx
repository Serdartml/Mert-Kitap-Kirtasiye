"use client";

import { MailCheck } from "lucide-react";
import { resendVerification, verifyEmail, type ResendState } from "@/actions/account";
import { useServerForm } from "@/components/admin/useServerForm";

// E-postadaki bağlantının açtığı sayfadaki onay düğmesi.
export function VerifyEmailForm({ token }: { token: string }) {
  const { state, pending, onSubmit } = useServerForm(verifyEmail);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      {state.error && (
        <p role="alert" className="text-sm font-semibold text-red-700 dark:text-red-400">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn btn-primary w-full">
        {pending ? "Doğrulanıyor..." : "Doğrula"}
      </button>
    </form>
  );
}

// Hesap sayfalarının üstündeki hatırlatma: e-posta doğrulanmamışsa gösterilir, bağlantı yeniden istenebilir.
export function VerifyEmailBanner({ email }: { email: string }) {
  const { state, pending, onSubmit } = useServerForm<ResendState>(async () => resendVerification());

  return (
    <div role="status" className="mb-6 rounded-xl border-2 border-brand-500 bg-brand-50 p-4 text-sm">
      <p className="flex items-start gap-2 font-bold">
        <MailCheck size={18} className="mt-0.5 shrink-0" aria-hidden /> E-posta adresinizi doğrulayın
      </p>
      {state.message ? (
        <p className="mt-1.5 font-semibold text-green-800 dark:text-green-300">{state.message}</p>
      ) : (
        <>
          <p className="mt-1.5 text-neutral-700">
            <span className="break-all">{email}</span> adresine bir doğrulama bağlantısı gönderdik. Gelmediyse yeniden isteyebilirsiniz. Doğrulama olmadan da alışveriş yapabilirsiniz.
          </p>
          {state.error && (
            <p role="alert" className="mt-1.5 font-semibold text-red-700 dark:text-red-400">
              {state.error}
            </p>
          )}
          <form onSubmit={onSubmit} className="mt-3">
            <button type="submit" disabled={pending} className="btn btn-outline min-h-11 py-2">
              {pending ? "Gönderiliyor..." : "Bağlantıyı yeniden gönder"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
