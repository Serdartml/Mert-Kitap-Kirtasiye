import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { CATALOG_TAG } from "@/lib/catalog";
import { db } from "@/lib/db";
import { getOrderForViewer } from "@/lib/orders";
import { cancelAwaitingOrder } from "@/lib/paytr";

// Kartla ödemeden dönüş: müşteri "Vazgeç"e bastı ya da PayTR başarısız ödemeden sonra buraya yönlendirdi
// (merchant_fail_url). Ödeme bekleyen sipariş iptal edilir, stok geri döner; sepet zaten duruyor. Ödeme sonucu buradan
// anlaşılmaz: sipariş bu arada ödendiyse (bildirim geldiyse) koşullu iptal hiçbir şey yapmaz ve müşteri siparişine gider.
export async function GET(_request: Request, { params }: { params: Promise<{ orderNo: string }> }) {
  const { orderNo } = await params;
  const order = await getOrderForViewer(orderNo);
  if (!order) redirect("/sepet");
  if (order.status === "AWAITING_PAYMENT") {
    if (await db.$transaction((tx) => cancelAwaitingOrder(tx, order.id))) revalidateTag(CATALOG_TAG, "max");
    redirect("/odeme?odeme=basarisiz");
  }
  if (order.status === "CANCELLED") redirect("/odeme?odeme=basarisiz");
  redirect(`/siparis/${order.orderNo}`);
}
