import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Phone } from "lucide-react";
import { cartTotals, getCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Ödeme",
  robots: { index: false },
};

// Ödeme sağlayıcısı (iyzico / PayTR) bağlanana kadar yer tutucu.
// Akış: adres formu -> Order(PENDING) oluştur -> sağlayıcıya yönlendir -> callback'te PAID yap, stoğu düş, sepeti boşalt.
async function CartSummary() {
  const { subtotalKurus, count } = cartTotals(await getCart());
  if (count < 1) return null;

  return (
    <p className="mt-6 flex justify-between rounded-xl border border-neutral-200 p-5 text-sm">
      <span>
        Sepetinizde <strong>{count}</strong> ürün var
      </span>
      <strong>{formatPrice(subtotalKurus)}</strong>
    </p>
  );
}

export default function CheckoutPage() {
  return (
    <div className="container-page max-w-2xl py-12">
      <h1 className="text-2xl font-extrabold md:text-3xl">Ödeme</h1>

      <div className="mt-6 rounded-xl border-2 border-brand-500 bg-brand-50 p-6">
        <h2 className="text-lg font-extrabold">Online ödeme çok yakında</h2>
        <p className="mt-2 text-sm leading-relaxed text-neutral-700">
          Online ödeme altyapımız henüz devrede değil. Sepetinizdeki ürünler için mağazamızı arayabilir
          veya bizi ziyaret edebilirsiniz.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a href={site.phoneHref} className="btn btn-dark">
            <Phone size={16} /> {site.phone}
          </a>
          <Link href="/iletisim" className="btn btn-outline">İletişim</Link>
        </div>
      </div>

      <Suspense fallback={null}>
        <CartSummary />
      </Suspense>

      <Link href="/sepet" className="mt-6 inline-block text-sm font-bold hover:underline">
        ← Sepete dön
      </Link>
    </div>
  );
}
