import type { Metadata } from "next";
import Link from "next/link";
import type { OrderStatus } from "@prisma/client";
import { OrderStatusBadge } from "@/components/OrderParts";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/format";
import { formatOrderDate, orderStatusLabels } from "@/lib/order-status";

export const metadata: Metadata = { title: "Siparişler" };

// Açık: henüz teslim edilmemiş ve kapanmamış siparişler; dükkânın uğraşması gerekenler.
const filters: { key: string; label: string; statuses?: OrderStatus[] }[] = [
  { key: "acik", label: "Açık", statuses: ["PENDING", "PAID", "PREPARING", "SHIPPED"] },
  { key: "teslim", label: orderStatusLabels.DELIVERED, statuses: ["DELIVERED"] },
  { key: "iptal", label: "İptal / iade", statuses: ["CANCELLED", "REFUNDED"] },
  { key: "hepsi", label: "Hepsi" },
];

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ filtre?: string }> }) {
  await requireAdmin();
  const { filtre } = await searchParams;
  const active = filters.find((filter) => filter.key === filtre) ?? filters[0];

  const orders = await db.order.findMany({
    where: active.statuses ? { status: { in: active.statuses } } : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { items: { select: { quantity: true } } },
  });

  return (
    <>
      <h1 className="text-2xl font-extrabold">
        <span className="marker">Siparişler</span>
      </h1>
      <p className="mt-2 text-sm text-neutral-600">Son 100 sipariş. Şimdilik bütün siparişler mağazadan teslim, ödeme mağazada.</p>

      <ul className="mt-5 flex flex-wrap gap-2">
        {filters.map((filter) => (
          <li key={filter.key}>
            <Link
              href={filter.key === filters[0].key ? "/yonetim/siparisler" : `/yonetim/siparisler?filtre=${filter.key}`}
              aria-current={filter.key === active.key ? "true" : undefined}
              className={`flex min-h-10 items-center rounded-full border px-3.5 text-xs font-bold sm:min-h-8 ${
                filter.key === active.key ? "border-fg bg-fg text-surface" : "border-neutral-300 hover:border-fg"
              }`}
            >
              {filter.label}
            </Link>
          </li>
        ))}
      </ul>

      {orders.length === 0 ? (
        <p className="mt-5 rounded-xl border border-dashed border-neutral-300 p-10 text-center text-sm text-neutral-500">
          Bu görünümde sipariş yok.
        </p>
      ) : (
        <ul className="mt-5 space-y-3">
          {orders.map((order) => (
            <li key={order.id}>
              <Link href={`/yonetim/siparisler/${order.id}`} className="block rounded-xl border border-neutral-200 bg-raised p-4 hover:border-fg">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-extrabold">
                    {order.orderNo} <span className="font-semibold text-neutral-500">· {order.fullName}</span>
                  </p>
                  <OrderStatusBadge status={order.status} />
                </div>
                <p className="mt-1 flex flex-wrap justify-between gap-x-2 gap-y-1 text-sm text-neutral-600">
                  <span>{formatOrderDate(order.createdAt)}</span>
                  <span>
                    {order.items.reduce((sum, item) => sum + item.quantity, 0)} ürün ·{" "}
                    <strong className="text-fg">{formatPrice(order.totalKurus)}</strong>
                  </span>
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
