"use client";

import { useEffect, useRef } from "react";
import { changePassword, updateProfile } from "@/actions/profile";
import { useServerForm } from "@/components/admin/useServerForm";

function Feedback({ error, message }: { error: string; message?: string }) {
  return (
    <>
      {error && (
        <p role="alert" className="text-sm font-semibold text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="text-sm font-semibold text-green-700 dark:text-green-400">
          {message}
        </p>
      )}
    </>
  );
}

// Ad ve telefon.
export function ProfileForm({ defaults }: { defaults: { name: string; phone: string; email: string } }) {
  const { state, pending, onSubmit } = useServerForm(updateProfile);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block text-sm font-bold">
        Ad Soyad
        <input name="name" type="text" required minLength={2} maxLength={100} defaultValue={defaults.name} autoComplete="name" className="field mt-1.5 font-normal" />
      </label>
      <label className="block text-sm font-bold">
        Telefon <span className="font-normal text-neutral-500">(isteğe bağlı)</span>
        <input name="phone" type="tel" maxLength={20} defaultValue={defaults.phone} autoComplete="tel" inputMode="tel" placeholder="0532 123 45 67" className="field mt-1.5 font-normal" />
      </label>
      <label className="block text-sm font-bold">
        E-posta
        <input type="email" value={defaults.email} readOnly disabled className="field mt-1.5 font-normal opacity-70" />
        <span className="mt-1 block text-xs font-normal text-neutral-500">E-posta adresi şimdilik değiştirilemez.</span>
      </label>
      <Feedback error={state.error} message={state.message} />
      <button type="submit" disabled={pending} className="btn btn-primary min-h-12 w-full sm:w-auto">
        {pending ? "Kaydediliyor..." : "Bilgilerimi kaydet"}
      </button>
    </form>
  );
}

// Parola değiştirme. Başarılı olunca alanlar temizlenir.
export function PasswordForm() {
  const { state, pending, onSubmit } = useServerForm(changePassword);
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.message) form.current?.reset();
  }, [state]);

  return (
    <form ref={form} onSubmit={onSubmit} className="space-y-4">
      <label className="block text-sm font-bold">
        Mevcut parola
        <input name="current" type="password" required maxLength={200} autoComplete="current-password" className="field mt-1.5 font-normal" />
      </label>
      <label className="block text-sm font-bold">
        Yeni parola
        <input name="next" type="password" required minLength={8} maxLength={200} autoComplete="new-password" className="field mt-1.5 font-normal" />
        <span className="mt-1 block text-xs font-normal text-neutral-500">En az 8 karakter.</span>
      </label>
      <label className="block text-sm font-bold">
        Yeni parola (tekrar)
        <input name="confirm" type="password" required maxLength={200} autoComplete="new-password" className="field mt-1.5 font-normal" />
      </label>
      <Feedback error={state.error} message={state.message} />
      <button type="submit" disabled={pending} className="btn btn-dark min-h-12 w-full sm:w-auto">
        {pending ? "Değiştiriliyor..." : "Parolayı değiştir"}
      </button>
    </form>
  );
}
