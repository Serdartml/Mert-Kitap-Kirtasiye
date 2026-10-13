"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { playIcon, shouldSkipRoutePlay } from "./IconMotion";

// Başlıktaki logonun kitap animasyonu her sayfa yüklendiğinde ve sayfa değiştiğinde (tüm ekranlarda) bir kez oynar.
// usePathname önbellekli sayfalarda <Suspense> gerektirir; Header bu bileşeni <Suspense> içinde kullanır.
// Suspense sınırı ilk yüklemede bileşeni iki kez bağlayabilir; 0,5 sn içindeki ikinci çağrı animasyonu baştan başlatmasın.
let lastPlay = 0;

export default function LogoRoutePlay() {
  const pathname = usePathname();

  useEffect(() => {
    // Logoya basılarak gelindiyse animasyon basma anında oynadı ve sürüyor; yeni sayfada tekrar başlatılmaz.
    if (shouldSkipRoutePlay()) return;
    const now = Date.now();
    if (now - lastPlay < 500) return;
    lastPlay = now;
    const logo = document.querySelector<HTMLElement>("header .logo-link");
    if (logo) playIcon(logo, 1600);
  }, [pathname]);

  return null;
}