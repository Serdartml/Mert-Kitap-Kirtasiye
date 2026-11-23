import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ProductImport from "@/components/admin/ProductImport";
import WeeklyImport from "@/components/admin/WeeklyImport";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Excel'den ürün aktar" };

// Sayfadaki server action'lar (önizleme, uygulama) bu süreyle çalışır: 10 bin ürünlük dosya birkaç saniye sürer.
export const maxDuration = 60;

// Oturum arkasındaki yönetim sayfası: Next'in "anında gezinme" denetiminden çıkarıldı (README, Yönetim paneli).
export const instant = false;

export default async function ImportProductsPage() {
  await requireAdmin();

  return (
    <>
      <Link href="/yonetim/urunler" className="mb-3 inline-flex items-center gap-1 text-sm font-bold hover:underline">
        <ArrowLeft size={16} aria-hidden /> Ürünler
      </Link>
      <h1 className="text-2xl font-extrabold">
        <span className="marker">Haftalık stok güncelleme</span>
      </h1>
      <p className="mb-5 mt-3 max-w-2xl text-sm text-neutral-600">
        Turna&apos;dan aldığınız stok dosyasını olduğu gibi yükleyin. Önce ne değişeceğini görürsünüz; onaylamadan hiçbir şey kaydedilmez.
      </p>
      <WeeklyImport />
      <details className="mt-8">
        <summary className="cursor-pointer text-sm font-extrabold">Gelişmiş: başlıklı Excel ile elle aktarım</summary>
        <div className="mt-4">
          <ProductImport />
        </div>
      </details>
    </>
  );
}
