"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { markLogoTapped } from "./IconMotion";

// Logo bağlantısı: her zaman ana sayfa girişine götürür. Başka sayfadan normal gezinme yapar; zaten ana sayfadaysa
// sayfa en üste yumuşakça kayar, adres çubuğundaki parametre / bağlantı çıpası temizlenir ve vitrin açılış hâline
// döner (home:reset olayını LiveShowcase dinler). Böylece logoya basmak ana sayfadayken de "başa dönmek" gibi çalışır.
export const HOME_RESET_EVENT = "home:reset";

export default function LogoLink({ href, label, className, children }: { href: string; label: string; className: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={className}
      onClick={(event) => {
        // Fare tıklaması dahil her basış: gezinme sonrası sayfa değişimi animasyonu tekrar oynamasın (IconMotion).
        markLogoTapped();
        // Konum tıklama anında okunur (usePathname kullanılmaz: önbellekli sayfalarda <Suspense> gerektirirdi).
        if (window.location.pathname !== "/" || href !== "/") return;
        event.preventDefault();
        if (window.location.search || window.location.hash) window.history.replaceState(null, "", "/");
        window.dispatchEvent(new Event(HOME_RESET_EVENT));
        window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      }}
    >
      {children}
    </Link>
  );
}