// Vitrindeki çizim: defter, kurşun kalem ve cetvel. Sarı zemin üstünde siyah çizgi, beyaz dolgu.
export default function HeroArt({ className = "" }: { className?: string }) {
  const ringYs = [92, 118, 144, 170, 196, 222, 248];
  const lineYs = [156, 180, 204, 228];
  const tickXs = Array.from({ length: 10 }, (_, i) => 128 + i * 19);

  return (
    <svg
      viewBox="0 0 360 330"
      fill="none"
      stroke="#111111"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      {/* Defter */}
      <g className="animate-float">
        <g transform="rotate(-8 150 170)">
          <rect x="72" y="62" width="168" height="212" rx="12" fill="#ffffff" />
          <rect x="104" y="92" width="92" height="34" rx="6" fill="#ffc800" />
          {lineYs.map((y) => (
            <path key={y} d={`M104 ${y}h108`} strokeWidth="3" opacity="0.25" />
          ))}
          {ringYs.map((y) => (
            <path key={y} d={`M60 ${y}h24`} />
          ))}
        </g>
      </g>

      {/* Kurşun kalem */}
      <g className="animate-float [animation-delay:-2.5s]">
        <g transform="rotate(28 280 150)">
          <rect x="268" y="50" width="24" height="22" rx="5" fill="#111111" />
          <rect x="268" y="72" width="24" height="150" fill="#ffffff" />
          <path d="M280 72v150" strokeWidth="2" opacity="0.3" />
          <path d="M268 222l12 36 12-36z" fill="#ffffff" />
          <path d="M276 246l4 12 4-12z" fill="#111111" />
        </g>
      </g>

      {/* Cetvel */}
      <g className="animate-float [animation-delay:-4.5s]">
        <g transform="rotate(-14 210 280)">
          <rect x="112" y="262" width="204" height="38" rx="6" fill="#ffffff" />
          {tickXs.map((x, i) => (
            <path key={x} d={`M${x} 262v${i % 2 === 0 ? 16 : 9}`} strokeWidth="3" />
          ))}
        </g>
      </g>
    </svg>
  );
}
