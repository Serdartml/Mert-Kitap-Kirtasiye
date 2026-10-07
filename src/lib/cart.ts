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
  await setCartCookie(cart.id);
  return cart.id;
}

async function setCartCookie(cartId: string): Promise<void> {
  (await cookies()).set(CART_COOKIE, cartId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: CART_COOKIE_MAX_AGE,
    path: "/",
  });
}

// Giriş ya da kayıt sonrası: misafir sepeti kullanıcıya bağlanır. Kullanıcının önceki oturumlardan
// kalan bir sepeti varsa misafir sepetindeki ürünler ona eklenir (adetler toplanır; stok sınırı sepet
// ve ödeme adımında ayrıca denetlenir). Yalnızca server action içinden çağrılabilir (çerez yazar).
export async function attachCartToUser(userId: string): Promise<void> {
  const [guestId, userCart] = await Promise.all([getCartId(), db.cart.findUnique({ where: { userId } })]);

  const guest =
    guestId && guestId !== userCart?.id
      ? await db.cart.findUnique({ where: { id: guestId }, include: { items: true } })
      : null;

  // Çerezdeki sepet yoksa ya da başka bir üyeye aitse yalnızca kullanıcının kendi sepetine geçilir.
  if (!guest || (guest.userId && guest.userId !== userId)) {
    if (userCart) await setCartCookie(userCart.id);
    else if (guest) (await cookies()).delete(CART_COOKIE);
    return;
  }

  if (!userCart) {
    await db.cart.update({ where: { id: guest.id }, data: { userId } });
    return;
  }

  await db.$transaction([
    ...guest.items.map((item) =>
      db.cartItem.upsert({
        where: { cartId_productId: { cartId: userCart.id, productId: item.productId } },
        create: { cartId: userCart.id, productId: item.productId, quantity: item.quantity },
        update: { quantity: { increment: item.quantity } },
      }),
    ),
    db.cart.delete({ where: { id: guest.id } }),
  ]);
  await setCartCookie(userCart.id);
}

// Çıkışta: sepet üyeye bağlıysa çerez silinir ki aynı cihazdaki sonraki ziyaretçi onu görmesin.
// Sepetin kendisi durur; üye tekrar giriş yapınca geri gelir.
export async function releaseCartCookie(): Promise<void> {
  const id = await getCartId();
  if (!id) return;
  const cart = await db.cart.findUnique({ where: { id }, select: { userId: true } });
  if (!cart || cart.userId) (await cookies()).delete(CART_COOKIE);
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
