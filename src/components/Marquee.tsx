"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { Pause, Play } from "lucide-react";

export interface MarqueeRowData {
  items: ReactNode;
  // "right": içerik soldan sağa kayar, "left": sağdan sola kayar.
  direction: "left" | "right";
  // Bir kopyanın baştan sona kayma süresi (saniye); kartlar çoğaldıkça hız sabit kalsın diye sayfadan gelir.
  duration: number;
}

// Sonsuz yatay kayan şeritler (üst üste birkaç satır). Her satır içeriği iki kez yazar ve tam bir kopya kadar (%50)
// kayar; başı ve sonu birbirine eklenir, bekleme yoktur. İkinci kopya yalnızca görüntü içindir (inert: odaklanmaz,
// ekran okuyucuya okunmaz). Her satırın yönü kendine aittir. Dokunulan / üstüne gelinen satır durur, parmak ya da fare
// çekilince devam eder; diğer satırlar kaymaya devam eder. Klavye odağındaki satır da durur. Ayrıca tümünü durduran
// bir düğme vardır. Koyu temada şeridin zemini tam siyah değil gridir (#3a3a3a): kartların siyah çerçeve ve gölgeleri açık
// temadakiyle aynı kalır ve zeminde görünür.
function Row({ row, allPaused }: { row: MarqueeRowData; allPaused: boolean }) {
  // Dokunmatik / kalem: parmak basılıyken durur. Fare üstüne gelmesi CSS ile (.marquee-row:hover) durdurulur.
  const [held, setHeld] = useState(false);
  const release = () => setHeld(false);

  return (
    <div
      className="marquee-row"
      onPointerDown={(event) => event.pointerType !== "mouse" && setHeld(true)}
      onPointerUp={release}
      onPointerCancel={release}
      onPointerLeave={release}
    >
      <div className="marquee-viewport overflow-hidden px-1 py-3">
        <div
          className="marquee-track flex w-max"
          data-paused={allPaused || held}
          style={{ "--marquee-duration": `${row.duration}s`, "--marquee-direction": row.direction === "right" ? "reverse" : "normal" } as CSSProperties}
        >
          <div className="flex shrink-0 items-center gap-3 pr-3">{row.items}</div>
          <div aria-hidden inert className="flex shrink-0 items-center gap-3 pr-3">
            {row.items}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Marquee({ rows, label }: { rows: MarqueeRowData[]; label: string }) {
  const [paused, setPaused] = useState(false);

  return (
    <section aria-label={label} className="marquee relative mt-3 md:mt-4 dark:border-y dark:border-white/10 dark:bg-[#3a3a3a]">
      {rows.map((row, index) => (
        <Row key={index} row={row} allPaused={paused} />
      ))}

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
