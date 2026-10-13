import { beforeEach, describe, expect, it, vi } from "vitest";

// Sahte veritabanı: yalnızca addItemsToCart'ın kullandığı çağrılar.
const state = {
  products: [] as { id: string; stock: number }[],
  cart: new Map<string, number>(),
};

vi.mock("@/lib/cart", () => ({ getOrCreateCartId: async () => "cart1" }));
vi.mock("@/lib/db", () => ({
  db: {
    // Gerçek sorgudaki id süzgecini taklit eder (satışta olmayan ürün zaten state.products'ta yoktur).
    product: {
      findMany: async (args: { where: { id: { in: string[] } } }) =>
        state.products.filter((p) => args.where.id.in.includes(p.id)),
    },
    cartItem: {
      findMany: async () => [...state.cart].map(([productId, quantity]) => ({ productId, quantity })),
      upsert: (args: { create: { productId: string; quantity: number } }) => args.create,
    },
    // Toplu işlem: verilen upsert sonuçlarını sepete yazar.
    $transaction: async (ops: { productId: string; quantity: number }[]) => {
      for (const op of ops) state.cart.set(op.productId, op.quantity);
      return ops;
    },
  },
}));

const { addItemsToCart } = await import("@/lib/cart-items");

describe("addItemsToCart", () => {
  beforeEach(() => {
    state.products = [
      { id: "a", stock: 5 },
      { id: "b", stock: 1 },
    ];
    state.cart = new Map();
  });

  it("aynı ürünün adetlerini toplar", async () => {
    const result = await addItemsToCart([
      { productId: "a", quantity: 1 },
      { productId: "a", quantity: 2 },
    ]);
    expect(state.cart.get("a")).toBe(3);
    expect(result).toEqual({ added: 1, skipped: 0, adjusted: 0 });
  });

  it("stoğu aşan adedi stoğa düşürür ve bildirir", async () => {
    const result = await addItemsToCart([{ productId: "b", quantity: 4 }]);
    expect(state.cart.get("b")).toBe(1);
    expect(result.adjusted).toBe(1);
  });

  it("sepetteki adede ekler ama stoğu geçmez", async () => {
    state.cart.set("a", 4);
    await addItemsToCart([{ productId: "a", quantity: 3 }]);
    expect(state.cart.get("a")).toBe(5);
  });

  it("satışta olmayan ya da stoksuz ürünü atlar", async () => {
    const result = await addItemsToCart([
      { productId: "a", quantity: 1 },
      { productId: "yok", quantity: 1 },
    ]);
    expect(result.skipped).toBe(1);
    expect(state.cart.has("yok")).toBe(false);
  });

  it("hiçbir ürün eklenemezse sepete dokunmaz", async () => {
    state.products = [];
    const result = await addItemsToCart([{ productId: "a", quantity: 1 }]);
    expect(result).toEqual({ added: 0, skipped: 1, adjusted: 0 });
    expect(state.cart.size).toBe(0);
  });
});
