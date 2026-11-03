import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";

// Eski adres: görseli olmayan ürünler artık ürün listesinin "Görseli yok" süzgecidir (sıralama, kategori, toplu silme orada).
export const instant = false;

export default async function PhotolessProductsPage() {
  await requireAdmin();
  redirect("/yonetim/urunler?filtre=gorselsiz&kategori=");
}
