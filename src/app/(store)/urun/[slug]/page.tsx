import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MapPin, MessageCircle, Phone } from "lucide-react";
import AddToCartButton from "@/components/AddToCartButton";
import StickyBuyBar from "@/components/StickyBuyBar";
import Breadcrumbs, { type Crumb } from "@/components/Breadcrumbs";
import ColorPalette from "@/components/ColorPalette";
import Scribble from "@/components/Scribble";
import { getProductPalette } from "@/lib/colors";
import ProductGrid from "@/components/ProductGrid";
import ProductVisual from "@/components/ProductVisual";
import { ProductDetailSkeleton } from "@/components/Skeletons";
import { getPrerenderProductSlugs, getProductBySlug, getRelatedProducts } from "@/lib/catalog";
import { discountPercent, formatPrice } from "@/lib/format";
import { site, whatsappHref } from "@/lib/site";

// Asıl "Sepete Ekle" alanı; ekrandan çıkınca mobilde StickyBuyBar görünür.
const BUY_AREA_ID = "satin-al";
// Ana ürün görseli; renk paleti seçilen rengi bu kutuya yansıtır.
const VISUAL_ID = "urun-gorseli";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product || !product.isActive) return {};
  return {
    title: product.name,
    description: product.description ?? undefined,
    alternates: { canonical: `/urun/${product.slug}` },
  };
}

// Bilinçli tercih: params <Suspense> dışında okunuyor (aşağıdaki 404 kontrolü için); instant = false
// bu rotanın beklemesine izin verildiğini bildirir. 404 davranışı için kategori sayfasındaki nota bakın.
export const instant = false;

// Öne çıkan ürünler build sırasında üretilir; diğerleri ilk ziyarette üretilip önbelleğe alınır.
export async function generateStaticParams() {
  return (await getPrerenderProductSlugs()).map((slug) => ({ slug }));
}

// Varlık kontrolü <Suspense>'ten önce yapılır: akış başladıktan sonra durum kodu değiştirilemez,
// olmayan ürün gerçek bir 404 dönsün diye notFound() burada çağrılır.
export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product || !product.isActive) notFound();

  return (
    <Suspense fallback={<ProductDetailSkeleton />}>
      <ProductContent slug={slug} />
    </Suspense>
  );
}

async function ProductContent({ slug }: { slug: string }) {
  // Önbellekten gelir; yukarıdaki kontrolle aynı kayıt.
  const product = await getProductBySlug(slug);
  if (!product || !product.isActive) notFound();

  const related = await getRelatedProducts(product.categoryId, product.id);
  const discount = discountPercent(product.priceKurus, product.compareAtKurus);
  const rootSlug = product.category.parent?.slug ?? product.category.slug;
  const palette = getProductPalette(product.attributes);
  const whatsapp = whatsappHref(
    `Merhaba, "${product.name}" (stok kodu: ${product.sku}) hakkında bilgi almak istiyorum.\n${site.url}/urun/${product.slug}`,
  );

  const crumbs: Crumb[] = [
    ...(product.category.parent
      ? [{ label: product.category.parent.name, href: `/kategori/${product.category.parent.slug}` }]
      : []),
    { label: product.category.name, href: `/kategori/${product.category.slug}` },
    { label: product.name },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? undefined,
    sku: product.sku,
    brand: product.brand ? { "@type": "Brand", name: product.brand.name } : undefined,
    offers: {
      "@type": "Offer",
      url: `${site.url}/urun/${product.slug}`,
      priceCurrency: "TRY",
      price: (product.priceKurus / 100).toFixed(2),
      availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };

  return (
    <div className="container-page py-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <Breadcrumbs items={crumbs} />

      <div className="grid gap-8 md:grid-cols-2 lg:gap-12">
        <ProductVisual
          id={VISUAL_ID}
          name={product.name}
          rootCategorySlug={rootSlug}
          image={product.images[0]}
          sizes="(min-width: 768px) 50vw, 100vw"
          priority
        />

        <div>
          {product.brand && <p className="text-sm font-bold text-neutral-500">{product.brand.name}</p>}
          <h1 className="text-2xl font-extrabold leading-tight md:text-3xl">{product.name}</h1>
          <p className="mt-1 text-xs text-neutral-500">Stok kodu: {product.sku}</p>

          <div className={`mt-5 flex flex-wrap items-center ${discount ? "gap-x-6 gap-y-3 pl-2" : "gap-3"}`}>
            {/* İndirimli fiyatın etrafına kalemle halka çizilir. */}
            <span className="relative text-3xl font-extrabold">
              {formatPrice(product.priceKurus)}
              {discount && <Scribble variant="circle" className="scribble-draw absolute -inset-x-4 -inset-y-2.5 h-[calc(100%+1.25rem)] w-[calc(100%+2rem)] [stroke-width:1.6]" />}
            </span>
            {discount && product.compareAtKurus && (
              <>
                <span className="text-base text-neutral-500 line-through">{formatPrice(product.compareAtKurus)}</span>
                <span className="rounded-md bg-ink px-2 py-1 text-xs font-extrabold text-brand-500">%{discount} indirim</span>
              </>
            )}
          </div>

          <p className={`mt-3 text-sm font-bold ${product.stock > 0 ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>
            {product.stock > 0 ? "Stokta var" : "Stokta yok"}
          </p>

          {palette && <ColorPalette palette={palette} visualId={VISUAL_ID} />}

          <div id={BUY_AREA_ID} className="mt-5 max-w-md">
            <AddToCartButton productId={product.id} stock={product.stock} variant="full" />
          </div>

          <div className="mt-6 space-y-2 rounded-xl bg-neutral-100 p-4 text-sm">
            <p className="font-extrabold">Mağazadan bilgi alın</p>
            {whatsapp && (
              <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="btn btn-dark w-full py-2.5">
                <MessageCircle size={16} /> WhatsApp&apos;tan sor
              </a>
            )}
            <a href={site.phoneHref} className="flex items-center gap-2 hover:underline">
              <Phone size={16} /> {site.phone}
            </a>
            <a href={site.mapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-start gap-2 hover:underline">
              <MapPin size={16} className="mt-0.5 shrink-0" /> {site.address.full}
            </a>
          </div>

          {product.description && (
            <section className="mt-8">
              <h2 className="mb-2 text-lg font-extrabold">Ürün Açıklaması</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-neutral-700">{product.description}</p>
            </section>
          )}

          {product.attributes.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-2 text-lg font-extrabold">Özellikler</h2>
              <dl className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 text-sm">
                {product.attributes.map((attribute) => (
                  <div key={attribute.id} className="grid grid-cols-[8rem_1fr] gap-4 px-4 py-2.5">
                    <dt className="font-bold text-neutral-500">{attribute.name}</dt>
                    <dd className="font-semibold">{attribute.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-5 text-xl font-extrabold"><span className="marker">Benzer Ürünler</span></h2>
          <ProductGrid products={related} />
        </section>
      )}

      <StickyBuyBar
        productId={product.id}
        stock={product.stock}
        name={product.name}
        price={formatPrice(product.priceKurus)}
        targetId={BUY_AREA_ID}
      />
    </div>
  );
}
