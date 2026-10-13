"use client";

import { requestPasswordReset, resetPassword } from "@/actions/account";
import { useServerForm } from "@/components/admin/useServerForm";

const errorClass = "text-sm font-semibold text-red-700 dark:text-red-400";

// Parola sıfırlama isteği: e-posta adresi alır, bağlantıyı e-postayla gönderir.
export function RequestResetForm() {
  const { state, pending, onSubmit } = useServerForm(requestPasswordReset);

  if (state.message) {
    return (
      <p role="status" className="rounded-xl bg-green-100 p-4 text-sm font-semibold text-green-800 dark:bg-green-950 dark:text-green-300">
        {state.message}
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block text-sm font-bold">
        E-posta
        <input name="email" type="email" required maxLength={200} autoComplete="email" className="field mt-1.5 font-normal" />
      </label>
      {state.error && (
        <p role="alert" className={errorClass}>
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn btn-primary w-full">
        {pending ? "Gönderiliyor..." : "Sıfırlama bağlantısı gönder"}
      </button>
    </form>
  );
}

// Yeni parola belirleme: token e-postadaki bağlantıdan gelir.
export function NewPasswordForm({ token }: { token: string }) {
  const { state, pending, onSubmit } = useServerForm(resetPassword);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <label className="block text-sm font-bold">
        Yeni parola
        <input name="next" type="password" required minLength={8} maxLength={200} autoComplete="new-password" className="field mt-1.5 font-normal" />
        <span className="mt-1 block text-xs font-normal text-neutral-500">En az 8 karakter.</span>
      </label>
      <label className="block text-sm font-bold">
        Yeni parola (tekrar)
        <input name="confirm" type="password" required minLength={8} maxLength={200} autoComplete="new-password" className="field mt-1.5 font-normal" />
      </label>
      {state.error && (
        <p role="alert" className={errorClass}>
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn btn-primary w-full">
        {pending ? "Kaydediliyor..." : "Parolamı kaydet"}
      </button>
    </form>
  );
}
