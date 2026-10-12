import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import SchoolListBuilder, { type BuilderRow } from "@/components/SchoolListBuilder";
import { getSchoolListOptions } from "@/lib/catalog";
import { getSchoolList, schoolLists } from "@/lib/school-lists";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const list = getSchoolList(slug);
  if (!list) return {};
  return {
    title: `${list.title} Okula Dönüş Listesi`,
    description: `${list.subtitle}. Ürünleri seçin, tek tuşla sepete ekleyin.`,
    alternates: { canonical: `/okul-listeleri/${list.slug}` },
  };
}

// Bilinçli tercih (kategori ve ürün sayfalarındaki gibi): params <Suspense> dışında okunuyor, çünkü olmayan
// liste gerçek bir 404 dönmeli. Listeler sabit ve hepsi build sırasında üretilir; ürün seçenekleri önbellekten gelir.
export const instant = false;

export function generateStaticParams() {
  return schoolLists.map((list) => ({ slug: list.slug }));
}

export default async function SchoolListPage({ params }: PageProps) {
  const { slug } = await params;
  const list = getSchoolList(slug);
  if (!list) notFound();

  const rows: BuilderRow[] = await Promise.all(
    list.rows.map(async (row, index) => ({
      id: `${list.slug}-${index}`,
      label: row.label,
      quantity: row.quantity,
      options: await getSchoolListOptions(row.categorySlug, row.keyword),
    })),
  );

  return (
    <div className="container-page max-w-3xl py-4 md:py-6">
      <Breadcrumbs items={[{ label: "Okula Dönüş Listeleri", href: "/okul-listeleri" }, { label: list.title }]} />

      {/* Noktalı desen: çizgili desen mobilde başlığın yazısının üstünden geçiyordu. */}
      <header className="theme-fixed pattern-dots relative overflow-hidden rounded-2xl bg-brand-500 px-4 py-5 sm:px-8 sm:py-8">
        <p className="inline-block -rotate-2 rounded-sm bg-ink px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-brand-500 shadow-md sm:text-xs">
          {list.badge}
        </p>
        <h1 className="mt-3 text-[1.7rem] font-extrabold leading-tight tracking-tight sm:text-4xl">
          <span className="marker marker-light">{list.title} listesi</span>
        </h1>
        <p className="mt-2 text-sm font-medium text-ink/80 sm:text-base">{list.subtitle}</p>
      </header>

      <p className="mb-3 mt-4 text-sm text-neutral-600">
        Satırdaki ürünü seçin, adedi ayarlayın; istemediğiniz satırın işaretini kaldırın. Liste örnektir, okulunuzun istediği
        malzemeye göre değiştirebilirsiniz.
      </p>

      <SchoolListBuilder rows={rows} />
    </div>
  );
}
