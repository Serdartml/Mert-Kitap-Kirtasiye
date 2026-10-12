"use client";

import { useEffect, useRef } from "react";
import { saveAddress } from "@/actions/profile";
import { useServerForm } from "@/components/admin/useServerForm";

// Yeni adres formu. Kayıt başarılı olunca form temizlenir ve liste (sunucu tarafında yenilenir) güncellenir.
export default function AddressForm({ isFirst }: { isFirst: boolean }) {
  const { state, pending, onSubmit } = useServerForm(saveAddress);
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.message) form.current?.reset();
  }, [state]);

  return (
    <form ref={form} onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      <label className="block text-sm font-bold">
        Adres adı
        <input name="title" type="text" required maxLength={30} placeholder="Ev, İş..." className="field mt-1.5 font-normal" />
      </label>
      <label className="block text-sm font-bold">
        Alıcı adı soyadı
        <input name="fullName" type="text" required minLength={2} maxLength={100} autoComplete="name" className="field mt-1.5 font-normal" />
      </label>
      <label className="block text-sm font-bold">
        Telefon
        <input name="phone" type="tel" required maxLength={20} autoComplete="tel" inputMode="tel" placeholder="0532 123 45 67" className="field mt-1.5 font-normal" />
      </label>
      <label className="block text-sm font-bold">
        Posta kodu <span className="font-normal text-neutral-500">(isteğe bağlı)</span>
        <input name="postalCode" type="text" maxLength={5} inputMode="numeric" autoComplete="postal-code" className="field mt-1.5 font-normal" />
      </label>
      <label className="block text-sm font-bold">
        İl
        <input name="city" type="text" required maxLength={60} autoComplete="address-level1" defaultValue="İzmir" className="field mt-1.5 font-normal" />
      </label>
      <label className="block text-sm font-bold">
        İlçe
        <input name="district" type="text" required maxLength={60} autoComplete="address-level2" className="field mt-1.5 font-normal" />
      </label>
      <label className="block text-sm font-bold sm:col-span-2">
        Açık adres
        <textarea name="line" required minLength={5} maxLength={250} rows={3} autoComplete="street-address" className="field mt-1.5 font-normal" />
      </label>

      {!isFirst && (
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-bold sm:col-span-2">
          <input name="isDefault" type="checkbox" className="size-5" /> Varsayılan adres yap
        </label>
      )}

      <div className="sm:col-span-2">
        {state.error && (
          <p role="alert" className="mb-3 text-sm font-semibold text-red-700 dark:text-red-400">
            {state.error}
          </p>
        )}
        {state.message && (
          <p role="status" className="mb-3 text-sm font-semibold text-green-700 dark:text-green-400">
            {state.message}
          </p>
        )}
        <button type="submit" disabled={pending} className="btn btn-primary min-h-12 w-full sm:w-auto">
          {pending ? "Kaydediliyor..." : "Adresi kaydet"}
        </button>
      </div>
    </form>
  );
}
