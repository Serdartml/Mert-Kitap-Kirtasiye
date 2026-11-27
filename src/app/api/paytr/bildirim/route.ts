import { after } from "next/server";
import { revalidateTag } from "next/cache";
import { CATALOG_TAG } from "@/lib/catalog";
import { sendOrderPlacedMails } from "@/lib/order-mail";
import { settleFailedOrder, settlePaidOrder, verifyPaytrCallback } from "@/lib/paytr";

// PayTR ödeme sonucu bildirimi (panel: Destek & Kurulum > Ayarlar > Bildirim URL). Sunucudan sunucuya gelir; oturum ya
// da çerez aranmaz, doğruluk imzadan (hash) anlaşılır. PayTR yanıt olarak yalnızca düz "OK" bekler; başka bir şey alırsa
// işlemi panelde "Devam ediyor" gösterir ve bildirimi tekrarlar. Aynı bildirim birden çok gelebilir: işlemler koşulludur.
const ok = () => new Response("OK", { headers: { "content-type": "text/plain; charset=utf-8" } });

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const check = form ? verifyPaytrCallback(form) : { ok: false as const };
  if (!check.ok) {
    console.error("[PayTR] Bildirim imzası geçersiz ya da ayarlar eksik.");
    return new Response("PAYTR notification failed: bad hash", { status: 400 });
  }
  // İmza doğru ama sipariş numarası bizim biçimimizde değil: tekrar gelmesin diye yine OK.
  if (!check.orderNo) {
    console.error("[PayTR] Tanınmayan sipariş numarası:", check.merchantOid);
    return ok();
  }

  if (check.status === "success") {
    const outcome = await settlePaidOrder(check.orderNo, check.totalAmount, check.merchantOid);
    if (outcome.kind === "paid") {
      if (outcome.warning) console.error("[PayTR] Dikkat:", check.orderNo, outcome.warning);
      revalidateTag(CATALOG_TAG, "max");
      after(() => sendOrderPlacedMails(outcome.order, outcome.warning));
    }
  } else {
    console.info("[PayTR] Ödeme başarısız:", check.orderNo, check.reason);
    if (await settleFailedOrder(check.orderNo)) revalidateTag(CATALOG_TAG, "max");
  }
  return ok();
}
