"use client";

import { useState, type ReactNode } from "react";
import { CreditCard, Store, Truck, Wallet } from "lucide-react";
import { placeOrder } from "@/actions/order";
import { useServerForm } from "@/components/admin/useServerForm";

interface CheckoutFormProps {
  // Üyenin bilgileri; misafirde boş gelir.
  defaults: { fullName: string; email: string; phone: string };
  pickup: { address: string; hours: string[] };
  totalLabel: string;
  // PayTR ayarları tamamsa kartla ödeme sunulur (lib/paytr.ts).
  cardPayment: boolean;
}

type PaymentChoice = "kart" | "magazada";

export default function CheckoutForm({ defaults, pickup, totalLabel, cardPayment }: CheckoutFormProps) {
  const { state, pending, onSubmit } = useServerForm(placeOrder);
  const [payment, setPayment] = useState<PaymentChoice>(cardPayment ? "kart" : "magazada");
  const byCard = cardPayment && payment === "kart";

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
              <p className="font-extrabold">Mağazadan teslim</p>
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
              <p className="font-extrabold">Adrese teslim</p>
              <p className="mt-1">Çok yakında.</p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-extrabold">3. Ödeme</h2>
        {cardPayment ? (
          <fieldset className="mt-3 space-y-3">
            <legend className="sr-only">Ödeme yöntemi</legend>
            <PaymentOption
              value="kart"
              checked={payment === "kart"}
              onSelect={setPayment}
              icon={<CreditCard size={22} className="mt-0.5 shrink-0" aria-hidden />}
              title="Kartla şimdi öde"
              text="Banka ya da kredi kartı, tek çekim. Ödeme PayTR'nin güvenli sayfasında 3D Secure ile alınır; kart bilgileriniz bize gelmez."
            />
            <PaymentOption
              value="magazada"
              checked={payment === "magazada"}
              onSelect={setPayment}
              icon={<Wallet size={22} className="mt-0.5 shrink-0" aria-hidden />}
              title="Mağazada öde"
              text="Ürünleri teslim alırken mağazada nakit ya da kartla ödersiniz."
            />
          </fieldset>
        ) : (
          <div className="mt-3 flex gap-3 rounded-xl border-2 border-fg p-4">
            <Wallet size={22} className="mt-0.5 shrink-0" aria-hidden />
            <div className="min-w-0 text-sm">
              <p className="font-extrabold">Mağazada öde</p>
              <p className="mt-1 text-neutral-600">Ürünleri teslim alırken mağazada ödersiniz.</p>
            </div>
            <input type="hidden" name="odeme" value="magazada" />
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-extrabold">4. Sipariş notu</h2>
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

      <div className="space-y-3">
        {/* Mesafeli Sözleşmeler Yönetmeliği m. 6: ön bilgilendirmenin teyidi sipariş onayından önce alınır.
            Sunucu da kontrol eder (actions/order.ts). Bağlantılar formu kaybetmemek için yeni sekmede açılır. */}
        <label className="flex items-start gap-3 text-sm">
          <input name="sozlesme" type="checkbox" required className="mt-0.5 size-5 shrink-0 accent-current" />
          <span>
            <LegalLink slug="on-bilgilendirme-formu">Ön Bilgilendirme Formu</LegalLink>&apos;nu ve{" "}
            <LegalLink slug="mesafeli-satis-sozlesmesi">Mesafeli Satış Sözleşmesi</LegalLink>&apos;ni okudum, onaylıyorum.
          </span>
        </label>
        <p className="text-xs text-neutral-500">
          Kişisel verileriniz siparişinizin hazırlanması ve teslimi için{" "}
          <LegalLink slug="kvkk">KVKK Aydınlatma Metni</LegalLink> kapsamında işlenir.
        </p>
        <button type="submit" disabled={pending} className="btn btn-primary w-full py-3.5 text-base">
          {pending ? "Siparişiniz oluşturuluyor..." : byCard ? `Siparişi Onayla ve Öde · ${totalLabel}` : `Siparişi Onayla · ${totalLabel}`}
        </button>
        <p className="text-center text-xs text-neutral-500">
          {byCard
            ? "Sonraki adımda kart bilgilerinizi PayTR'nin güvenli ödeme sayfasına girersiniz. Siparişiniz ödeme onaylanınca kesinleşir."
            : "Siparişi onaylayınca ürünler adınıza ayrılır ve ödeme yükümlülüğü doğar; ödemeyi mağazada teslim alırken yaparsınız."}
        </p>
      </div>
    </form>
  );
}

function PaymentOption({
  value,
  checked,
  onSelect,
  icon,
  title,
  text,
}: {
  value: PaymentChoice;
  checked: boolean;
  onSelect: (value: PaymentChoice) => void;
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <label className={`flex cursor-pointer gap-3 rounded-xl p-4 ${checked ? "border-2 border-fg" : "border border-neutral-300 hover:border-fg"}`}>
      <input type="radio" name="odeme" value={value} checked={checked} onChange={() => onSelect(value)} className="mt-1 size-5 shrink-0 accent-current" />
      {icon}
      <span className="min-w-0 text-sm">
        <span className="block font-extrabold">{title}</span>
        <span className="mt-1 block text-neutral-600">{text}</span>
      </span>
    </label>
  );
}

function LegalLink({ slug, children }: { slug: string; children: ReactNode }) {
  return (
    <a href={`/bilgi/${slug}`} target="_blank" rel="noopener" className="font-bold underline underline-offset-2">
      {children}
    </a>
  );
}
