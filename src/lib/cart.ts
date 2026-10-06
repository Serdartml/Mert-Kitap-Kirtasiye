import "server-only";
import { cookies } from "next/headers";
import type { Prisma } from "@prisma/client";
import { db } from "./db";

export const CART_COOKIE = "cart_id";
const CART_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

const cartInclude = {
  items: {
    orderBy: { createdAt: "asc" },
    include: {
      product: {
        include: {
          category: { include: { parent: true } },
          images: { orderBy: { sortOrder: "asc" }, take: 1 },
        },
      },
    },
  },
} satisfies Prisma.CartInclude;

export type CartData = Prisma.CartGetPayload<{ include: typeof cartInclude }>;

export async function getCartId(): Promise<string | null> {
  return (await cookies()).get(CART_COOKIE)?.value ?? null;
}

export async function getCart(): Promise<CartData | null> {
  const id = await getCartId();
  if (!id) return null;
  return db.cart.findUnique({ where: { id }, include: cartInclude });
}

// Çerez yazdığı için yalnızca server action / route handler içinden çağrılabilir.
export async function getOrCreateCartId(): Promise<string> {
  const existing = await getCartId();
  if (existing && (await db.cart.findUnique({ where: { id: existing }, select: { id: true } }))) {
    return existing;
  }

  const cart = await db.cart.create({ data: {} });
  (await cookies()).set(CART_COOKIE, cart.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: CART_COOKIE_MAX_AGE,
    path: "/",
  });
  return cart.id;
}

export async function getCartCount(): Promise<number> {
  const id = await getCartId();
  if (!id) return 0;
  const result = await db.cartItem.aggregate({ where: { cartId: id }, _sum: { quantity: true } });
  return result._sum.quantity ?? 0;
}

export function cartTotals(cart: CartData | null) {
  const items = cart?.items ?? [];
  const subtotalKurus = items.reduce((sum, item) => sum + item.product.priceKurus * item.quantity, 0);
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  return { subtotalKurus, count };
}
