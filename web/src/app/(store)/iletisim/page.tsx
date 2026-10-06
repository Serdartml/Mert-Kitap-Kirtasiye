import type { Metadata } from "next";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import ContactForm from "@/components/ContactForm";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "İletişim",
  description: `${site.name} iletişim bilgileri, adres ve çalışma saatleri.`,
  alternates: { canonical: "/iletisim" },
};

export default function ContactPage() {
  const rows = [
    { icon: Phone, title: "Bizi Arayın", value: site.phone, href: site.phoneHref },
    { icon: Mail, title: "E-posta", value: site.email, href: `mailto:${site.email}` },
    { icon: MapPin, title: "Adres", value: site.address.full, href: site.mapsUrl, external: true },
    { icon: Clock, title: "Çalışma Saatleri", value: site.hours.map((row) => `${row.days}: ${row.time}`).join("\n") },
  ];

  return (
    <div className="container-page py-6">
      <Breadcrumbs items={[{ label: "İletişim" }]} />
      <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">Bize Ulaşın</h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-2 lg:gap-12">
        <ul className="grid h-fit gap-4 sm:grid-cols-2">
          {rows.map((row) => (
            <li key={row.title} className="rounded-xl border border-neutral-200 p-5">
              <span className="grid size-10 place-items-center rounded-lg bg-brand-500">
                <row.icon size={20} />
              </span>
              <h2 className="mt-3 text-xs font-bold uppercase tracking-wider text-neutral-500">{row.title}</h2>
              {row.href ? (
                <a
                  href={row.href}
                  {...(row.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="mt-1 block break-words text-sm font-bold hover:underline"
                >
                  {row.value}
                </a>
              ) : (
                <p className="mt-1 whitespace-pre-line text-sm font-bold">{row.value}</p>
              )}
            </li>
          ))}
        </ul>

        <section className="rounded-2xl border border-neutral-200 p-6 md:p-8">
          <h2 className="mb-5 text-xl font-extrabold">Bize Yazın</h2>
          <ContactForm />
        </section>
      </div>
    </div>
  );
}
