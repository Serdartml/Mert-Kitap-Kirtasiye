import type { Metadata } from "next";
import { Award, Check, MapPin, Users } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Hakkımızda",
  description: site.about.body,
  alternates: { canonical: "/hakkimizda" },
};

export default function AboutPage() {
  return (
    <div className="container-page py-6">
      <Breadcrumbs items={[{ label: "Hakkımızda" }]} />

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <div>
          <p className="inline-block rounded-full bg-brand-500 px-3 py-1 text-xs font-bold uppercase tracking-wider">
            {site.about.badge}
          </p>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight md:text-5xl">{site.about.title}</h1>
          <p className="mt-5 text-base leading-relaxed text-neutral-700 md:text-lg">{site.about.body}</p>

          <ul className="mt-6 space-y-3">
            {site.about.points.map((point) => (
              <li key={point} className="flex items-center gap-3 font-bold">
                <span className="grid size-7 shrink-0 place-items-center rounded-md bg-brand-500">
                  <Check size={16} />
                </span>
                {point}
              </li>
            ))}
          </ul>

          <a
            href={site.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 flex items-center gap-4 rounded-xl border border-neutral-200 p-5 hover:border-fg"
          >
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand-500">
              <MapPin size={24} />
            </span>
            <span>
              <span className="block font-extrabold">Bize uğrayın</span>
              <span className="block text-sm text-neutral-600">{site.address.full}</span>
            </span>
          </a>
        </div>

        <div className="theme-fixed rounded-2xl bg-ink p-8 text-white md:p-12">
          <h2 className="text-2xl font-extrabold md:text-4xl">Yarınları birlikte kuruyoruz</h2>
          <ul className="mt-8 space-y-6">
            <li className="flex items-center gap-4">
              <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-brand-500 text-ink">
                <Award size={28} />
              </span>
              <span>
                <span className="block text-xs font-bold uppercase tracking-wider text-neutral-400">Kalite</span>
                <span className="block text-xl font-extrabold">20 Yıllık Tecrübe</span>
              </span>
            </li>
            <li className="flex items-center gap-4">
              <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-brand-500 text-ink">
                <Users size={28} />
              </span>
              <span>
                <span className="block text-xs font-bold uppercase tracking-wider text-neutral-400">Güven</span>
                <span className="block text-xl font-extrabold">Binlerce Mutlu Müşteri</span>
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
