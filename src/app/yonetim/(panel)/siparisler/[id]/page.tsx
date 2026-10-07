import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Phone } from "lucide-react";
import { setOrderStatus } from "@/actions/admin";
import ConfirmButton from "@/components/admin/ConfirmButton";
import StatusNote from "@/components/admin/StatusNote";
import { OrderItems, OrderStatusBadge } from "@/components/OrderParts";
import { requireAdmin } from "@/lib/auth";
import { closedStatuses, formatOrderDate, nextStatuses, orderStatusLabels } from "@/lib/order-status";
import { getAdminOrder } from "@/lib/orders";

export const metadata: Metadata = { title: "Sipariş" };

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ durum?: string }>;
}

export default async function AdminOrderPage({ params, searchParams }: PageProps) {
  await requireAdmin();
  const [{ id }, { durum }] = await Promise.all([params, searchParams]);

  const order = await getAdminOrder(id);
  if (!order) notFound();

  const canCancel = !closedStatuses.includes(order.status) && order.status !== "DELIVERED";
  const phoneHref = `tel:${order.phone.replace(/[^\d+]/g, "")}`;

  return (
    <>
      <Link href="/yonetim/siparisler" className="inline-block py-2.5 text-sm font-bold text-neutral-500 hover:text-fg">
        ← Siparişler
      </Link>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold">
          <span className="marker">{order.orderNo}</span>
        </h1>
        <OrderStatusBadge status={order.status} />
      </div>

      <StatusNote status={durum} />

      <div className="grid gap-4 xl:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-4">
          <OrderItems order={order} linkProducts={false} />
          {order.note && (
            <section className="rounded-xl border border-neutral-200 bg-raised p-4 text-sm">
              <h2 className="font-extrabold">Müşterinin notu</h2>
              <p className="mt-2 whitespace-pre-line break-words">{order.note}</p>
            </section>
          )}
        </div>

        <div className="space-y-4">
          <section className="rounded-xl border border-neutral-200 bg-raised p-4 text-sm">
            <h2 className="font-extrabold">Durumu güncelle</h2>
            {nextStatuses[order.status].length === 0 && !canCancel ? (
              <p className="mt-2 text-neutral-500">Bu sipariş kapandı; durumu değiştirilemez.</p>
            ) : (
              <div className="mt-3 flex flex-col gap-2">
                {nextStatuses[order.status].map((status) => (
                  <form key={status} action={setOrderStatus.bind(null, order.id, status)}>
                    <button type="submit" className="btn btn-primary w-full py-2.5">
                      {orderStatusLabels[status]} olarak işaretle
                    </button>
                  </form>
                ))}
                {canCancel && (
                  <form action={setOrderStatus.bind(null, order.id, "CANCELLED")}>
                    <ConfirmButton
                      message={`${order.orderNo} iptal edilecek ve ürünlerin stoğu geri verilecek. Bu işlem geri alınamaz. Emin misiniz?`}
                      className="btn w-full border border-red-300 py-2.5 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
                    >
                      Siparişi iptal et
                    </ConfirmButton>
                  </form>
                )}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-neutral-200 bg-raised p-4 text-sm">
            <h2 className="font-extrabold">Müşteri</h2>
            <p className="mt-2 font-semibold">{order.fullName}</p>
            {/* Telefonda tek dokunuşla aranabilsin diye numara buton olarak durur. */}
            <a href={phoneHref} className="btn btn-outline mt-2 w-full py-2.5">
              <Phone size={16} aria-hidden /> {order.phone}
            </a>
            <a href={`mailto:${order.email}`} className="block break-all py-2.5 text-neutral-600 hover:underline">{order.email}</a>
            <p className="mt-2 text-xs text-neutral-500">{order.user ? "Üye siparişi" : "Üye olmadan verildi"}</p>
          </section>

          <section className="rounded-xl border border-neutral-200 bg-raised p-4 text-sm">
            <h2 className="font-extrabold">Teslimat ve ödeme</h2>
            <p className="mt-2">{order.shipLine}</p>
            <p className="text-neutral-600">Ödeme mağazada alınacak.</p>
            <p className="mt-2 text-xs text-neutral-500">Sipariş: {formatOrderDate(order.createdAt)}</p>
            <p className="text-xs text-neutral-500">Son güncelleme: {formatOrderDate(order.updatedAt)}</p>
          </section>
        </div>
      </div>
    </>
  );
}
