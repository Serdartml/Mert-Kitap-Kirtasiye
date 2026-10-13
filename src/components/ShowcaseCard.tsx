import Link from "next/link";
import AddToCartButton from "./AddToCartButton";
import ProductVisual from "./ProductVisual";
import type { ProductCardData } from "@/lib/catalog";
import { categoryTones, fallbackCategoryTone } from "@/lib/category-icons";
import { discountPercent, formatPrice } from "@/lib/format";

// Vitrin kartı (ana sayfa, LiveShowcase): normal ürün kartından bilerek farklı. Her temada koyu "vitrin camı" zemin,
// limon ince çerçeve ve köşe parıltısı, fotoğrafın üstünde el yazısı sıra numarası, büyük limon fiyat. Üstüne gelince
// kart hafif kalkar, görsel yakınlaşır ve bir ışık süzülür (globals.css, .lux-card). Hızlı bakış yok; kart bağlantıdır.
export default function ShowcaseCard({ product, index }: { product: ProductCardData; index: number }) {
  const discount = discountPercent(product.priceKurus, product.compareAtKurus);
  const rootSlug = product.category.parent?.slug ?? product.category.slug;
  const outOfStock = product.stock < 1;
  const hasImage = product.images.length > 0;
  const tone = (categoryTones[rootSlug] ?? fallbackCategoryTone).split(" ")[0];

  return (
    <article className="lux-card theme-fixed group relative flex w-[84%] shrink-0 snap-start flex-col overflow-hidden rounded-2xl bg-ink p-2 text-white sm:w-[min(22rem,70%)] sm:p-2.5 md:w-[calc((100%-2rem)/3)]">
      <Link href={`/urun/${product.slug}`} className="relative block overflow-hidden rounded-2xl ring-1 ring-white/15" aria-label={product.name}>
        {/* Görsel yatay kırpılır (4:3): kart kısa kalır, vitrin sayfayı doldurmaz. */}
        <div
          className={`aspect-[16/9] transition-transform duration-700 ease-out group-hover:scale-105 sm:aspect-[2/1] ${
            hasImage ? "[&>div]:!aspect-auto [&>div]:h-full" : `grid place-items-center ${tone}`
          }`}
        >
          {/* Fotoğraf varsa kutuyu doldurur; yer tutucu kapak kutunun yüksekliği kadar kare olur (harf kırpılmasın). */}
          {hasImage ? (
            <ProductVisual name={product.name} rootCategorySlug={rootSlug} image={product.images[0]} sizes="(min-width: 768px) 28vw, 80vw" />
          ) : (
            <div className="h-full max-w-full aspect-square [&>div]:!aspect-auto [&>div]:size-full [&>div]:rounded-none">
              <ProductVisual name={product.name} rootCategorySlug={rootSlug} />
            </div>
          )}
        </div>
        {/* Üst kenarda koyuya geçiş: sıra numarası fotoğraftan ayrılsın. */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-ink/40 to-transparent" />
        <span aria-hidden className="absolute left-2.5 top-0.5 font-hand text-3xl font-bold leading-none text-brand-500 drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)] sm:text-4xl">
          {String(index + 1).padStart(2, "0")}
        </span>
        {discount && (
          <span className="absolute right-2 top-2 rotate-6 rounded-full bg-brand-500 px-2.5 py-0.5 text-xs font-extrabold text-ink shadow-lg">
            %{discount} indirim
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col px-1 pb-0.5 pt-2">
        <p className="truncate text-[10px] font-bold uppercase tracking-[0.2em] text-brand-500/90">{product.category.name}</p>
        <h3 className="mt-0.5 line-clamp-2 min-h-[2.4rem] break-words text-sm font-extrabold leading-snug sm:text-base">
          <Link href={`/urun/${product.slug}`} className="hover:underline">
            {product.name}
          </Link>
        </h3>

        {/* İnce ayraç: ortada limon, kenarlara solar. */}
        <div aria-hidden className="my-1.5 h-px bg-gradient-to-r from-transparent via-brand-500/60 to-transparent" />

        <div className="mb-2 flex flex-wrap items-baseline gap-x-3">
          <span className="text-lg font-extrabold tracking-tight text-brand-500 sm:text-xl">{formatPrice(product.priceKurus)}</span>
          {discount && product.compareAtKurus && (
            <span className="text-sm text-white/60 line-through">{formatPrice(product.compareAtKurus)}</span>
          )}
        </div>

        {/* Kart koyu olduğundan geri bildirim yazıları (hata / stok uyarısı) açık renkte okunur. */}
        <div className="mt-auto [&_[role=status]]:!text-brand-200">
          <AddToCartButton productId={product.id} stock={product.stock} name={product.name} />
        </div>
        {outOfStock && <p className="sr-only">Bu ürün şu an stokta yok.</p>}
      </div>
    </article>
  );
}
