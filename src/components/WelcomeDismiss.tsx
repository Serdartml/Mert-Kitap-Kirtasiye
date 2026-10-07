"use client";

import { useEffect } from "react";

// Karşılama katmanını kapatır: animasyon bitince, ya da ziyaretçi dokununca / tuşa basınca hemen.
export default function WelcomeDismiss({ targetId }: { targetId: string }) {
  useEffect(() => {
    const root = document.documentElement;
    if (root.dataset.welcome !== "play") return;

    const overlay = document.getElementById(targetId);
    const finish = () => {
      root.dataset.welcome = "done";
      cleanup();
    };
    // Çocukların animasyonları da buraya kabarır; yalnızca katmanın kendi kapanışı sayılır.
    const onAnimationEnd = (event: AnimationEvent) => {
      if (event.target === overlay) finish();
    };
    // Animasyon (2,4 sn) bu betik yüklenmeden bitmişse animationend kaçmış olur.
    const fallback = setTimeout(finish, 3000);

    const cleanup = () => {
      clearTimeout(fallback);
      overlay?.removeEventListener("animationend", onAnimationEnd);
      window.removeEventListener("pointerdown", finish);
      window.removeEventListener("keydown", finish);
    };

    overlay?.addEventListener("animationend", onAnimationEnd);
    window.addEventListener("pointerdown", finish);
    window.addEventListener("keydown", finish);
    return cleanup;
  }, [targetId]);

  return null;
}
