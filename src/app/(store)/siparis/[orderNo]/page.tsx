import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Phone } from "lucide-react";
import { OrderItems, OrderStatusBadge } from "@/components/OrderParts";
import { PanelSkeleton } from "@/components/Skeletons";
import { getCurrentUser } from "@/lib/auth";
import { formatOrderDate, orderStatusNotes } from "@/lib/order-status";
import { getOrderForViewer } from "@/lib/orders";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Sipariş",
  robots: { index: false },
};

interface PageProps {
  params: Promise<{ orderNo: string }>;
}

// Sipariş onayı ve takip sayfası. Yalnızca siparişin sahibi görebilir (lib/orders, getOrderForViewer);
// başkasının siparişi de olmayan sipariş de aynı 404'ü verir.
export default function OrderPage({ params }: PageProps) {
  return (
    <Suspense fallback={<PanelSkeleton />}>
      <OrderContent params={params} />
    </Suspense>
  );
}

async function OrderContent({ params }: PageProps) {
  const { orderNo } = await params;
  const order = await getOrderForViewer(orderNo);
  if (!order) notFound();

  const user = await getCurrentUser();

  return (
    <div className="container-page max-w-3xl py-6 md:py-10">
      <div className="theme-fixed pattern-dots rounded-2xl bg-brand-500 p-5 sm:p-8">
        <p className="inline-block -rotate-2 rounded-sm bg-ink px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-500 shadow-md">
          Sipariş no: {order.orderNo}
        </p>
        <h1 className="mt-4 text-2xl font-extrabold leading-tight sm:text-3xl">
          {order.status === "PENDING" ? (
            <>
              Teşekkürler, <span className="marker marker-light">siparişiniz alındı</span>
            </>
          ) : (
            "Siparişiniz"
          )}
        </h1>
        <p className="mt-2 text-sm font-medium text-ink/80 sm:text-base">{orderStatusNotes[order.status]}</p>
        <p className="mt-3 flex flex-wrap items-center gap-2 text-sm font-medium">
          <OrderStatusBadge status={order.status} />
          <span className="text-ink/70">{formatOrderDate(order.createdAt)}</span>
        </p>
      </div>

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
          <p className="mt-2 text-neutral-600">Ödemeyi teslim alırken mağazada yaparsınız.</p>
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
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/" className="btn btn-dark">Alışverişe Devam Et</Link>
        {user && <Link href="/hesabim" className="btn btn-outline">Siparişlerim</Link>}
      </div>
    </div>
  );
}
