import type { Metadata } from "next";
import ProductForm from "@/components/admin/ProductForm";
import { getCategoryOptions } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Yeni Ürün" };

export default async function NewProductPage() {
  await requireAdmin();
  const categories = await getCategoryOptions();

  return (
    <>
      <h1 className="mb-6 text-2xl font-extrabold">
        <span className="marker">Yeni ürün</span>
      </h1>
      <ProductForm
        categories={categories}
        values={{
          name: "",
          slug: "",
          sku: "",
          barcode: "",
          price: "",
          compareAt: "",
          stock: 0,
          categoryId: "",
          description: "",
          attributes: "",
          isActive: true,
          isFeatured: false,
        }}
      />
    </>
  );
}
