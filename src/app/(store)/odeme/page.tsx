import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import CampaignHintBox from "@/components/CampaignHintBox";
import CheckoutForm from "@/components/CheckoutForm";
import FrameBreakout from "@/components/FrameBreakout";
import { ORDER_DISCOUNT_LABEL } from "@/lib/campaign";
import { campaignHintFor } from "@/lib/campaign-server";
import { PanelSkeleton } from "@/components/Skeletons";
import { getCurrentUser } from "@/lib/auth";
import { cartTotals, getCart } from "@/lib/cart";
import { db } from "@/lib/db";
import { COURIER_CITY, courierEstimate, courierFeeKurus, isCourierDistrict } from "@/lib/delivery";
import { formatPrice } from "@/lib/format";
import { isCardPaymentEnabled } from "@/lib/paytr";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Siparişi Tamamla",
  robots: { index: false },
};

// Teslimat: mağazadan ya da İzmir içi kurye ile (lib/delivery.ts). Ödeme: mağazada (yalnızca mağazadan teslimde) ya da
// kartla, PayTR (actions/order.ts, placeOrder).
interface PageProps {
  searchParams: Promise<{ odeme?: string }>;
}

export default function CheckoutPage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<PanelSkeleton />}>
      <CheckoutContent searchParams={searchParams} />
    </Suspense>
  );
}

// Sepet ve oturum çerezden okunur; hiç önbelleğe alınmaz.
async function CheckoutContent({ searchParams }: PageProps) {
  const [cart, user, { odeme }] = await Promise.all([getCart(), getCurrentUser(), searchParams]);
  if (!cart || cart.items.length === 0) redirect("/sepet");

  const { subtotalKurus, count } = cartTotals(cart);
  // Hoş geldin indirimi: burada gösterilir, siparişte sunucuda yeniden hesaplanır (formdaki e-posta/telefonla da bakılır).
  const hint = await campaignHintFor(user, subtotalKurus);
  const discountKurus = hint?.kind === "applied" ? hint.discountKurus : 0;
  const totalKurus = subtotalKurus - discountKurus;
  // Stokta kalmayan ya da satıştan kalkan ürün varsa sipariş verilemez; müşteri sepete yönlendirilir.
  const blocked = cart.items.filter((item) => !item.product.isActive || item.quantity > item.product.stock);
  // Üyenin kayıtlı adreslerinden yalnızca kuryenin gittiği İzmir ilçelerindekiler (varsayılan adres önce).
  const savedAddresses = user
    ? (
        await db.address.findMany({
          where: { userId: user.id },
          orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
          select: { id: true, title: true, city: true, district: true, line: true, postalCode: true },
        })
      )
        .filter((a) => a.city.trim().toLocaleLowerCase("tr") === COURIER_CITY.toLocaleLowerCase("tr") && isCourierDistrict(a.district.trim()))
        .map((a) => ({ id: a.id, title: a.title, district: a.district.trim(), line: a.line, postalCode: a.postalCode }))
    : [];

  return (
    <div className="container-page py-6 md:py-8">
      <h1 className="text-2xl font-extrabold md:text-3xl">
        <span className="marker">Siparişi Tamamla</span>
      </h1>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0">
          {/* Kartla ödeme tamamlanmadan dönüldü (odeme/kart/[orderNo]/vazgec): sepet duruyor, yeniden denenebilir. */}
          {odeme === "basarisiz" && <FrameBreakout />}
          {odeme === "basarisiz" && (
            <p role="alert" className="mb-6 rounded-xl border-2 border-red-300 bg-red-50 p-4 text-sm font-semibold text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
              Ödemeniz tamamlanmadı, kartınızdan para çekilmedi. Sepetiniz duruyor; tekrar deneyebilir ya da mağazada ödemeyi seçebilirsiniz.
            </p>
          )}
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
              subtotalKurus={subtotalKurus}
              discountKurus={discountKurus}
              cardPayment={isCardPaymentEnabled()}
              courierEstimate={courierEstimate(new Date()).text}
              savedAddresses={savedAddresses}
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
              <dd className="text-right font-bold">{courierFeeKurus(subtotalKurus) > 0 ? `Mağazadan ücretsiz; kurye ile ${formatPrice(courierFeeKurus(subtotalKurus))}` : "Ücretsiz"}</dd>
            </div>
            {discountKurus > 0 && (
              <div className="flex justify-between gap-3">
                <dt className="text-neutral-600">{ORDER_DISCOUNT_LABEL}</dt>
                <dd className="shrink-0 font-bold text-green-700 dark:text-green-400">−{formatPrice(discountKurus)}</dd>
              </div>
            )}
            <div className="flex justify-between text-base">
              <dt className="font-extrabold">Toplam{courierFeeKurus(subtotalKurus) > 0 ? " (teslimat hariç)" : ""}</dt>
              <dd className="font-extrabold">{formatPrice(totalKurus)}</dd>
            </div>
          </dl>
          <CampaignHintBox hint={hint} next="/odeme" />
          <Link href="/sepet" className="mt-2 inline-block py-2.5 text-sm font-bold hover:underline">
            ← Sepete dön
          </Link>
        </aside>
      </div>
    </div>
  );
}
