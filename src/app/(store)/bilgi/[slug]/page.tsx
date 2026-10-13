import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import { PanelSkeleton } from "@/components/Skeletons";
import { getLegalDocument, legalReviewed } from "@/lib/legal-content";
import { infoPages } from "@/lib/site";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return infoPages.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = infoPages.find((p) => p.slug === slug);
  // Metinler hukuki onay alana kadar (legalReviewed) arama motorlarına kapalı.
  return page ? { title: page.title, robots: { index: legalReviewed } } : {};
}

// params adres verisidir; ortak kabuğa girmesin diye okunması <Suspense> içindeki bileşene bırakıldı.
export default function InfoPage({ params }: PageProps) {
  return (
    <Suspense fallback={<PanelSkeleton />}>
      <InfoContent params={params} />
    </Suspense>
  );
}

async function InfoContent({ params }: PageProps) {
  const { slug } = await params;
  const page = infoPages.find((p) => p.slug === slug);
  if (!page) notFound();

  const doc = getLegalDocument(page.slug);

  return (
    <div className="container-page max-w-3xl py-6">
      <Breadcrumbs items={[{ label: page.title }]} />
      <h1 className="text-3xl font-extrabold tracking-tight">{page.title}</h1>
      {!legalReviewed && (
        <p className="mt-4 rounded-xl bg-amber-100 p-4 text-sm text-amber-900">
          Bu metin taslaktır; hukuki inceleme sonrası kesinleşecektir.
        </p>
      )}
      {doc ? (
        <div className="mt-6 space-y-6 text-sm leading-relaxed">
          {doc.intro && <p>{doc.intro}</p>}
          {doc.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-lg font-bold">{section.heading}</h2>
              <div className="mt-2 space-y-2">
                {section.paragraphs.map((text) => (
                  <p key={text}>{text}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <p className="mt-6 rounded-xl bg-neutral-100 p-6 text-sm text-neutral-600">
          Bu sayfanın içeriği hazırlanıyor.
        </p>
      )}
    </div>
  );
}
