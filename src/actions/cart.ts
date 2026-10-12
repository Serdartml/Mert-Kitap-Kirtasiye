"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCartId, getOrCreateCartId } from "@/lib/cart";
import { addItemsToCart } from "@/lib/cart-items";

export interface CartActionResult {
  ok: boolean;
  message: string;
  // İstenen adet stoğu aştığı için düşürüldüyse true.
  adjusted?: boolean;
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
    ? { ok: true, adjusted: true, message: `Stokta ${product.stock} adet var; sepetiniz buna göre güncellendi.` }
    : { ok: true, message: "Sepete eklendi." };
}

// Okula dönüş listesinden seçilenleri tek seferde sepete ekler.
export interface AddManyResult {
  ok: boolean;
  message: string;
  added: number;
}

const MAX_BULK_ITEMS = 30;
const MAX_BULK_QUANTITY = 99;

export async function addManyToCart(items: { productId: string; quantity: number }[]): Promise<AddManyResult> {
  if (!Array.isArray(items) || items.length === 0) return { ok: false, message: "Listeden ürün seçin.", added: 0 };
  if (items.length > MAX_BULK_ITEMS) return { ok: false, message: "Tek seferde en fazla 30 ürün eklenebilir.", added: 0 };

  const clean = items.filter(
    (item) =>
      typeof item?.productId === "string" &&
      /^[a-z0-9]+$/.test(item.productId) &&
      Number.isInteger(item.quantity) &&
      item.quantity >= 1 &&
      item.quantity <= MAX_BULK_QUANTITY,
  );
  if (clean.length === 0) return { ok: false, message: "Seçimler geçersiz.", added: 0 };

  const result = await addItemsToCart(clean);
  if (result.added === 0) return { ok: false, message: "Seçtiğiniz ürünler şu an stokta yok.", added: 0 };

  revalidatePath("/", "layout");
  const notes = [
    result.skipped > 0 ? `${result.skipped} ürün stokta olmadığı için eklenmedi` : "",
    result.adjusted > 0 ? `${result.adjusted} ürünün adedi stoğa göre düşürüldü` : "",
  ].filter(Boolean);
  return {
    ok: true,
    added: result.added,
    message: `${result.added} ürün sepete eklendi${notes.length ? `. ${notes.join(", ")}` : "."}`,
  };
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
