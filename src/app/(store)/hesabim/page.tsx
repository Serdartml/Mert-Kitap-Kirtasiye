import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { logout } from "@/actions/account";
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

export default function AccountPage() {
  return (
    <Suspense fallback={<PanelSkeleton />}>
      <AccountContent />
    </Suspense>
  );
}

// Oturum çerezden okunur; hiç önbelleğe alınmaz.
async function AccountContent() {
  const user = await requireUser("/hesabim");

  const orders = await db.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { items: { select: { name: true, quantity: true } } },
  });

  return (
    <div className="container-page max-w-3xl py-6 md:py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold md:text-3xl">
            <span className="marker">Hesabım</span>
          </h1>
          <p className="mt-2 text-sm">
            {user.name && <span className="font-bold">{user.name} · </span>}
            <span className="break-all text-neutral-600">{user.email}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {user.role === "ADMIN" && (
            <Link href="/yonetim" className="btn btn-outline py-2.5">Yönetim Paneli</Link>
          )}
          <form action={logout}>
            <button type="submit" className="btn btn-outline py-2.5">
              <LogOut size={16} aria-hidden /> Çıkış Yap
            </button>
          </form>
        </div>
      </div>

      <h2 className="mb-3 mt-8 text-lg font-extrabold">Siparişlerim</h2>
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
              <li key={order.id}>
                <Link href={`/siparis/${order.orderNo}`} className="block rounded-xl border border-neutral-200 bg-raised p-4 hover:border-fg">
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
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
