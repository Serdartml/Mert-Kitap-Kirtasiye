import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import CheckoutForm from "@/components/CheckoutForm";
import { PanelSkeleton } from "@/components/Skeletons";
import { getCurrentUser } from "@/lib/auth";
import { cartTotals, getCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Siparişi Tamamla",
  robots: { index: false },
};

// Şimdilik tek yöntem: mağazadan teslim, ödeme mağazada (actions/order.ts, placeOrder).
// Online ödeme sağlayıcısı (iyzico / PayTR) bağlandığında "Adrese kargo" seçeneği burada açılacak.
export default function CheckoutPage() {
  return (
    <Suspense fallback={<PanelSkeleton />}>
      <CheckoutContent />
    </Suspense>
  );
}

// Sepet ve oturum çerezden okunur; hiç önbelleğe alınmaz.
async function CheckoutContent() {
  const [cart, user] = await Promise.all([getCart(), getCurrentUser()]);
  if (!cart || cart.items.length === 0) redirect("/sepet");

  const { subtotalKurus, count } = cartTotals(cart);
  // Stokta kalmayan ya da satıştan kalkan ürün varsa sipariş verilemez; müşteri sepete yönlendirilir.
  const blocked = cart.items.filter((item) => !item.product.isActive || item.quantity > item.product.stock);

  return (
    <div className="container-page py-6 md:py-8">
      <h1 className="text-2xl font-extrabold md:text-3xl">
        <span className="marker">Siparişi Tamamla</span>
      </h1>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0">
          {!user && (
            <p className="mb-6 rounded-xl bg-neutral-100 p-4 text-sm">
              Üye olmadan sipariş verebilirsiniz. Siparişlerinizi hesabınızdan takip etmek isterseniz{" "}
              <Link href="/giris?sonra=/odeme" className="font-bold underline underline-offset-2">giriş yapın</Link> ya da{" "}
              <Link href="/kayit?sonra=/odeme" className="font-bold underline underline-offset-2">üye olun</Link>.
            </p>
          )}

          {blocked.length > 0 ? (
            <div role="alert" className="rounded-xl border-2 border-brand-500 bg-brand-50 p-5 text-sm">
              <p className="font-extrabold">Sepetinizdeki bazı ürünler şu an karşılanamıyor</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {blocked.map((item) => (
                  <li key={item.id}>
                    {item.product.name}:{" "}
                    {!item.product.isActive || item.product.stock < 1 ? "stokta yok" : `stokta yalnızca ${item.product.stock} adet var`}
                  </li>
                ))}
              </ul>
              <Link href="/sepet" className="btn btn-dark mt-4">Sepeti Düzenle</Link>
            </div>
          ) : (
            <CheckoutForm
              defaults={{ fullName: user?.name ?? "", email: user?.email ?? "", phone: user?.phone ?? "" }}
              pickup={{ address: site.address.full, hours: site.hours.map((row) => `${row.days}: ${row.time}`) }}
              totalLabel={formatPrice(subtotalKurus)}
            />
          )}
        </div>

        {/* Mobilde özet formun üstünde durur: müşteri ne sipariş ettiğini bilgilerini yazmadan önce görür. */}
        <aside className="order-first h-fit rounded-xl border border-neutral-200 p-4 sm:p-5 lg:sticky lg:top-36 lg:order-none">
          <h2 className="text-lg font-extrabold">
            Sipariş Özeti <span className="text-sm font-semibold text-neutral-500">({count} ürün)</span>
          </h2>
          <ul className="mt-4 divide-y divide-neutral-200 text-sm">
            {cart.items.map((item) => (
              <li key={item.id} className="flex gap-3 py-2.5">
                <span className="min-w-0 flex-1 break-words">
                  {item.product.name} <span className="whitespace-nowrap text-neutral-500">× {item.quantity}</span>
                </span>
                <span className="shrink-0 font-bold">{formatPrice(item.product.priceKurus * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-2 space-y-2 border-t border-neutral-200 pt-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-neutral-600">Teslimat</dt>
              <dd className="font-bold">Mağazadan, ücretsiz</dd>
            </div>
            <div className="flex justify-between text-base">
              <dt className="font-extrabold">Toplam</dt>
              <dd className="font-extrabold">{formatPrice(subtotalKurus)}</dd>
            </div>
          </dl>
          <Link href="/sepet" className="mt-2 inline-block py-2.5 text-sm font-bold hover:underline">
            ← Sepete dön
          </Link>
        </aside>
      </div>
    </div>
  );
}
