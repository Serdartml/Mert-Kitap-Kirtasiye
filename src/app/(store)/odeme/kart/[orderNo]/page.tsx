import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Lock } from "lucide-react";
import PaytrFrame from "@/components/PaytrFrame";
import { PanelSkeleton } from "@/components/Skeletons";
import { formatPrice } from "@/lib/format";
import { getOrderForViewer } from "@/lib/orders";
import { isPaytrTestMode, PAYTR_IFRAME_URL, requestPaytrToken } from "@/lib/paytr";
import { clientIp } from "@/lib/rate-limit";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Kartla Ödeme",
  robots: { index: false },
};

interface PageProps {
  params: Promise<{ orderNo: string }>;
}

// Kartla ödeme adımı (lib/paytr.ts). Sipariş AWAITING_PAYMENT durumundayken PayTR'den token alınır ve ödeme çerçevesi
// gösterilir. Sayfayı yalnızca siparişin sahibi açabilir (getOrderForViewer). Ödeme sonucu bu sayfaya değil, PayTR'nin
// bildirimiyle (api/paytr/bildirim) siparişe işlenir.
export default function CardPaymentPage({ params }: PageProps) {
  return (
    <Suspense fallback={<PanelSkeleton />}>
      <CardPaymentContent params={params} />
    </Suspense>
  );
}

async function CardPaymentContent({ params }: PageProps) {
  const { orderNo } = await params;
  const order = await getOrderForViewer(orderNo);
  if (!order) notFound();
  // Ödendi, iptal edildi ya da mağazada ödemeli: ödeme adımı yok, sipariş sayfasına.
  if (order.status !== "AWAITING_PAYMENT") redirect(`/siparis/${order.orderNo}`);

  const result = await requestPaytrToken(order, await clientIp());

  return (
    <div className="container-page max-w-3xl py-6 md:py-8">
      <h1 className="text-2xl font-extrabold md:text-3xl">
        <span className="marker">Kartla Ödeme</span>
      </h1>
      <p className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
        <span>
          Sipariş no: <strong>{order.orderNo}</strong>
        </span>
        <span className="text-base font-extrabold">Ödenecek tutar: {formatPrice(order.totalKurus)}</span>
      </p>
      {isPaytrTestMode() && (
        <p className="mt-3 rounded-lg border-2 border-dashed border-brand-500 p-3 text-sm font-semibold">
          TEST MODU: Bu ödeme gerçek değildir, karttan para çekilmez.
        </p>
      )}

      {result.ok ? (
        <div className="mt-5 overflow-hidden rounded-xl border border-neutral-200 bg-white">
          <PaytrFrame src={`${PAYTR_IFRAME_URL}${result.token}`} />
        </div>
      ) : (
        <div role="alert" className="mt-5 rounded-xl border-2 border-red-300 bg-red-50 p-5 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          <p className="font-extrabold">Ödeme sayfası şu an açılamadı.</p>
          <p className="mt-1">Kartınızdan para çekilmedi. Biraz sonra sayfayı yenileyerek tekrar deneyin ya da mağazada ödemeyi seçin.</p>
          {isPaytrTestMode() && <p className="mt-2 font-mono text-xs">PayTR: {result.reason}</p>}
        </div>
      )}

      <p className="mt-4 flex items-start gap-2 text-xs text-neutral-500">
        <Lock size={14} className="mt-0.5 shrink-0" aria-hidden />
        Kart bilgileriniz PayTR&apos;nin güvenli ödeme sayfasına girilir; bize iletilmez ve saklanmaz. Ödeme 3D Secure ile, tek çekim alınır.
      </p>

      <div className="mt-6 flex flex-wrap gap-3 text-sm">
        {/* Vazgeçince sipariş iptal edilir, ayrılan stok geri döner, sepet olduğu gibi durur. */}
        <Link href={`/odeme/kart/${order.orderNo}/vazgec`} prefetch={false} className="btn btn-outline">
          Vazgeç, ödeme yöntemini değiştir
        </Link>
        <a href={site.phoneHref} className="btn btn-outline">Sorunuz mu var? {site.phone}</a>
      </div>
    </div>
  );
}
