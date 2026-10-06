"use client";

import { useActionState } from "react";
import { adminLogin, type LoginState } from "@/actions/auth";

const initialState: LoginState = { error: "" };

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(adminLogin, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <label className="block text-sm font-bold">
        E-posta
        <input name="email" type="email" required autoComplete="username" className="field mt-1.5 font-normal" />
      </label>
      <label className="block text-sm font-bold">
        Parola
        <input name="password" type="password" required autoComplete="current-password" className="field mt-1.5 font-normal" />
      </label>
      {state.error && (
        <p role="alert" className="text-sm font-semibold text-red-700 dark:text-red-400">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn btn-primary w-full">
        {pending ? "Giriş yapılıyor..." : "Giriş Yap"}
      </button>
    </form>
  );
}
