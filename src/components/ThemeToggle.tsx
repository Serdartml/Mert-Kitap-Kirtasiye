"use client";

import { useCallback, useRef } from "react";
import { Moon, Sun } from "lucide-react";
import { COLOR_SCHEME_META_ID, DARK_SCHEME, LIGHT_SCHEME, THEME_STORAGE_KEY } from "@/lib/theme";


// Eski sitedeki AnimatedThemeToggler ile aynı düğme ve aynı mekanik: yeni tema, düğmenin
// merkezinden büyüyen bir daire olarak açılır (View Transition API). Tek fark, seçimin saklanması.
// İkonlar React durumuyla değil CSS ile değişir; böylece sunucu çıktısıyla uyuşmazlık olmaz.
export default function ThemeToggle({ duration = 500 }: { duration?: number }) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const toggleTheme = useCallback(() => {
    const button = buttonRef.current;
    if (!button) return;

    const apply = () => {
      const isDark = document.documentElement.classList.toggle("dark");
      document.getElementById(COLOR_SCHEME_META_ID)?.setAttribute("content", isDark ? DARK_SCHEME : LIGHT_SCHEME);
      try {
        localStorage.setItem(THEME_STORAGE_KEY, isDark ? "dark" : "light");
      } catch {
        // Depolama kapalıysa tema yalnızca bu sayfa için değişir.
      }
    };

    if (typeof document.startViewTransition !== "function") {
      apply();
      return;
    }

    const { top, left, width, height } = button.getBoundingClientRect();
    const x = left + width / 2;
    const y = top + height / 2;
    const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
    const maxRadius = Math.hypot(Math.max(x, viewportWidth - x), Math.max(y, viewportHeight - y));

    // Bazı mobil tarayıcılar geçiş API'sini yarım destekler. Animasyon kurulamazsa tema yine de
    // değişmiş olmalı; bu yüzden hatalar yutulur ve gerekirse tema doğrudan uygulanır.
    let applied = false;
    const applyOnce = () => {
      if (applied) return;
      applied = true;
      apply();
    };

    try {
      const transition = document.startViewTransition(applyOnce);
      transition.ready
        .then(() => {
          document.documentElement.animate(
            { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${maxRadius}px at ${x}px ${y}px)`] },
            { duration, easing: "ease-in-out", pseudoElement: "::view-transition-new(root)" },
          );
        })
        .catch(() => {});
      transition.finished.catch(() => {}).finally(applyOnce);
    } catch {
      applyOnce();
    }
  }, [duration]);

  return (
    <button
      type="button"
      ref={buttonRef}
      onClick={toggleTheme}
      className="relative inline-flex size-10 shrink-0 touch-manipulation items-center justify-center rounded-lg p-1.5 text-fg transition-all active:scale-95 md:rounded-xl md:bg-ink md:p-2 md:text-brand-500 dark:text-brand-500 md:dark:bg-brand-500 md:dark:text-ink"
    >
      <Sun className="hidden size-5 shrink-0 dark:block" />
      <Moon className="size-5 shrink-0 dark:hidden" />
      <span className="sr-only">Temayı değiştir</span>
    </button>
  );
}
