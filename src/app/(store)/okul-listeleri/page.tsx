import type { Metadata } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";
import SchoolListCards from "@/components/SchoolListCards";

export const metadata: Metadata = {
  title: "Okula Dönüş Listeleri",
  description: "İlkokuldan üniversiteye hazır malzeme listeleri: ürünleri seçin, tek tuşla sepete ekleyin.",
  alternates: { canonical: "/okul-listeleri" },
};

export default function SchoolListsPage() {
  return (
    <div className="container-page py-4 md:py-6">
      <Breadcrumbs items={[{ label: "Okula Dönüş Listeleri" }]} />
      <h1 className="text-2xl font-extrabold md:text-4xl">
        <span className="marker">Okula dönüş listeleri</span>
      </h1>
      <p className="mt-3 max-w-xl text-sm text-neutral-600 sm:text-base">
        Okul seviyenizi seçin; ihtiyaç listesindeki ürünleri seçip adetlerini ayarlayın, hepsini tek tuşla sepete ekleyin.
        Listeler örnektir; okulunuzun istediği malzemeye göre ürünleri değiştirebilirsiniz.
      </p>
      <div className="mt-6">
        <SchoolListCards />
      </div>
    </div>
  );
}
