"use client";

import { Store, Truck } from "lucide-react";
import { placeOrder } from "@/actions/order";
import { useServerForm } from "@/components/admin/useServerForm";

interface CheckoutFormProps {
  // Üyenin bilgileri; misafirde boş gelir.
  defaults: { fullName: string; email: string; phone: string };
  pickup: { address: string; hours: string[] };
  totalLabel: string;
}

export default function CheckoutForm({ defaults, pickup, totalLabel }: CheckoutFormProps) {
  const { state, pending, onSubmit } = useServerForm(placeOrder);

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <section>
        <h2 className="text-lg font-extrabold">1. İletişim bilgileri</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-bold sm:col-span-2">
            Ad Soyad
            <input name="fullName" type="text" required minLength={2} maxLength={100} defaultValue={defaults.fullName} autoComplete="name" className="field mt-1.5 font-normal" />
          </label>
          <label className="block text-sm font-bold">
            E-posta
            <input name="email" type="email" required maxLength={200} defaultValue={defaults.email} autoComplete="email" className="field mt-1.5 font-normal" />
          </label>
          <label className="block text-sm font-bold">
            Telefon
            <input name="phone" type="tel" required maxLength={20} defaultValue={defaults.phone} autoComplete="tel" inputMode="tel" placeholder="0532 123 45 67" className="field mt-1.5 font-normal" />
            <span className="mt-1 block text-xs font-normal text-neutral-500">Siparişiniz hazır olunca bu numaradan haber veririz.</span>
          </label>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-extrabold">2. Teslimat</h2>
        <div className="mt-3 space-y-3">
          <div className="flex gap-3 rounded-xl border-2 border-fg p-4">
            <Store size={22} className="mt-0.5 shrink-0" aria-hidden />
            <div className="min-w-0 text-sm">
              <p className="font-extrabold">Mağazadan teslim · ödeme mağazada</p>
              <p className="mt-1 text-neutral-600">{pickup.address}</p>
              <ul className="mt-1 text-neutral-600">
                {pickup.hours.map((row) => (
                  <li key={row}>{row}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="flex gap-3 rounded-xl border border-dashed border-neutral-300 p-4 text-neutral-500">
            <Truck size={22} className="mt-0.5 shrink-0" aria-hidden />
            <div className="text-sm">
              <p className="font-extrabold">Adrese kargo · online ödeme</p>
              <p className="mt-1">Çok yakında.</p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-extrabold">3. Sipariş notu</h2>
        <label className="mt-3 block text-sm font-bold">
          <span className="sr-only">Sipariş notu</span>
          <textarea name="note" rows={3} maxLength={500} placeholder="Eklemek istediğiniz bir not varsa yazın (isteğe bağlı)." className="field resize-none font-normal" />
        </label>
      </section>

      {state.error && (
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      )}

      <div>
        <button type="submit" disabled={pending} className="btn btn-primary w-full py-3.5 text-base">
          {pending ? "Siparişiniz oluşturuluyor..." : `Siparişi Onayla · ${totalLabel}`}
        </button>
        <p className="mt-2 text-center text-xs text-neutral-500">
          Ürünler adınıza ayrılır; ödemeyi mağazada teslim alırken yaparsınız.
        </p>
      </div>
    </form>
  );
}
