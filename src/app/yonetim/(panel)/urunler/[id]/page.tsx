import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Trash2 } from "lucide-react";
import { deleteProduct } from "@/actions/admin";
import ConfirmButton from "@/components/admin/ConfirmButton";
import ProductForm from "@/components/admin/ProductForm";
import { getCategoryOptions } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { kurusToInput } from "@/lib/slug";

export const metadata: Metadata = { title: "Ürünü Düzenle" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const [product, categories] = await Promise.all([
    db.product.findUnique({ where: { id }, include: { attributes: { orderBy: { sortOrder: "asc" } } } }),
    getCategoryOptions(),
  ]);
  if (!product) notFound();

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">
          <span className="marker">Ürünü düzenle</span>
        </h1>
        <div className="flex flex-wrap gap-2">
          {product.isActive && (
            <Link href={`/urun/${product.slug}`} target="_blank" className="btn btn-outline py-2.5">
              <ExternalLink size={16} aria-hidden /> Sitede gör
            </Link>
          )}
          <form action={deleteProduct.bind(null, product.id)}>
            <ConfirmButton
              message={`"${product.name}" kalıcı olarak silinecek. Bu işlem geri alınamaz. Emin misiniz?`}
              className="btn border border-red-300 py-2.5 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
            >
              <Trash2 size={16} aria-hidden /> Sil
            </ConfirmButton>
          </form>
        </div>
      </div>

      <ProductForm
        categories={categories}
        values={{
          id: product.id,
          name: product.name,
          slug: product.slug,
          sku: product.sku,
          barcode: product.barcode ?? "",
          price: kurusToInput(product.priceKurus),
          compareAt: kurusToInput(product.compareAtKurus),
          stock: product.stock,
          categoryId: product.categoryId,
          description: product.description ?? "",
          attributes: product.attributes.map((attribute) => `${attribute.name}: ${attribute.value}`).join("\n"),
          isActive: product.isActive,
          isFeatured: product.isFeatured,
        }}
      />
    </>
  );
}
