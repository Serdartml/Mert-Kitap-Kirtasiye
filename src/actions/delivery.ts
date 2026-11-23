"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { deliveryCodeMatches, generateDeliveryCode, MAX_DELIVERY_CODE_ATTEMPTS } from "@/lib/delivery-code";
import { sendMail } from "@/lib/mail";
import { deliveryCodeMail } from "@/lib/mail-templates";

// Teslimat kodu (yönetim). Yalnızca "SHIPPED" durumundaki siparişlerde çalışır. Kod yönetim ekranında gösterilmez.

const back = (orderId: string, status: string) => `/yonetim/siparisler/${orderId}?durum=${status}`;

// Yeni kod üretir (varsa eskisini geçersiz kılar) ve müşteriye e-postayla gönderir.
export async function sendDeliveryCode(orderId: string): Promise<void> {
  await requireAdmin();
  const order = await db.order.findUnique({ where: { id: orderId }, select: { id: true, orderNo: true, fullName: true, email: true, status: true } });
  if (!order) redirect("/yonetim/siparisler");
  if (order.status !== "SHIPPED") redirect(back(orderId, "gecersiz"));

  const code = generateDeliveryCode();
  await db.orderDeliveryCode.upsert({
    where: { orderId },
    create: { orderId, code },
    update: { code, attempts: 0, sentAt: new Date(), usedAt: null },
  });
  const sent = await sendMail(deliveryCodeMail(order, code));
  redirect(back(orderId, sent ? "kod-gonderildi" : "kod-gonderilemedi"));
}

// Kuryenin müşteriden aldığı kodu doğrular; doğruysa sipariş teslim edildi olur.
export async function confirmDeliveryCode(orderId: string, formData: FormData): Promise<void> {
  await requireAdmin();
  const given = String(formData.get("code") ?? "");

  // Deneme hakkı önce atomik olarak harcanır: aynı anda gönderilen istekler sınırı aşamaz.
  const claimed = await db.orderDeliveryCode.updateMany({
    where: { orderId, usedAt: null, attempts: { lt: MAX_DELIVERY_CODE_ATTEMPTS }, order: { status: "SHIPPED" } },
    data: { attempts: { increment: 1 } },
  });
  if (claimed.count !== 1) redirect(back(orderId, "kod-kilitli"));

  const row = await db.orderDeliveryCode.findUnique({ where: { orderId }, select: { code: true } });
  if (!row || !deliveryCodeMatches(row.code, given)) redirect(back(orderId, "kod-yanlis"));

  const delivered = await db.$transaction(async (tx) => {
    const order = await tx.order.updateMany({ where: { id: orderId, status: "SHIPPED" }, data: { status: "DELIVERED" } });
    if (order.count !== 1) return false;
    await tx.orderDeliveryCode.update({ where: { orderId }, data: { usedAt: new Date() } });
    return true;
  });
  redirect(back(orderId, delivered ? "kod-dogrulandi" : "gecersiz"));
}
