import Link from "next/link";
import type { OrderStatus } from "@prisma/client";
import { formatPrice } from "@/lib/format";
import { orderStatusLabels, orderStatusTone } from "@/lib/order-status";
import type { OrderData } from "@/lib/orders";

// Sipariş sayfalarının (müşteri ve yönetim) ortak parçaları.

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-extrabold ${orderStatusTone[status]}`}>
      {orderStatusLabels[status]}
    </span>
  );
}

// Kalemler ve toplam. linkProducts: ürün hâlâ yayındaysa adı ürün sayfasına bağlanır.
export function OrderItems({ order, linkProducts = true }: { order: OrderData; linkProducts?: boolean }) {
  return (
    <div className="rounded-xl border border-neutral-200">
      <ul className="divide-y divide-neutral-200 text-sm">
        {order.items.map((item) => (
          <li key={item.id} className="flex gap-3 p-3 sm:p-4">
            <div className="min-w-0 flex-1">
              {linkProducts && item.product?.isActive ? (
                <Link href={`/urun/${item.product.slug}`} className="break-words font-bold hover:underline">
                  {item.name}
                </Link>
              ) : (
                <p className="break-words font-bold">{item.name}</p>
              )}
              <p className="mt-0.5 text-xs text-neutral-500">
                {item.quantity} × {formatPrice(item.unitPriceKurus)} · Stok kodu: {item.sku}
              </p>
            </div>
            <span className="shrink-0 font-extrabold">{formatPrice(item.unitPriceKurus * item.quantity)}</span>
          </li>
        ))}
      </ul>
      <dl className="space-y-2 border-t border-neutral-200 p-3 text-sm sm:p-4">
        {order.shippingKurus > 0 && (
          <>
            <div className="flex justify-between">
              <dt className="text-neutral-600">Ara toplam</dt>
              <dd className="font-bold">{formatPrice(order.subtotalKurus)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral-600">Kargo</dt>
              <dd className="font-bold">{formatPrice(order.shippingKurus)}</dd>
            </div>
          </>
        )}
        <div className="flex justify-between text-base">
          <dt className="font-extrabold">Toplam</dt>
          <dd className="font-extrabold">{formatPrice(order.totalKurus)}</dd>
        </div>
      </dl>
    </div>
  );
}
