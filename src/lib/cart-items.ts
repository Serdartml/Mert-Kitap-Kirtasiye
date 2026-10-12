import "server-only";
import { db } from "./db";
import { getOrCreateCartId } from "./cart";

export interface CartItemInput {
  productId: string;
  quantity: number;
}

export interface AddItemsResult {
  // Sepete eklenen (ya da adedi artan) farklı ürün sayısı.
  added: number;
  // Satışta olmadığı ya da stokta kalmadığı için eklenemeyen ürün sayısı.
  skipped: number;
  // İstenen adet stoğu aştığı için düşürülen ürün sayısı.
  adjusted: number;
}

// Birden çok ürünü tek seferde sepete ekler (okula dönüş listesi, "tekrar sipariş ver"). Her ürün için
// sepetteki adetle toplanır ve stokla sınırlanır; stokta olmayan ürün atlanır. Tek sepet kaydı kullanılır.
export async function addItemsToCart(inputs: CartItemInput[]): Promise<AddItemsResult> {
  // Aynı ürün birden çok kez gelirse adetler toplanır.
  const wanted = new Map<string, number>();
  for (const { productId, quantity } of inputs) {
    wanted.set(productId, (wanted.get(productId) ?? 0) + quantity);
  }

  const products = await db.product.findMany({
    where: { id: { in: [...wanted.keys()] }, isActive: true, stock: { gt: 0 } },
    select: { id: true, stock: true },
  });
  const result: AddItemsResult = { added: 0, skipped: wanted.size - products.length, adjusted: 0 };
  if (products.length === 0) return result;

  const cartId = await getOrCreateCartId();
  const existing = await db.cartItem.findMany({
    where: { cartId, productId: { in: products.map((p) => p.id) } },
    select: { productId: true, quantity: true },
  });
  const inCart = new Map(existing.map((item) => [item.productId, item.quantity]));

  await db.$transaction(
    products.map((product) => {
      const total = (inCart.get(product.id) ?? 0) + (wanted.get(product.id) ?? 0);
      const finalQuantity = Math.min(total, product.stock);
      result.added += 1;
      if (finalQuantity < total) result.adjusted += 1;
      return db.cartItem.upsert({
        where: { cartId_productId: { cartId, productId: product.id } },
        create: { cartId, productId: product.id, quantity: finalQuantity },
        update: { quantity: finalQuantity },
      });
    }),
  );
  return result;
}
