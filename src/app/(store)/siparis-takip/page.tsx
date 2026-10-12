import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Check, MapPin, Phone, X } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import OrderTrackBox from "@/components/OrderTrackBox";
import { OrderStatusBadge } from "@/components/OrderParts";
import { findOrderForTracking, normalizeOrderNo, type TrackedOrder } from "@/lib/order-tracking";
import { formatOrderDate, orderStatusNotes } from "@/lib/order-status";
import { getOrderForViewer } from "@/lib/orders";
import { checkLimits, clientIp, LIMITS } from "@/lib/rate-limit";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Sipariş Takibi",
  description: "Sipariş numaranızla siparişinizin durumunu öğrenin. Üye olmanız gerekmez.",
  robots: { index: false },
};

interface PageProps {
  searchParams: Promise<{ no?: string }>;
}

export default function OrderTrackingPage(props: PageProps) {
  return (
    <div className="container-page max-w-2xl py-4 md:py-8">
      <Breadcrumbs items={[{ label: "Sipariş Takibi" }]} />
      <h1 className="text-2xl font-extrabold md:text-4xl">
        <span className="marker">Sipariş takibi</span>
      </h1>
      <p className="mt-3 text-sm text-neutral-600 sm:text-base">
        Üye olmadan verdiğiniz siparişin numarasını yazın; durumunu hemen görün. Numara sipariş sayfanızda ve siparişi verirken
        gördüğünüz ekranda yazar (örnek: MK-261007-7HQ4KD).
      </p>

      {/* Arama çubuğu sayfada hemen çizilir; sonuç searchParams'a bağlı olduğu için <Suspense> içinde akar. */}
      <Suspense fallback={<TrackingForm />}>
        <TrackingResult {...props} />
      </Suspense>
    </div>
  );
}

function TrackingForm({ value = "" }: { value?: string }) {
  return (
    <div className="mt-5">
      <OrderTrackBox defaultValue={value} />
    </div>
  );
}

// Üyeliksiz durumda sorgulamayı sınırlı tutar ve yalnızca durumu gösterir (lib/order-tracking.ts).
async function TrackingResult({ searchParams }: PageProps) {
  const { no } = await searchParams;
  const raw = (no ?? "").trim().slice(0, 30);
  if (!raw) return <TrackingForm />;

  const blocked = await checkLimits([{ key: `order-track-ip:${await clientIp()}`, limit: LIMITS.orderTrackIp }]);
  if (blocked) {
    return (
      <>
        <TrackingForm value={raw} />
        <p role="alert" className="mt-4 rounded-xl border-2 border-brand-500 bg-brand-50 p-4 text-sm font-semibold">
          {blocked}
        </p>
      </>
    );
  }

  const orderNo = normalizeOrderNo(raw);
  const order = orderNo ? await findOrderForTracking(orderNo) : null;
  if (!order) {
    return (
      <>
        <TrackingForm value={raw} />
        <div role="alert" className="mt-4 rounded-xl border border-neutral-300 p-4 text-sm">
          <p className="font-extrabold">Bu numarayla sipariş bulunamadı.</p>
          <p className="mt-1 text-neutral-600">
            Numarayı kontrol edin: <span className="font-bold">MK</span> ile başlar, ardından tarih ve altı harf/rakam gelir. Sorun
            sürerse bizi arayın:{" "}
            <a href={site.phoneHref} className="font-bold underline underline-offset-2">
              {site.phone}
            </a>
          </p>
        </div>
      </>
    );
  }

  // Siparişi veren tarayıcı ya da üye ise tüm ayrıntılara bağlantı verilir; başkası yalnızca durumu görür.
  const owner = (await getOrderForViewer(order.orderNo)) !== null;

  return (
    <>
      <TrackingForm value={order.orderNo} />
      <OrderStatusCard order={order} owner={owner} />
    </>
  );
}

// Takip adımları: hazırlık sürecinin hangi aşamada olduğu. PAID de "sipariş alındı" aşamasındadır.
const steps = [
  { label: "Sipariş alındı", statuses: ["PENDING", "PAID"] },
  { label: "Hazırlanıyor", statuses: ["PREPARING"] },
  { label: "Teslime hazır", statuses: ["SHIPPED"] },
  { label: "Teslim edildi", statuses: ["DELIVERED"] },
] as const;

function OrderStatusCard({ order, owner }: { order: TrackedOrder; owner: boolean }) {
  const closed = order.status === "CANCELLED" || order.status === "REFUNDED";
  const current = steps.findIndex((step) => (step.statuses as readonly string[]).includes(order.status));

  return (
    <section aria-label="Sipariş durumu" className="mt-5 overflow-hidden rounded-2xl border border-neutral-200 bg-raised">
      <div className="theme-fixed pattern-dots bg-brand-500 p-4 sm:p-6">
        <p className="inline-block -rotate-2 rounded-sm bg-ink px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-brand-500 shadow-md sm:text-xs">
          Sipariş no: {order.orderNo}
        </p>
        <p className="mt-3 flex flex-wrap items-center gap-2">
          <OrderStatusBadge status={order.status} />
        </p>
        <p className="mt-2 text-sm font-medium text-ink/80 sm:text-base">{orderStatusNotes[order.status]}</p>
      </div>

      <div className="p-4 sm:p-6">
        {closed ? (
          <p className="flex items-center gap-2 text-sm font-bold">
            <X size={18} aria-hidden /> Bu sipariş {order.status === "CANCELLED" ? "iptal edildi" : "iade edildi"}.
          </p>
        ) : (
          // Dikey adım listesi: mobilde okunur, masaüstünde de aynı.
          <ol className="space-y-0">
            {steps.map((step, index) => {
              const done = index < current;
              const active = index === current;
              return (
                <li key={step.label} className="relative flex items-start gap-3 pb-5 last:pb-0" aria-current={active ? "step" : undefined}>
                  {index < steps.length - 1 && (
                    <span aria-hidden className={`absolute left-[15px] top-8 h-[calc(100%-1.5rem)] w-0.5 ${done ? "bg-fg" : "bg-neutral-200"}`} />
                  )}
                  <span
                    aria-hidden
                    className={`relative z-10 grid size-8 shrink-0 place-items-center rounded-full border-2 text-xs font-extrabold ${
                      done
                        ? "border-fg bg-fg text-surface"
                        : active
                          ? "border-brand-500 bg-brand-500 text-ink"
                          : "border-neutral-300 bg-raised text-neutral-400"
                    }`}
                  >
                    {done ? <Check size={16} strokeWidth={3} /> : index + 1}
                  </span>
                  <span className="min-w-0 pt-1">
                    <span className={`block text-sm font-extrabold ${done || active ? "" : "text-neutral-400"}`}>{step.label}</span>
                    {active && <span className="block text-xs text-neutral-600">Son güncelleme: {formatOrderDate(order.updatedAt)}</span>}
                  </span>
                  <span className="sr-only">{done ? " (tamamlandı)" : active ? " (şu an bu aşamada)" : " (bekliyor)"}</span>
                </li>
              );
            })}
          </ol>
        )}

        <p className="mt-5 text-xs text-neutral-500">Sipariş tarihi: {formatOrderDate(order.createdAt)}</p>

        {order.status === "SHIPPED" && (
          <a
            href={site.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-start gap-2 rounded-xl bg-neutral-100 p-3 text-sm font-semibold hover:underline"
          >
            <MapPin size={16} className="mt-0.5 shrink-0" aria-hidden /> Teslim yeri: {site.address.full}
          </a>
        )}

        <div className="mt-5 flex flex-wrap gap-2.5">
          {owner && (
            <Link href={`/siparis/${order.orderNo}`} className="btn btn-dark min-h-12 w-full sm:w-auto">
              Sipariş ayrıntıları
            </Link>
          )}
          <a href={site.phoneHref} className="btn btn-outline min-h-12 w-full sm:w-auto">
            <Phone size={16} aria-hidden /> Sorunuz mu var? {site.phone}
          </a>
        </div>
      </div>
    </section>
  );
}
