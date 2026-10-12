import type { Metadata } from "next";
import { Caveat, Manrope } from "next/font/google";
import { isIndexable } from "@/lib/indexing";
import { COLOR_SCHEME_META_ID, themeInitScript } from "@/lib/theme";
import { site } from "@/lib/site";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin", "latin-ext"],
  variable: "--font-manrope",
  display: "swap",
});

// El yazısı: elle çizilmiş vurguların yanındaki kısa notlar için (font-hand).
const caveat = Caveat({
  subsets: ["latin", "latin-ext"],
  variable: "--font-caveat",
  display: "swap",
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} - ${site.tagline}`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: site.name,
  },
  // Deneme yayınında arama motorlarına kapalı (SITE_INDEXABLE=1 ile açılır; lib/indexing.ts).
  ...(isIndexable() ? {} : { robots: { index: false, follow: false } }),
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning: tema betiği, React devreye girmeden önce html'e "dark" sınıfını ekleyebilir.
    // data-scroll-behavior: globals.css html'e yumuşak kaydırma verir; bu öznitelik Next'e sayfa geçişlerinde
    // onu geçici kapatmasını söyler (yoksa yeni sayfa yumuşak kayarak açılır ve geliştirmede uyarı çıkar).
    <html lang="tr" className={`${manrope.variable} ${caveat.variable}`} data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <meta id={COLOR_SCHEME_META_ID} name="color-scheme" content="only light" suppressHydrationWarning />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
