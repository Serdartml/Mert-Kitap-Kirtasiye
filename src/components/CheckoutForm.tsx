"use client";

import { useState, type ReactNode } from "react";
import { Bike, CreditCard, Store, Wallet } from "lucide-react";
import { placeOrder } from "@/actions/order";
import { useServerForm } from "@/components/admin/useServerForm";
import {
  COURIER_DELIVERY,
  COURIER_DISTRICTS,
  COURIER_FREE_OVER_KURUS,
  courierFeeKurus,
  isCourierDistrict,
  PICKUP_DELIVERY,
  type DeliveryMethod,
} from "@/lib/delivery";
import { formatPrice } from "@/lib/format";

export interface SavedAddress {
  id: string;
  title: string;
  district: string;
  line: string;
  postalCode: string | null;
}

interface CheckoutFormProps {
  // Üyenin bilgileri; misafirde boş gelir.
  defaults: { fullName: string; email: string; phone: string };
  pickup: { address: string; hours: string[] };
  subtotalKurus: number;
  discountKurus: number;
  // PayTR ayarları tamamsa kartla ödeme ve (ödemesi kartla olduğu için) kurye ile teslim sunulur (lib/paytr.ts).
  cardPayment: boolean;
  // Şu an sipariş verilirse kuryenin geleceği zaman, ör. "Bugün 21:00'e kadar" (lib/delivery.ts, courierEstimate).
  courierEstimate: string;
  // Üyenin kayıtlı adreslerinden kuryenin gittiği ilçelerdekiler; seçilince form doldurulur.
  savedAddresses: SavedAddress[];
}

type PaymentChoice = "kart" | "magazada";

const districtsText = `${COURIER_DISTRICTS.slice(0, -1).join(", ")} ve ${COURIER_DISTRICTS[COURIER_DISTRICTS.length - 1]}`;

export default function CheckoutForm({ defaults, pickup, subtotalKurus, discountKurus, cardPayment, courierEstimate, savedAddresses }: CheckoutFormProps) {
  const { state, pending, onSubmit } = useServerForm(placeOrder);
  const [delivery, setDelivery] = useState<DeliveryMethod>(PICKUP_DELIVERY);
  const [payment, setPayment] = useState<PaymentChoice>(cardPayment ? "kart" : "magazada");
  const first = savedAddresses[0];
  const [district, setDistrict] = useState(first?.district ?? "");
  const [line, setLine] = useState(first?.line ?? "");
  const [postalCode, setPostalCode] = useState(first?.postalCode ?? "");

  const courier = cardPayment && delivery === COURIER_DELIVERY;
  // Kurye ile teslimde kapıda ödeme yok: ödeme kartla.
  const byCard = courier || (cardPayment && payment === "kart");
  const feeKurus = courier ? courierFeeKurus(subtotalKurus) : 0;
  const totalLabel = formatPrice(subtotalKurus + feeKurus - discountKurus);

  const fillFrom = (id: string) => {
    const address = savedAddresses.find((a) => a.id === id);
    if (!address) return;
    setDistrict(address.district);
    setLine(address.line);
    setPostalCode(address.postalCode ?? "");
  };

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
            <span className="mt-1 block text-xs font-normal text-neutral-500">
              {courier ? "Kuryemiz teslimatta bu numaradan arar." : "Siparişiniz hazır olunca bu numaradan haber veririz."}
            </span>
          </label>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-extrabold">2. Teslimat</h2>
        <fieldset className="mt-3 space-y-3">
          <legend className="sr-only">Teslimat yöntemi</legend>
          <ChoiceCard
            name="teslimat"
            value={PICKUP_DELIVERY}
            checked={!courier}
            onSelect={() => setDelivery(PICKUP_DELIVERY)}
            icon={<Store size={22} className="mt-0.5 shrink-0" aria-hidden />}
            title="Mağazadan teslim · ücretsiz"
          >
            <span className="mt-1 block">{pickup.address}</span>
            {pickup.hours.map((row) => (
              <span key={row} className="block">{row}</span>
            ))}
          </ChoiceCard>

          {cardPayment ? (
            <ChoiceCard
              name="teslimat"
              value={COURIER_DELIVERY}
              checked={courier}
              onSelect={() => setDelivery(COURIER_DELIVERY)}
              icon={<Bike size={22} className="mt-0.5 shrink-0" aria-hidden />}
              title={`İzmir içi kurye ile teslim · ${feeKurusLabel(subtotalKurus)}`}
            >
              <span className="mt-1 block">
                Yalnızca İzmir&apos;in şu ilçelerine dağıtım yapıyoruz: <strong className="font-bold text-fg">{districtsText}</strong>.
              </span>
              <span className="mt-1 block">
                Mağazamızın kendi kuryesi getirir. {courierEstimate} kapınızda ({"17:00'den"} sonraki siparişler ertesi gün). Ödeme online, kartla;
                kapıda ödeme yoktur.
              </span>
            </ChoiceCard>
          ) : (
            <div className="flex gap-3 rounded-xl border border-dashed border-neutral-300 p-4 text-neutral-500">
              <Bike size={22} className="mt-0.5 shrink-0" aria-hidden />
              <div className="text-sm">
                <p className="font-extrabold">İzmir içi kurye ile teslim</p>
                <p className="mt-1">Şu an kullanılamıyor.</p>
              </div>
            </div>
          )}
        </fieldset>

        {courier && (
          <div className="mt-4 grid gap-4 rounded-xl bg-neutral-100 p-4 sm:grid-cols-2">
            <p className="text-sm font-extrabold sm:col-span-2">Teslimat adresi</p>
            {savedAddresses.length > 0 && (
              <label className="block text-sm font-bold sm:col-span-2">
                Kayıtlı adreslerim
                <select defaultValue={first?.id} onChange={(event) => fillFrom(event.target.value)} className="field mt-1.5 font-normal">
                  {savedAddresses.map((address) => (
                    <option key={address.id} value={address.id}>
                      {address.title} · {address.district}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="block text-sm font-bold">
              İl
              <input type="text" value="İzmir" readOnly className="field mt-1.5 font-normal text-neutral-500" />
            </label>
            <label className="block text-sm font-bold">
              İlçe
              <select name="district" required value={isCourierDistrict(district) ? district : ""} onChange={(event) => setDistrict(event.target.value)} className="field mt-1.5 font-normal">
                <option value="" disabled>
                  İlçe seçin
                </option>
                {COURIER_DISTRICTS.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-bold sm:col-span-2">
              Açık adres
              <textarea
                name="line"
                required
                minLength={10}
                maxLength={250}
                rows={3}
                value={line}
                onChange={(event) => setLine(event.target.value)}
                autoComplete="street-address"
                placeholder="Mahalle, cadde/sokak, bina no, daire no"
                className="field mt-1.5 resize-none font-normal"
              />
            </label>
            <label className="block text-sm font-bold">
              Posta kodu <span className="font-normal text-neutral-500">(isteğe bağlı)</span>
              <input
                name="postalCode"
                type="text"
                maxLength={5}
                inputMode="numeric"
                pattern="\d{5}"
                value={postalCode}
                onChange={(event) => setPostalCode(event.target.value)}
                autoComplete="postal-code"
                className="field mt-1.5 font-normal"
              />
            </label>
            <p className="self-end text-xs text-neutral-600">Listede olmayan bir ilçedeyseniz mağazadan teslimi seçebilirsiniz.</p>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-extrabold">3. Ödeme</h2>
        {courier ? (
          <div className="mt-3 flex gap-3 rounded-xl border-2 border-fg p-4">
            <CreditCard size={22} className="mt-0.5 shrink-0" aria-hidden />
            <div className="min-w-0 text-sm">
              <p className="font-extrabold">Kartla şimdi öde</p>
              <p className="mt-1 text-neutral-600">
                Kurye ile teslimde ödeme online alınır. Banka ya da kredi kartı, tek çekim; PayTR&apos;nin güvenli sayfasında 3D Secure ile. Kart bilgileriniz bize gelmez.
              </p>
            </div>
            <input type="hidden" name="odeme" value="kart" />
          </div>
        ) : cardPayment ? (
          <fieldset className="mt-3 space-y-3">
            <legend className="sr-only">Ödeme yöntemi</legend>
            <ChoiceCard
              name="odeme"
              value="kart"
              checked={payment === "kart"}
              onSelect={() => setPayment("kart")}
              icon={<CreditCard size={22} className="mt-0.5 shrink-0" aria-hidden />}
              title="Kartla şimdi öde"
            >
              <span className="mt-1 block">Banka ya da kredi kartı, tek çekim. Ödeme PayTR&apos;nin güvenli sayfasında 3D Secure ile alınır; kart bilgileriniz bize gelmez.</span>
            </ChoiceCard>
            <ChoiceCard
              name="odeme"
              value="magazada"
              checked={payment === "magazada"}
              onSelect={() => setPayment("magazada")}
              icon={<Wallet size={22} className="mt-0.5 shrink-0" aria-hidden />}
              title="Mağazada öde"
            >
              <span className="mt-1 block">Ürünleri teslim alırken mağazada nakit ya da kartla ödersiniz.</span>
            </ChoiceCard>
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
          <textarea
            name="note"
            rows={3}
            maxLength={500}
            placeholder={courier ? "Kurye için not: kapı zili, tarif vb. (isteğe bağlı)" : "Eklemek istediğiniz bir not varsa yazın (isteğe bağlı)."}
            className="field resize-none font-normal"
          />
        </label>
      </section>

      {state.error && (
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      )}

      <div className="space-y-3">
        {courier && (
          <dl className="space-y-1.5 rounded-xl border border-neutral-200 p-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-neutral-600">Ürünler{discountKurus > 0 ? " (indirimli)" : ""}</dt>
              <dd className="font-bold">{formatPrice(subtotalKurus - discountKurus)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral-600">Kurye ile teslim</dt>
              <dd className="font-bold">{feeKurus > 0 ? formatPrice(feeKurus) : "Ücretsiz"}</dd>
            </div>
            <div className="flex justify-between text-base">
              <dt className="font-extrabold">Ödenecek</dt>
              <dd className="font-extrabold">{totalLabel}</dd>
            </div>
          </dl>
        )}
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

// "100 TL" ya da (1.000 TL ve üzeri ürün toplamında) "ücretsiz".
function feeKurusLabel(subtotalKurus: number): string {
  const fee = courierFeeKurus(subtotalKurus);
  return fee > 0 ? `${formatPrice(fee)} (${formatPrice(COURIER_FREE_OVER_KURUS)} üzeri ücretsiz)` : "ücretsiz";
}

function ChoiceCard({
  name,
  value,
  checked,
  onSelect,
  icon,
  title,
  children,
}: {
  name: string;
  value: string;
  checked: boolean;
  onSelect: () => void;
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <label className={`flex cursor-pointer gap-3 rounded-xl p-4 ${checked ? "border-2 border-fg" : "border border-neutral-300 hover:border-fg"}`}>
      <input type="radio" name={name} value={value} checked={checked} onChange={onSelect} className="mt-1 size-5 shrink-0 accent-current" />
      {icon}
      <span className="min-w-0 text-sm">
        <span className="block font-extrabold">{title}</span>
        <span className="block text-neutral-600">{children}</span>
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
