import Link from "next/link";
import AddToCartButton from "./AddToCartButton";
import ProductVisual from "./ProductVisual";
import QuickViewArea from "./QuickViewArea";
import { getNewProductCutoff, type ProductCardData } from "@/lib/catalog";
import { discountPercent, formatPrice } from "@/lib/format";

// Stoğu bu sayıya ya da altına düşen ürüne "Son N adet" rozeti konur.
export const LOW_STOCK_THRESHOLD = 5;

const badgeBase = "rounded-md px-1.5 py-0.5 text-[11px] font-extrabold leading-4 shadow-sm sm:px-2 sm:text-xs";

// Rozetler görselin alt kenarına yarı biner (yapıştırılmış etiket gibi). Satır, rozet olmasa da yer tutar:
// aynı ızgaradaki kartların yazıları aynı hizada kalır. Renkler sabittir (her temada aynı okunur).
function Badges({ stock, isNew }: { stock: number; isNew: boolean }) {
  return (
    <div className="pointer-events-none relative z-10 -mt-3 flex h-6 items-center gap-1 px-1.5">
      {stock < 1 ? (
        <span className={`${badgeBase} bg-neutral-800 text-white`}>Tükendi</span>
      ) : (
        <>
          {isNew && <span className={`${badgeBase} -rotate-2 bg-brand-500 text-ink`}>Yeni</span>}
          {stock <= LOW_STOCK_THRESHOLD && (
            <span className={`${badgeBase} rotate-1 bg-[#fff1f0] text-[#b42318] ring-1 ring-[#f5b5ae]`}>Son {stock} adet</span>
          )}
        </>
      )}
    </div>
  );
}

// Karta mobilde uzun basınca, masaüstünde fareyle 2 sn bekleyince hızlı bakış açılır (QuickViewArea).
export default async function ProductCard({ product }: { product: ProductCardData }) {
  const discount = discountPercent(product.priceKurus, product.compareAtKurus);
  const rootSlug = product.category.parent?.slug ?? product.category.slug;
  const cutoff = await getNewProductCutoff();
  const isNew = cutoff !== null && product.createdAt.getTime() > cutoff;

  return (
    <QuickViewArea
      slug={product.slug}
      className="group flex min-w-0 flex-col rounded-xl border border-neutral-200 bg-raised p-2 transition duration-200 hover:-translate-y-1 hover:shadow-lg sm:p-3"
    >
      <Link href={`/urun/${product.slug}`} className="relative block">
        <ProductVisual name={product.name} rootCategorySlug={rootSlug} image={product.images[0]} />
        {discount && (
          <span className="absolute left-2 top-2 -rotate-6 rounded-md bg-ink shadow-md px-2 py-1 text-xs font-extrabold text-brand-500">
            %{discount}
          </span>
        )}
      </Link>
      <Badges stock={product.stock} isNew={isNew} />

      <div className="flex flex-1 flex-col pt-1.5">
        <p className="truncate text-xs font-semibold text-neutral-500">{product.category.name}</p>
        <h3 className="mt-1 line-clamp-2 min-h-10 break-words text-[13px] font-bold leading-5 sm:text-sm">
          <Link href={`/urun/${product.slug}`} className="hover:underline">
            {product.name}
          </Link>
        </h3>

        <div className="mb-3 mt-2 flex flex-wrap items-baseline gap-x-2">
          <span className="text-base font-extrabold sm:text-lg">{formatPrice(product.priceKurus)}</span>
          {discount && product.compareAtKurus && (
            <span className="text-xs text-neutral-500 line-through">{formatPrice(product.compareAtKurus)}</span>
          )}
        </div>

        <div className="mt-auto">
          <AddToCartButton productId={product.id} stock={product.stock} name={product.name} />
        </div>
      </div>
    </QuickViewArea>
  );
}
