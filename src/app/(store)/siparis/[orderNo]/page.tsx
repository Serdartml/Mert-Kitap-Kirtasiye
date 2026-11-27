import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Phone } from "lucide-react";
import FrameBreakout from "@/components/FrameBreakout";
import { OrderItems, OrderStatusBadge } from "@/components/OrderParts";
import PaymentPendingRefresh from "@/components/PaymentPendingRefresh";
import { PanelSkeleton } from "@/components/Skeletons";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { CARD_PAYMENT, formatOrderDate, orderStatusNotes } from "@/lib/order-status";
import { getOrderForViewer } from "@/lib/orders";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Sipariş",
  robots: { index: false },
};

interface PageProps {
  params: Promise<{ orderNo: string }>;
  // odeme=tamam: PayTR başarılı ödemeden sonra buraya yönlendirir (lib/paytr.ts, merchant_ok_url).
  searchParams: Promise<{ odeme?: string }>;
}

// Sipariş onayı ve takip sayfası. Yalnızca siparişin sahibi görebilir (lib/orders, getOrderForViewer);
// başkasının siparişi de olmayan sipariş de aynı 404'ü verir.
export default function OrderPage({ params, searchParams }: PageProps) {
  return (
    <Suspense fallback={<PanelSkeleton />}>
      <OrderContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function OrderContent({ params, searchParams }: PageProps) {
  const [{ orderNo }, { odeme }] = await Promise.all([params, searchParams]);
  const order = await getOrderForViewer(orderNo);
  if (!order) notFound();
  const paidByCard = order.paymentProvider === CARD_PAYMENT;
  // Ödeme sayfasından dönüldü ama PayTR'nin bildirimi henüz gelmedi: "kontrol ediliyor" gösterilir, sayfa kendini yeniler.
  const checkingPayment = order.status === "AWAITING_PAYMENT" && odeme === "tamam";
  const justPlaced = order.status === "PENDING" || (order.status === "PAID" && odeme === "tamam");

  const user = await getCurrentUser();
  // Bu sayfayı yalnızca siparişin sahibi görür (getOrderForViewer); kod yalnızca teslimat aşamasında gösterilir.
  const deliveryCode =
    order.status === "SHIPPED" ? await db.orderDeliveryCode.findFirst({ where: { orderId: order.id, usedAt: null }, select: { code: true } }) : null;

  return (
    <div className="container-page max-w-3xl py-6 md:py-10">
      {odeme === "tamam" && <FrameBreakout />}
      {checkingPayment && <PaymentPendingRefresh />}
      <div className="theme-fixed pattern-dots rounded-2xl bg-brand-500 p-5 sm:p-8">
        <p className="inline-block -rotate-2 rounded-sm bg-ink px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-500 shadow-md">
          Sipariş no: {order.orderNo}
        </p>
        <h1 className="mt-4 text-2xl font-extrabold leading-tight sm:text-3xl">
          {justPlaced ? (
            <>
              Teşekkürler, <span className="marker marker-light">siparişiniz alındı</span>
            </>
          ) : checkingPayment ? (
            "Ödemeniz kontrol ediliyor"
          ) : (
            "Siparişiniz"
          )}
        </h1>
        <p className="mt-2 text-sm font-medium text-ink/80 sm:text-base">
          {checkingPayment ? "Ödeme kuruluşundan onay bekleniyor; bu birkaç saniye sürebilir. Sayfa kendiliğinden yenilenecek." : orderStatusNotes[order.status]}
        </p>
        {order.status === "AWAITING_PAYMENT" && !checkingPayment && (
          <Link href={`/odeme/kart/${order.orderNo}`} className="btn btn-dark mt-4">Ödemeye devam et</Link>
        )}
        <p className="mt-3 flex flex-wrap items-center gap-2 text-sm font-medium">
          <OrderStatusBadge status={order.status} />
          <span className="text-ink/70">{formatOrderDate(order.createdAt)}</span>
        </p>
      </div>

      {deliveryCode && (
        <section className="mt-6 rounded-xl border-2 border-fg p-4 text-sm">
          <h2 className="font-extrabold">Teslimat kodunuz</h2>
          <p className="mt-2 text-3xl font-extrabold tracking-[0.3em]">{deliveryCode.code}</p>
          <p className="mt-2 text-neutral-600">Ürünü teslim alırken bu kodu görevliye söyleyin. Teslim alacak kişi dışında kimseyle paylaşmayın.</p>
        </section>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <section className="rounded-xl border border-neutral-200 p-4 text-sm">
          <h2 className="font-extrabold">Teslimat: mağazadan</h2>
          <a href={site.mapsUrl} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-start gap-2 hover:underline">
            <MapPin size={16} className="mt-0.5 shrink-0" /> {site.address.full}
          </a>
          <ul className="mt-2 text-neutral-600">
            {site.hours.map((row) => (
              <li key={row.days}>
                {row.days}: {row.time}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-neutral-600">
            {!paidByCard
              ? "Ödemeyi teslim alırken mağazada yaparsınız."
              : order.status === "AWAITING_PAYMENT" || order.status === "CANCELLED"
                ? "Ödeme: kartla online."
                : "Ödemeniz kartla alındı."}
          </p>
        </section>
        <section className="rounded-xl border border-neutral-200 p-4 text-sm">
          <h2 className="font-extrabold">İletişim</h2>
          <p className="mt-2">{order.fullName}</p>
          <p className="break-all text-neutral-600">{order.email}</p>
          <p className="text-neutral-600">{order.phone}</p>
          {order.note && <p className="mt-2 whitespace-pre-line break-words text-neutral-600">Not: {order.note}</p>}
          <a href={site.phoneHref} className="mt-1 flex items-center gap-2 py-2.5 font-bold hover:underline">
            <Phone size={16} /> Sorunuz mu var? {site.phone}
          </a>
        </section>
      </div>

      <h2 className="mb-3 mt-8 text-lg font-extrabold">Ürünler</h2>
      <OrderItems order={order} />

      {!user && (
        <p className="mt-6 rounded-xl bg-neutral-100 p-4 text-sm">
          Bu sayfaya yalnızca siparişi verdiğiniz tarayıcıdan ulaşabilirsiniz; sipariş numaranızı not edin.
          Numarayla durumu her yerden{" "}
          <Link href="/siparis-takip" className="font-bold underline underline-offset-2">
            sipariş takibi
          </Link>{" "}
          sayfasından da görebilirsiniz.
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/" className="btn btn-dark">Alışverişe Devam Et</Link>
        {user && <Link href="/hesabim" className="btn btn-outline">Siparişlerim</Link>}
      </div>
    </div>
  );
}
