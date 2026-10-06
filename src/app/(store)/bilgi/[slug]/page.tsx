import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
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
  // Metinler yazılana kadar arama motorlarına kapalı.
  return page ? { title: page.title, robots: { index: false } } : {};
}

export default async function InfoPage({ params }: PageProps) {
  const { slug } = await params;
  const page = infoPages.find((p) => p.slug === slug);
  if (!page) notFound();

  return (
    <div className="container-page max-w-3xl py-6">
      <Breadcrumbs items={[{ label: page.title }]} />
      <h1 className="text-3xl font-extrabold tracking-tight">{page.title}</h1>
      <p className="mt-6 rounded-xl bg-neutral-100 p-6 text-sm text-neutral-600">
        Bu sayfanın içeriği hazırlanıyor.
      </p>
    </div>
  );
}
