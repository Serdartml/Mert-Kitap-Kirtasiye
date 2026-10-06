"use client";

import { useCallback, useRef } from "react";
import { Moon, Sun } from "lucide-react";

export const THEME_STORAGE_KEY = "theme";

// Sayfa boyanmadan önce <head> içinde çalışır; kayıtlı tema koyuysa html'e "dark" sınıfını ekler.
export const themeInitScript = `try{if(localStorage.getItem("${THEME_STORAGE_KEY}")==="dark")document.documentElement.classList.add("dark")}catch(e){}`;

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

    const transition = document.startViewTransition(apply);
    transition.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${maxRadius}px at ${x}px ${y}px)`] },
        { duration, easing: "ease-in-out", pseudoElement: "::view-transition-new(root)" },
      );
    });
  }, [duration]);

  return (
    <button
      type="button"
      ref={buttonRef}
      onClick={toggleTheme}
      className="relative inline-flex size-8 shrink-0 items-center justify-center rounded-lg p-1.5 text-ink transition-all active:scale-95 md:size-10 md:rounded-xl md:bg-ink md:p-2 md:text-brand-500 dark:text-brand-500 md:dark:bg-brand-500 md:dark:text-ink"
    >
      <Sun className="hidden size-5 shrink-0 dark:block" />
      <Moon className="size-5 shrink-0 dark:hidden" />
      <span className="sr-only">Temayı değiştir</span>
    </button>
  );
}
