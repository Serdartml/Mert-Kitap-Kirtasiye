import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { CARD_PAYMENT } from "./order-status";
import { site } from "./site";

// PayTR iFrame API (https://dev.paytr.com/iframe-api). Akış:
// 1. Müşteri "kartla öde" ile sipariş verir: sipariş AWAITING_PAYMENT ile açılır, stok ayrılır, sepet BOŞALTILMAZ
//    (actions/order.ts).
// 2. /odeme/kart/[orderNo] sunucuda PayTR'den token alır ve ödeme çerçevesini (iframe) gösterir. Kart bilgisi bize gelmez.
// 3. PayTR sonucu sunucudan sunucuya /api/paytr/bildirim adresine bildirir (panelde "Bildirim URL"). Siparişi YALNIZCA bu
//    bildirim ödendi yapar; müşterinin döndüğü başarı sayfası bir şey kanıtlamaz.
// 4. Ödeme olmazsa (başarısız bildirim, müşterinin vazgeçmesi ya da süre dolması) sipariş iptal edilir, stok geri verilir.
//
// Anahtarlar yalnızca ortam değişkenlerinde durur (.env, canlıda ENV_FILE). Biri eksikse kartla ödeme seçeneği görünmez.

const TOKEN_URL = "https://www.paytr.com/odeme/api/get-token";
export const PAYTR_IFRAME_URL = "https://www.paytr.com/odeme/guvenli/";

// Ödeme çerçevesinin geçerli olduğu süre (dakika, PayTR timeout_limit). Bu süreden sonra ödeme tamamlanamaz.
const TIMEOUT_MINUTES = 30;
// Bu süreden eski, hâlâ ödeme bekleyen sipariş iptal edilir (stok geri döner). Geç gelen bildirime pay bırakılır.
export const AWAITING_PAYMENT_EXPIRE_MINUTES = TIMEOUT_MINUTES + 15;

interface PaytrConfig {
  merchantId: string;
  merchantKey: string;
  merchantSalt: string;
  testMode: boolean;
}

function paytrConfig(): PaytrConfig | null {
  const merchantId = process.env.PAYTR_MERCHANT_ID?.trim();
  const merchantKey = process.env.PAYTR_MERCHANT_KEY?.trim();
  const merchantSalt = process.env.PAYTR_MERCHANT_SALT?.trim();
  if (!merchantId || !merchantKey || !merchantSalt) return null;
  return { merchantId, merchantKey, merchantSalt, testMode: process.env.PAYTR_TEST_MODE?.trim() === "1" };
}

export function isCardPaymentEnabled(): boolean {
  return paytrConfig() !== null;
}

export function isPaytrTestMode(): boolean {
  return paytrConfig()?.testMode ?? false;
}

const hmacBase64 = (key: string, data: string) => createHmac("sha256", key).update(data, "utf8").digest("base64");

// PayTR'nin sipariş numarası (merchant_oid) yalnızca harf ve rakam kabul eder: MK-261127-7HQ4KD <-> MK2611277HQ4KD.
export function toMerchantOid(orderNo: string): string {
  return orderNo.replaceAll("-", "");
}

export function fromMerchantOid(oid: string): string | null {
  const match = /^MK(\d{6})([A-Z0-9]{6})$/.exec(oid);
  return match ? `MK-${match[1]}-${match[2]}` : null;
}

// 1 adım: token isteğinin imzası. Sıra PayTR dokümanındaki gibidir; tuz en sona eklenir.
export function paytrTokenHash(
  fields: {
    merchantId: string;
    userIp: string;
    merchantOid: string;
    email: string;
    paymentAmount: number;
    userBasket: string;
    noInstallment: string;
    maxInstallment: string;
    currency: string;
    testMode: string;
  },
  merchantKey: string,
  merchantSalt: string,
): string {
  const data =
    fields.merchantId +
    fields.userIp +
    fields.merchantOid +
    fields.email +
    String(fields.paymentAmount) +
    fields.userBasket +
    fields.noInstallment +
    fields.maxInstallment +
    fields.currency +
    fields.testMode +
    merchantSalt;
  return hmacBase64(merchantKey, data);
}

// 2. adım: bildirimin imzası: merchant_oid + tuz + status + total_amount.
export function paytrCallbackHash(merchantOid: string, status: string, totalAmount: string, merchantKey: string, merchantSalt: string): string {
  return hmacBase64(merchantKey, merchantOid + merchantSalt + status + totalAmount);
}

// Sepet: [ad, birim fiyat "18.00", adet] satırlarının JSON'u, base64. Bilgi amaçlıdır; çekilen tutar payment_amount'tur.
export function paytrBasket(items: { name: string; unitPriceKurus: number; quantity: number }[]): string {
  const rows = items.map((item) => [item.name.slice(0, 200), (item.unitPriceKurus / 100).toFixed(2), item.quantity]);
  return Buffer.from(JSON.stringify(rows), "utf8").toString("base64");
}

export type TokenResult = { ok: true; token: string } | { ok: false; reason: string };

interface TokenOrder {
  orderNo: string;
  email: string;
  fullName: string;
  phone: string;
  shipLine: string;
  shipDistrict: string;
  shipCity: string;
  totalKurus: number;
  items: { name: string; unitPriceKurus: number; quantity: number }[];
}

// Ödeme çerçevesi için token alır. Her çağrı yeni token üretir (sayfa yenilenirse çerçeve yeniden açılır).
// Taksit kapalıdır (işletme kararı, 2026-11-27): no_installment=1, max_installment=0.
export async function requestPaytrToken(order: TokenOrder, userIp: string): Promise<TokenResult> {
  const config = paytrConfig();
  if (!config) return { ok: false, reason: "PayTR ayarları eksik." };

  const base = site.url.replace(/\/$/, "");
  const fields = {
    merchantId: config.merchantId,
    userIp,
    merchantOid: toMerchantOid(order.orderNo),
    email: order.email,
    paymentAmount: order.totalKurus,
    userBasket: paytrBasket(order.items),
    noInstallment: "1",
    maxInstallment: "0",
    currency: "TL",
    testMode: config.testMode ? "1" : "0",
  };
  const body = new URLSearchParams({
    merchant_id: fields.merchantId,
    user_ip: fields.userIp,
    merchant_oid: fields.merchantOid,
    email: fields.email,
    payment_amount: String(fields.paymentAmount),
    paytr_token: paytrTokenHash(fields, config.merchantKey, config.merchantSalt),
    user_basket: fields.userBasket,
    debug_on: config.testMode ? "1" : "0",
    no_installment: fields.noInstallment,
    max_installment: fields.maxInstallment,
    user_name: order.fullName.slice(0, 60),
    user_address: `${order.shipLine}, ${order.shipDistrict}/${order.shipCity}`.slice(0, 400),
    user_phone: order.phone.slice(0, 20),
    merchant_ok_url: `${base}/siparis/${order.orderNo}?odeme=tamam`,
    merchant_fail_url: `${base}/odeme/kart/${order.orderNo}/vazgec`,
    timeout_limit: String(TIMEOUT_MINUTES),
    currency: fields.currency,
    test_mode: fields.testMode,
    lang: "tr",
  });

  try {
    const response = await fetch(TOKEN_URL, { method: "POST", body, signal: AbortSignal.timeout(15_000), cache: "no-store" });
    const data = (await response.json()) as { status?: string; token?: string; reason?: string };
    if (data.status === "success" && data.token) return { ok: true, token: data.token };
    console.error("[PayTR] Token alınamadı:", order.orderNo, data.reason ?? response.status);
    return { ok: false, reason: data.reason ?? `HTTP ${response.status}` };
  } catch (error) {
    console.error("[PayTR] Token isteği başarısız:", order.orderNo, error);
    return { ok: false, reason: "PayTR'ye ulaşılamadı." };
  }
}

export type CallbackCheck =
  | { ok: true; orderNo: string | null; merchantOid: string; status: "success" | "failed"; totalAmount: number; reason: string }
  | { ok: false };

// Bildirimin PayTR'den geldiğini imzasından doğrular.
export function verifyPaytrCallback(form: FormData): CallbackCheck {
  const config = paytrConfig();
  if (!config) return { ok: false };
  const field = (key: string) => String(form.get(key) ?? "");
  const merchantOid = field("merchant_oid");
  const status = field("status");
  const totalAmount = field("total_amount");
  const given = Buffer.from(field("hash"));
  const expected = Buffer.from(paytrCallbackHash(merchantOid, status, totalAmount, config.merchantKey, config.merchantSalt));
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return { ok: false };
  if (status !== "success" && status !== "failed") return { ok: false };
  return {
    ok: true,
    orderNo: fromMerchantOid(merchantOid),
    merchantOid,
    status,
    totalAmount: Number(totalAmount),
    reason: [field("failed_reason_code"), field("failed_reason_msg")].filter(Boolean).join(" "),
  };
}

// ---------- Siparişin ödeme sonucuna göre ilerlemesi ----------

type Tx = Prisma.TransactionClient;

// Ödeme bekleyen siparişi iptal eder ve ayrılan stoğu geri verir. Koşulludur: sipariş o sırada başka bir yoldan
// (bildirim, süre dolması, yeni sipariş) ilerlediyse hiçbir şey yapmaz ve false döner.
export async function cancelAwaitingOrder(tx: Tx, orderId: string): Promise<boolean> {
  const updated = await tx.order.updateMany({ where: { id: orderId, status: "AWAITING_PAYMENT" }, data: { status: "CANCELLED" } });
  if (updated.count !== 1) return false;
  const items = await tx.orderItem.findMany({ where: { orderId }, select: { productId: true, quantity: true } });
  for (const item of items) {
    if (item.productId) await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
  }
  return true;
}

// Aynı sepetten açılmış, ödemesi yarım kalmış siparişler: müşteri yeniden sipariş verirken iptal edilir (stok iki kez
// ayrılmasın, hoş geldin indirimi eski denemeye takılmasın).
export async function cancelAwaitingOrdersOfCart(tx: Tx, cartId: string): Promise<number> {
  const orders = await tx.order.findMany({ where: { cartId, status: "AWAITING_PAYMENT" }, select: { id: true } });
  let count = 0;
  for (const order of orders) if (await cancelAwaitingOrder(tx, order.id)) count++;
  return count;
}

// Süresi dolmuş (ödeme çerçevesi artık kullanılamayan) ödeme bekleyen siparişleri iptal eder.
export async function cancelExpiredAwaitingOrders(now = new Date()): Promise<number> {
  const before = new Date(now.getTime() - AWAITING_PAYMENT_EXPIRE_MINUTES * 60_000);
  const orders = await db.order.findMany({ where: { status: "AWAITING_PAYMENT", createdAt: { lt: before } }, select: { id: true }, take: 200 });
  let count = 0;
  for (const order of orders) {
    if (await db.$transaction((tx) => cancelAwaitingOrder(tx, order.id))) count++;
  }
  return count;
}

const paidOrderInclude = { items: true } satisfies Prisma.OrderInclude;
export type PaidOrder = Prisma.OrderGetPayload<{ include: typeof paidOrderInclude }>;

export type PaymentOutcome =
  | { kind: "paid"; order: PaidOrder; warning?: string }
  | { kind: "ignored" };

// Başarılı ödeme bildirimi. Aynı bildirim birden çok gelebilir: yalnızca ilki siparişi ilerletir.
// Ödeme bekleyen sipariş PAID olur ve sepet boşaltılır. Sipariş bu arada iptal edilmişse (süre doldu, müşteri yeniden
// denedi) para alınmıştır: sipariş geri açılır, stok yeniden ayrılır; stok yetmezse mağazaya uyarı gider.
export async function settlePaidOrder(orderNo: string, totalAmountKurus: number, merchantOid: string): Promise<PaymentOutcome> {
  return db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { orderNo }, include: paidOrderInclude });
    if (!order || order.paymentProvider !== CARD_PAYMENT) return { kind: "ignored" as const };

    const warnings: string[] = [];
    if (order.status === "AWAITING_PAYMENT") {
      const updated = await tx.order.updateMany({ where: { id: order.id, status: "AWAITING_PAYMENT" }, data: { status: "PAID", paymentRef: merchantOid } });
      if (updated.count !== 1) return { kind: "ignored" as const };
    } else if (order.status === "CANCELLED" && !order.paymentRef) {
      const updated = await tx.order.updateMany({ where: { id: order.id, status: "CANCELLED", paymentRef: null }, data: { status: "PAID", paymentRef: merchantOid } });
      if (updated.count !== 1) return { kind: "ignored" as const };
      for (const item of order.items) {
        if (!item.productId) continue;
        const reserved = await tx.product.updateMany({ where: { id: item.productId, stock: { gte: item.quantity } }, data: { stock: { decrement: item.quantity } } });
        if (reserved.count !== 1) warnings.push(`"${item.name}" için stok yetmedi`);
      }
      warnings.unshift("Bu sipariş ödeme süresi dolduğu ya da müşteri yeniden denediği için iptal edilmişti; ödeme sonradan geldi ve sipariş yeniden açıldı.");
    } else {
      return { kind: "ignored" as const };
    }

    if (totalAmountKurus < order.totalKurus) warnings.push(`PayTR'nin bildirdiği tutar (${totalAmountKurus / 100} TL) sipariş toplamından düşük.`);

    // Ödenen ürünler sepetten çıkar; müşterinin bu arada eklediği başka ürünler kalır.
    if (order.cartId) {
      const productIds = order.items.map((item) => item.productId).filter((id): id is string => Boolean(id));
      await tx.cartItem.deleteMany({ where: { cartId: order.cartId, productId: { in: productIds } } });
    }

    return { kind: "paid" as const, order: { ...order, status: "PAID" as const, paymentRef: merchantOid }, warning: warnings.join(" ") || undefined };
  });
}

// Başarısız ödeme bildirimi: sipariş iptal, stok geri. Sepet zaten duruyor; müşteri yeniden deneyebilir.
export async function settleFailedOrder(orderNo: string): Promise<boolean> {
  const order = await db.order.findUnique({ where: { orderNo }, select: { id: true, paymentProvider: true } });
  if (!order || order.paymentProvider !== CARD_PAYMENT) return false;
  return db.$transaction((tx) => cancelAwaitingOrder(tx, order.id));
}
