// Boş durum sahneleri için çizimler. CategoryArt ile aynı dil: siyah çizgi, beyaz dolgu, sarı zemin.

const INK = "#111111";
const PAPER = "#ffffff";

// Kapağı açık, içi boş kalem kutusu: kalemlerin yeri kesik çizgiyle belli.
export function EmptyCaseArt({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 220 170"
      fill="none"
      stroke={INK}
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <g transform="rotate(-4 110 90)">
        {/* Kapak */}
        <path d="M30 66 50 20h136l-16 46z" fill={PAPER} />
        <path d="M72 42h84" strokeWidth="3" opacity="0.25" />
        {/* Gövde */}
        <rect x="24" y="66" width="172" height="86" rx="10" fill={PAPER} />
        {/* Olmayan kalemler */}
        {[82, 104, 126].map((y) => (
          <path key={y} d={`M44 ${y}h98l16 6-16 6H44z`} strokeWidth="3" strokeDasharray="7 7" opacity="0.45" />
        ))}
      </g>
    </svg>
  );
}

// Silgi: 404 sayfasında yazının silinen ucunda durur.
export function EraserArt({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 80 52"
      fill="none"
      stroke={INK}
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <rect x="6" y="8" width="68" height="36" rx="7" fill={PAPER} />
      <path d="M13 8h14v36H13a7 7 0 0 1-7-7V15a7 7 0 0 1 7-7z" fill={INK} />
    </svg>
  );
}
