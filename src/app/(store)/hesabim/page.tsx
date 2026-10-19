import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { reorder } from "@/actions/profile";
import AccountFrame from "@/components/AccountFrame";
import EmptyState from "@/components/EmptyState";
import { OrderStatusBadge } from "@/components/OrderParts";
import { PanelSkeleton } from "@/components/Skeletons";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/format";
import { formatOrderDate } from "@/lib/order-status";

export const metadata: Metadata = {
  title: "Hesabım",
  robots: { index: false },
};

interface PageProps {
  searchParams: Promise<{ tekrar?: string; eposta?: string }>;
}

export default function AccountPage(props: PageProps) {
  return (
    <Suspense fallback={<PanelSkeleton />}>
      <AccountContent {...props} />
    </Suspense>
  );
}

// Oturum çerezden okunur; hiç önbelleğe alınmaz.
async function AccountContent({ searchParams }: PageProps) {
  const user = await requireUser("/hesabim");
  const { tekrar, eposta } = await searchParams;

  const orders = await db.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { items: { select: { name: true, quantity: true } } },
  });

  return (
    <AccountFrame user={user} active="siparisler">
      {eposta === "dogrulandi" && (
        <p role="status" className="mb-4 rounded-xl bg-green-100 p-3 text-sm font-semibold text-green-800 dark:bg-green-950 dark:text-green-300">
          E-posta adresiniz doğrulandı. Teşekkürler.
        </p>
      )}
      {tekrar === "stok-yok" && (
        <p role="alert" className="mb-4 rounded-xl border-2 border-brand-500 bg-brand-50 p-4 text-sm font-semibold">
          Bu siparişteki ürünler şu an stokta olmadığı ya da satıştan kalktığı için sepete eklenemedi.
        </p>
      )}

      <h2 className="mb-3 text-lg font-extrabold">Siparişlerim</h2>
      {orders.length === 0 ? (
        <EmptyState
          title="Henüz siparişiniz yok"
          text="Sipariş verdiğinizde durumunu buradan takip edebilirsiniz."
          action={{ href: "/", label: "Alışverişe Başla" }}
        />
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => {
            const count = order.items.reduce((sum, item) => sum + item.quantity, 0);
            return (
              <li key={order.id} className="overflow-hidden rounded-xl border border-neutral-200 bg-raised">
                <Link href={`/siparis/${order.orderNo}`} className="block p-4 hover:bg-neutral-50">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-extrabold">{order.orderNo}</p>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <p className="mt-1 text-xs text-neutral-500">{formatOrderDate(order.createdAt)}</p>
                  <p className="mt-2 line-clamp-2 text-sm text-neutral-600">{order.items.map((item) => item.name).join(", ")}</p>
                  <p className="mt-2 flex justify-between text-sm">
                    <span className="text-neutral-600">{count} ürün</span>
                    <span className="font-extrabold">{formatPrice(order.totalKurus)}</span>
                  </p>
                </Link>
                {/* Linkin dışında: düğmeyi bağlantının içine koymak geçersiz olurdu. */}
                <form action={reorder.bind(null, order.id)} className="flex justify-end border-t border-neutral-200 p-2.5">
                  <button type="submit" className="btn btn-outline min-h-11 py-2">
                    <RotateCcw size={16} aria-hidden /> Tekrar sipariş ver
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </AccountFrame>
  );
}
