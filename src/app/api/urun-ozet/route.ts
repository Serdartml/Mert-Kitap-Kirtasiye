import { NextResponse, type NextRequest } from "next/server";
import { getProductBySlug } from "@/lib/catalog";
import type { ProductSummary } from "@/lib/product-summary";

// Hızlı bakış penceresinin ürün özeti. Herkese açık, yalnızca okur; ürün sayfasının önbellekli
// verisinden (getProductBySlug) beslenir. Yayında olmayan ürün 404 döner.
const DESCRIPTION_LIMIT = 320;

export async function GET(request: NextRequest) {
  const slug = (request.nextUrl.searchParams.get("slug") ?? "").slice(0, 120);
  if (!/^[a-z0-9-]+$/.test(slug)) return NextResponse.json({ error: "Geçersiz ürün." }, { status: 400 });

  const product = await getProductBySlug(slug);
  if (!product || !product.isActive) return NextResponse.json({ error: "Ürün bulunamadı." }, { status: 404 });

  const description = product.description?.trim() ?? "";
  const summary: ProductSummary = {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: description.length > DESCRIPTION_LIMIT ? `${description.slice(0, DESCRIPTION_LIMIT).trimEnd()}…` : description,
    priceKurus: product.priceKurus,
    compareAtKurus: product.compareAtKurus,
    stock: product.stock,
    categoryName: product.category.name,
    rootSlug: product.category.parent?.slug ?? product.category.slug,
    brand: product.brand?.name ?? null,
    image: product.images[0] ? { url: product.images[0].url, alt: product.images[0].alt } : null,
    attributes: product.attributes.slice(0, 4).map((attribute) => ({ name: attribute.name, value: attribute.value })),
  };
  return NextResponse.json(summary);
}
