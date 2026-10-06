import type { Metadata } from "next";
import Link from "next/link";
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { removeCartItem, setCartItemQuantity } from "@/actions/cart";
import ProductVisual from "@/components/ProductVisual";
import { cartTotals, getCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";

export const metadata: Metadata = {
  title: "Sepetim",
  robots: { index: false },
};

export default async function CartPage() {
  const cart = await getCart();
  const { subtotalKurus, count } = cartTotals(cart);

  if (!cart || cart.items.length === 0) {
    return (
      <div className="container-page py-20 text-center">
        <ShoppingCart className="mx-auto text-neutral-300" size={56} strokeWidth={1.25} />
        <h1 className="mt-4 text-2xl font-extrabold">Sepetiniz boş</h1>
        <p className="mt-2 text-sm text-neutral-600">Ürünleri inceleyip sepetinize ekleyebilirsiniz.</p>
        <Link href="/" className="btn btn-primary mt-6">Alışverişe Başla</Link>
      </div>
    );
  }

  return (
    <div className="container-page py-8">
      <h1 className="text-2xl font-extrabold md:text-3xl">
        Sepetim <span className="text-base font-semibold text-neutral-500">({count} ürün)</span>
      </h1>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_22rem]">
        <ul className="divide-y divide-neutral-200 rounded-xl border border-neutral-200">
          {cart.items.map((item) => {
            const { product } = item;
            const rootSlug = product.category.parent?.slug ?? product.category.slug;
            return (
              <li key={item.id} className="flex gap-4 p-4">
                <Link href={`/urun/${product.slug}`} className="w-20 shrink-0 sm:w-24">
                  <ProductVisual name={product.name} rootCategorySlug={rootSlug} image={product.images[0]} sizes="96px" />
                </Link>

                <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <Link href={`/urun/${product.slug}`} className="text-sm font-bold hover:underline">
                      {product.name}
                    </Link>
                    <p className="mt-1 text-xs text-neutral-500">Birim fiyat: {formatPrice(product.priceKurus)}</p>
                    {item.quantity > product.stock && (
                      <p className="mt-1 text-xs font-bold text-red-700">Stokta yalnızca {product.stock} adet kaldı.</p>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center rounded-lg border border-neutral-300">
                      <form action={setCartItemQuantity.bind(null, item.id, item.quantity - 1)}>
                        <button type="submit" aria-label="Adedi azalt" className="grid size-9 place-items-center">
                          <Minus size={14} />
                        </button>
                      </form>
                      <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                      <form action={setCartItemQuantity.bind(null, item.id, item.quantity + 1)}>
                        <button
                          type="submit"
                          aria-label="Adedi artır"
                          disabled={item.quantity >= product.stock}
                          className="grid size-9 place-items-center disabled:opacity-30"
                        >
                          <Plus size={14} />
                        </button>
                      </form>
                    </div>

                    <span className="w-24 text-right text-base font-extrabold">
                      {formatPrice(product.priceKurus * item.quantity)}
                    </span>

                    <form action={removeCartItem.bind(null, item.id)}>
                      <button type="submit" aria-label={`${product.name} ürününü sepetten çıkar`} className="grid size-9 place-items-center rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-red-700">
                        <Trash2 size={18} />
                      </button>
                    </form>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <aside className="h-fit rounded-xl border border-neutral-200 p-5 lg:sticky lg:top-48">
          <h2 className="text-lg font-extrabold">Sipariş Özeti</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-neutral-600">Ara toplam</dt>
              <dd className="font-bold">{formatPrice(subtotalKurus)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral-600">Kargo</dt>
              <dd className="text-neutral-500">Ödeme adımında hesaplanır</dd>
            </div>
            <div className="flex justify-between border-t border-neutral-200 pt-3 text-base">
              <dt className="font-extrabold">Toplam</dt>
              <dd className="font-extrabold">{formatPrice(subtotalKurus)}</dd>
            </div>
          </dl>
          <Link href="/odeme" className="btn btn-primary mt-5 w-full">Siparişi Tamamla</Link>
          <Link href="/" className="btn btn-outline mt-2 w-full">Alışverişe Devam Et</Link>
        </aside>
      </div>
    </div>
  );
}
