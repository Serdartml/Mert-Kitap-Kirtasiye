"use client";

import { login, register } from "@/actions/account";
import { useServerForm } from "@/components/admin/useServerForm";

// Giriş ve kayıt formu. next: başarılı olunca dönülecek yol (?sonra=); sunucuda ayrıca doğrulanır.
export default function AuthForm({ mode, next }: { mode: "login" | "register"; next?: string }) {
  const isRegister = mode === "register";
  const { state, pending, onSubmit } = useServerForm(isRegister ? register : login);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {next && <input type="hidden" name="sonra" value={next} />}
      {isRegister && (
        <label className="block text-sm font-bold">
          Ad Soyad
          <input name="name" type="text" required minLength={2} maxLength={100} autoComplete="name" className="field mt-1.5 font-normal" />
        </label>
      )}
      <label className="block text-sm font-bold">
        E-posta
        <input name="email" type="email" required maxLength={200} autoComplete="email" className="field mt-1.5 font-normal" />
      </label>
      <label className="block text-sm font-bold">
        Parola
        <input
          name="password"
          type="password"
          required
          minLength={isRegister ? 8 : undefined}
          maxLength={200}
          autoComplete={isRegister ? "new-password" : "current-password"}
          className="field mt-1.5 font-normal"
        />
        {isRegister && <span className="mt-1 block text-xs font-normal text-neutral-500">En az 8 karakter.</span>}
      </label>
      {state.error && (
        <p role="alert" className="text-sm font-semibold text-red-700 dark:text-red-400">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn btn-primary w-full">
        {isRegister ? (pending ? "Hesap oluşturuluyor..." : "Üye Ol") : pending ? "Giriş yapılıyor..." : "Giriş Yap"}
      </button>
    </form>
  );
}
