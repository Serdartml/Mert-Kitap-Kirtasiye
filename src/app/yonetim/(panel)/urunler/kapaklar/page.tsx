import type { Metadata } from "next";
import Link from "next/link";
import CoverFetcher from "@/components/admin/CoverFetcher";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { r2Config } from "@/lib/r2";

export const metadata: Metadata = { title: "Barkoddan kapak getir" };

// Her çağrı birkaç kitabı işler; Vercel'de işlev süresine takılmasın diye süre uzatılır.
export const maxDuration = 60;

// Oturum arkasındaki yönetim sayfası: Next'in "anında gezinme" denetiminden çıkarıldı (README, Yönetim paneli).
export const instant = false;

export default async function CoversPage() {
  await requireAdmin();

  const pending = await db.product.count({
    where: { OR: [{ barcode: { startsWith: "978" } }, { barcode: { startsWith: "979" } }], images: { none: {} } },
  });

  return (
    <>
      <Link href="/yonetim/urunler" className="text-sm font-bold hover:underline">
        ← Ürünler
      </Link>
      <h1 className="mt-2 text-2xl font-extrabold">
        <span className="marker">Barkoddan kapak getir</span>
      </h1>
      <p className="mt-3 max-w-2xl text-sm text-neutral-600">
        ISBN barkodlu kitaplar için kapak görselini Open Library&apos;den bulur, R2&apos;ye kopyalar ve ürüne tek görsel olarak ekler. Görseli olan ürünlere
        dokunmaz. Her kitap için kapak bulunamayabilir (özellikle yeni ve az bilinen yayınlar); bulunamayanlar görselsiz kalır. Kırtasiye ve oyuncak
        ürünleri için barkoddan görsel bulan ücretsiz bir kaynak yok; onlar ürün sayfasından elle eklenir.
      </p>
      {r2Config() ? (
        <CoverFetcher pending={pending} />
      ) : (
        <p className="mt-5 rounded-lg border border-brand-500 bg-brand-50 p-3 text-sm font-semibold">
          Görsel depolama (Cloudflare R2) bağlı değil; önce ortam değişkenlerini girin.
        </p>
      )}
    </>
  );
}
