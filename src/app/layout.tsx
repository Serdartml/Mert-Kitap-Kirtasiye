import type { Metadata } from "next";
import { Caveat, Manrope } from "next/font/google";
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
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning: tema betiği, React devreye girmeden önce html'e "dark" sınıfını ekleyebilir.
    <html lang="tr" className={`${manrope.variable} ${caveat.variable}`} suppressHydrationWarning>
      <head>
        <meta id={COLOR_SCHEME_META_ID} name="color-scheme" content="only light" suppressHydrationWarning />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
