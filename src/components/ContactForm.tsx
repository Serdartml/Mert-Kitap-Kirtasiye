"use client";

import { useActionState } from "react";
import { Send } from "lucide-react";
import { sendContactMessage, type ContactFormState } from "@/actions/contact";

const initialState: ContactFormState = { ok: false, message: "" };

export default function ContactForm() {
  const [state, formAction, pending] = useActionState(sendContactMessage, initialState);

  if (state.ok) {
    return (
      <p role="status" className="rounded-lg bg-brand-50 p-5 text-sm font-semibold">
        {state.message}
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-bold">
          Ad Soyad
          <input name="name" type="text" required autoComplete="name" className="field mt-1.5 font-normal" />
        </label>
        <label className="block text-sm font-bold">
          E-posta
          <input name="email" type="email" required autoComplete="email" className="field mt-1.5 font-normal" />
        </label>
      </div>
      <label className="block text-sm font-bold">
        Mesajınız
        <textarea name="message" rows={5} required className="field mt-1.5 resize-none font-normal" />
      </label>
      {state.message && (
        <p role="alert" className="text-sm font-semibold text-red-700 dark:text-red-400">{state.message}</p>
      )}
      <button type="submit" disabled={pending} className="btn btn-dark w-full sm:w-auto">
        <Send size={16} /> {pending ? "Gönderiliyor..." : "Gönder"}
      </button>
    </form>
  );
}
