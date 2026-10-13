"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Başlıktaki "Giriş Yap", "Sepetim", tema düğmesi ve logonun hareketini dokunmatik ekranda de oynatır. Fare üstüne gelmesi
// CSS ile (globals.css, "Başlık ikonları" ve "Logo animasyonu"); dokunma burada .icon-play sınıfıyla tetiklenir.
//
// Dokunmatik ekranda "Giriş Yap" ve "Sepetim" bağlantılarına dokununca sayfa hemen açılmaz: önce ikonun animasyonu
// oynar, bu sırada hedef sayfa arka planda yüklenmeye başlar (prefetch) ve animasyon bitince açılır. Fare ve klavye
// (ve "hareketi azalt") için gezinme eskisi gibi anidir. Tema düğmesi gezinmez; dokununca hem animasyon oynar hem tema değişir.
const ICONS = ".icon-user, .icon-cart, .icon-theme, .logo-link";
const NAVIGATE_AFTER = ".icon-user, .icon-cart";
const PLAY_MS = 850;
const LOGO_PLAY_MS = 1600;

// Logoya basılınca (dokunma, tıklama) o gezinmeye ait sayfa değişimi animasyonu tekrar oynatmaz: logo zaten basma anında
// oynuyordur (başlık sayfalar arasında kalıcıdır, animasyon yeni sayfada da kesintisiz sürer). Süre sınırlıdır: logoya
// ana sayfadayken basılırsa (gezinme olmaz) işaret kendiliğinden sönsün ve sonraki sayfa değişimi yine oynasın.
const LOGO_TAP_WINDOW_MS = 2500;
let skipRoutePlayUntil = 0;

export function markLogoTapped() {
  skipRoutePlayUntil = Date.now() + LOGO_TAP_WINDOW_MS;
}

export function shouldSkipRoutePlay(): boolean {
  return Date.now() < skipRoutePlayUntil;
}

export function playIcon(element: HTMLElement, duration = PLAY_MS) {
  element.classList.remove("icon-play");
  // Sınıfın kaldırılıp eklenmesi animasyonu baştan başlatır.
  void element.offsetWidth;
  element.classList.add("icon-play");
  window.setTimeout(() => element.classList.remove("icon-play"), duration);
}

export default function IconMotion() {
  const router = useRouter();

  useEffect(() => {
    let lastPointer = "mouse";
    let navigating = false;

    const onPointerDown = (event: PointerEvent) => {
      lastPointer = event.pointerType;
      if (event.pointerType === "mouse") return;
      const target = (event.target as Element | null)?.closest<HTMLElement>(ICONS);
      if (!target) return;
      if (target.classList.contains("logo-link")) {
        markLogoTapped();
        // Animasyon zaten sürüyorsa (üst üste dokunma) baştan başlatılmaz: logo bir basışta bir kez oynar.
        if (!target.classList.contains("icon-play")) playIcon(target, LOGO_PLAY_MS);
        return;
      }
      playIcon(target, PLAY_MS);
      // Hedef sayfa animasyon sürerken arka planda yüklenir.
      if (target.matches(NAVIGATE_AFTER) && target instanceof HTMLAnchorElement) router.prefetch(target.getAttribute("href") ?? "/");
    };

    // Yakalama aşamasında dinlenir: Next'in bağlantı tıklamasından önce çalışıp gezinmeyi animasyon bitene kadar erteler.
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest<HTMLAnchorElement>(NAVIGATE_AFTER);
      // detail 0: klavye ile (Enter) tetiklenmiş tıklama; gecikme yok.
      if (!link || lastPointer === "mouse" || event.detail === 0) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      event.preventDefault();
      event.stopPropagation();
      if (navigating) return;
      navigating = true;
      window.setTimeout(() => {
        navigating = false;
        router.push(link.getAttribute("href") ?? "/");
      }, PLAY_MS);
    };

    document.addEventListener("pointerdown", onPointerDown, { passive: true });
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("click", onClick, true);
    };
  }, [router]);

  return null;
}