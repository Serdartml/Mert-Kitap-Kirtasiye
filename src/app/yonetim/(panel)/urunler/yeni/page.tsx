import type { Metadata } from "next";
import ProductForm from "@/components/admin/ProductForm";
import { getCategoryOptions } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Yeni Ürün" };

// Oturum arkasındaki yönetim sayfası: Next'in "anında gezinme" denetiminden çıkarıldı (README, Yönetim paneli).
export const instant = false;

export default async function NewProductPage() {
  await requireAdmin();
  const [categories, brands] = await Promise.all([
    getCategoryOptions(),
    db.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <>
      <h1 className="mb-6 text-2xl font-extrabold">
        <span className="marker">Yeni ürün</span>
      </h1>
      <ProductForm
        categories={categories}
        brands={brands}
        values={{
          brandId: "",
          name: "",
          slug: "",
          sku: "",
          barcode: "",
          price: "",
          compareAt: "",
          cost: "",
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
