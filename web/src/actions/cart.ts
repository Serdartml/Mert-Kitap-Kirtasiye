"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCartId, getOrCreateCartId } from "@/lib/cart";

export interface CartActionResult {
  ok: boolean;
  message: string;
}

export async function addToCart(productId: string, quantity = 1): Promise<CartActionResult> {
  if (!Number.isInteger(quantity) || quantity < 1) {
    return { ok: false, message: "Geçersiz adet." };
  }

  const product = await db.product.findUnique({ where: { id: productId } });
  if (!product || !product.isActive) return { ok: false, message: "Ürün bulunamadı." };
  if (product.stock < 1) return { ok: false, message: "Bu ürün stokta yok." };

  const cartId = await getOrCreateCartId();
  const existing = await db.cartItem.findUnique({
    where: { cartId_productId: { cartId, productId } },
  });
  const wanted = (existing?.quantity ?? 0) + quantity;
  const finalQuantity = Math.min(wanted, product.stock);

  await db.cartItem.upsert({
    where: { cartId_productId: { cartId, productId } },
    create: { cartId, productId, quantity: finalQuantity },
    update: { quantity: finalQuantity },
  });

  revalidatePath("/", "layout");
  return finalQuantity < wanted
    ? { ok: true, message: `Stokta ${product.stock} adet var; sepetiniz buna göre güncellendi.` }
    : { ok: true, message: "Sepete eklendi." };
}

export async function setCartItemQuantity(itemId: string, quantity: number): Promise<void> {
  const cartId = await getCartId();
  if (!cartId || !Number.isInteger(quantity)) return;

  // Kalem, çerezdeki sepete ait değilse dokunma.
  const item = await db.cartItem.findFirst({ where: { id: itemId, cartId }, include: { product: true } });
  if (!item) return;

  if (quantity < 1) {
    await db.cartItem.delete({ where: { id: item.id } });
  } else {
    await db.cartItem.update({
      where: { id: item.id },
      data: { quantity: Math.min(quantity, Math.max(item.product.stock, 1)) },
    });
  }

  revalidatePath("/", "layout");
}

export async function removeCartItem(itemId: string): Promise<void> {
  await setCartItemQuantity(itemId, 0);
}
