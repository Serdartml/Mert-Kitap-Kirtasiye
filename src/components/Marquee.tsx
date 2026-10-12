"use client";

import { useState, type ReactNode } from "react";
import { Pause, Play } from "lucide-react";

// Sonsuz yatay kayan şerit. İçerik iki kez yazılır ve şerit tam bir kopya kadar (%50) kayar; başı ve sonu
// birbirine eklenir, bekleme yoktur. İkinci kopya yalnızca görüntü içindir (inert: odaklanmaz, ekran
// okuyucuya okunmaz). Fare üstündeyken ya da odaktayken durur; dokunmatik ekranda ve klavyede durdurma düğmesi var.
// duration: bir kopyanın baştan sona kayma süresi (saniye); kartlar çoğaldıkça hız sabit kalsın diye sayfadan gelir.
export default function Marquee({ children, duration, label }: { children: ReactNode; duration: number; label: string }) {
  const [paused, setPaused] = useState(false);

  return (
    <section aria-label={label} className="marquee relative mt-3 md:mt-4">
      <div className="marquee-viewport overflow-hidden py-1.5">
        <div
          className="marquee-track flex w-max"
          data-paused={paused}
          style={{ "--marquee-duration": `${duration}s` } as React.CSSProperties}
        >
          <div className="flex shrink-0 items-center gap-3 pr-3">{children}</div>
          <div aria-hidden inert className="flex shrink-0 items-center gap-3 pr-3">
            {children}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setPaused((value) => !value)}
        aria-label={paused ? "Vitrini oynat" : "Vitrini durdur"}
        className="absolute right-3 top-1/2 z-10 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-neutral-200 bg-raised text-fg shadow-md hover:bg-neutral-100"
      >
        {paused ? <Play size={16} aria-hidden /> : <Pause size={16} aria-hidden />}
      </button>
    </section>
  );
}
