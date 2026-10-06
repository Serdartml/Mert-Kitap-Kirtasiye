import Link from "next/link";
import AddToCartButton from "./AddToCartButton";
import ProductVisual from "./ProductVisual";
import type { ProductCardData } from "@/lib/catalog";
import { discountPercent, formatPrice } from "@/lib/format";

export default function ProductCard({ product }: { product: ProductCardData }) {
  const discount = discountPercent(product.priceKurus, product.compareAtKurus);
  const rootSlug = product.category.parent?.slug ?? product.category.slug;

  return (
    <article className="group flex flex-col rounded-xl border border-neutral-200 bg-white p-3 transition-shadow hover:shadow-lg">
      <Link href={`/urun/${product.slug}`} className="relative block">
        <ProductVisual name={product.name} rootCategorySlug={rootSlug} image={product.images[0]} />
        {discount && (
          <span className="absolute left-2 top-2 rounded-md bg-ink px-2 py-1 text-xs font-extrabold text-brand-500">
            %{discount}
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col pt-3">
        <p className="text-xs font-semibold text-neutral-500">{product.category.name}</p>
        <h3 className="mt-1 line-clamp-2 min-h-10 text-sm font-bold leading-5">
          <Link href={`/urun/${product.slug}`} className="hover:underline">
            {product.name}
          </Link>
        </h3>

        <div className="mb-3 mt-2 flex flex-wrap items-baseline gap-x-2">
          <span className="text-lg font-extrabold">{formatPrice(product.priceKurus)}</span>
          {discount && product.compareAtKurus && (
            <span className="text-xs text-neutral-500 line-through">{formatPrice(product.compareAtKurus)}</span>
          )}
        </div>

        <div className="mt-auto">
          <AddToCartButton productId={product.id} stock={product.stock} />
        </div>
      </div>
    </article>
  );
}
