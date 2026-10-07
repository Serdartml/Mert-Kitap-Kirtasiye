import "server-only";
import { cookies } from "next/headers";
import { randomInt } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { getCurrentUser } from "./auth";
import { db } from "./db";

// Üye olmadan verilen siparişlerin sahibi bu çerezle tanınır: siparişin tahmin edilemeyen kimliği
// (cuid) çerezde durur. Sipariş numarası kısa ve okunaklıdır, tek başına erişim vermez.
export const GUEST_ORDERS_COOKIE = "guest_orders";
const GUEST_ORDERS_MAX = 5;
const GUEST_ORDERS_MAX_AGE = 60 * 60 * 24 * 90;

// Karıştırılabilen karakterler (0/O, 1/I/L) yok: numara telefonda okunabilir olmalı.
const ORDER_NO_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

// Örnek: MK-261007-7HQ4KD (yıl, ay, gün + rastgele altı karakter).
export function generateOrderNo(now = new Date()): string {
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "2-digit", month: "2-digit", day: "2-digit" })
    .format(now)
    .replaceAll("-", "");
  let random = "";
  for (let i = 0; i < 6; i++) random += ORDER_NO_ALPHABET[randomInt(ORDER_NO_ALPHABET.length)];
  return `MK-${date}-${random}`;
}

async function getGuestOrderIds(): Promise<string[]> {
  const raw = (await cookies()).get(GUEST_ORDERS_COOKIE)?.value ?? "";
  return raw.split(".").filter(Boolean).slice(0, GUEST_ORDERS_MAX);
}

// Yalnızca server action içinden çağrılabilir (çerez yazar).
export async function rememberGuestOrder(orderId: string): Promise<void> {
  const ids = [orderId, ...(await getGuestOrderIds()).filter((id) => id !== orderId)].slice(0, GUEST_ORDERS_MAX);
  (await cookies()).set(GUEST_ORDERS_COOKIE, ids.join("."), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: GUEST_ORDERS_MAX_AGE,
    path: "/",
  });
}

const orderInclude = {
  items: { orderBy: { name: "asc" }, include: { product: { select: { slug: true, isActive: true } } } },
} satisfies Prisma.OrderInclude;

export type OrderData = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

// Siparişi yalnızca sahibi görebilir: siparişi veren üye ya da (misafir siparişinde) siparişi veren
// tarayıcı. Başkasına ait ya da olmayan sipariş için null döner; çağıran ikisini ayırt etmemelidir.
export async function getOrderForViewer(orderNo: string): Promise<OrderData | null> {
  const order = await db.order.findUnique({ where: { orderNo }, include: orderInclude });
  if (!order) return null;

  const user = await getCurrentUser();
  if (user && order.userId === user.id) return order;
  if ((await getGuestOrderIds()).includes(order.id)) return order;
  return null;
}

export function getAdminOrder(id: string) {
  return db.order.findUnique({ where: { id }, include: { ...orderInclude, user: { select: { email: true, name: true } } } });
}
