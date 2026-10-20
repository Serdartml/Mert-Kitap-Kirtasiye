import type { ReactNode } from "react";

// Kategoriye özel çizimler. Ana sayfa çizimleriyle aynı dil: siyah çizgi, beyaz dolgu, sarı zemin için tasarlandı.
// Hepsi satır içi SVG'dir; ek dosya isteği veya JavaScript gerektirmez.

const INK = "#111111";
const PAPER = "#ffffff";
// Kategori renginde (data-cat) ya da marka sarısında: sayfanın rengini izler.
const YELLOW = "var(--color-brand-500)";

const art: Record<string, ReactNode> = {
  // Kurşun kalem, silgi, ataş
  kirtasiye: (
    <>
      <g transform="rotate(35 80 90)">
        <rect x="68" y="22" width="24" height="18" rx="4" fill={INK} />
        <rect x="68" y="40" width="24" height="92" fill={PAPER} />
        <path d="M68 132l12 30 12-30z" fill={PAPER} />
        <path d="M76 152l4 10 4-10z" fill={INK} />
      </g>
      <g transform="rotate(-12 160 120)">
        <rect x="128" y="102" width="64" height="36" rx="6" fill={PAPER} />
        <path d="M134 102h14v36h-14a6 6 0 0 1-6-6v-24a6 6 0 0 1 6-6z" fill={INK} />
      </g>
      <path d="M152 28v40a12 12 0 0 0 24 0V24a8 8 0 0 0-16 0v40" />
    </>
  ),
  // Palet ve fırça
  sanatsal: (
    <>
      <path
        d="M104 26c-50 0-88 30-88 68 0 30 26 52 56 52 14 0 17-10 12-21-5-12 4-23 18-23h22c26 0 44-14 44-36 0-24-28-40-64-40z"
        fill={PAPER}
      />
      <circle cx="56" cy="80" r="9" fill={INK} />
      <circle cx="86" cy="56" r="9" fill={YELLOW} />
      <circle cx="122" cy="52" r="9" fill={INK} />
      <circle cx="150" cy="70" r="9" fill={PAPER} />
      <g transform="rotate(38 178 100)">
        <rect x="172" y="40" width="12" height="74" rx="4" fill={PAPER} />
        <rect x="170" y="110" width="16" height="12" fill={INK} />
        <path d="M170 122q8 30 16 0z" fill={INK} />
      </g>
    </>
  ),
  // Optik form ve kalem
  "hazirlik-kitaplari": (
    <>
      <g transform="rotate(-6 100 88)">
        <rect x="36" y="16" width="124" height="142" rx="8" fill={PAPER} />
        {[44, 70, 96, 122].map((y, row) =>
          [62, 86, 110, 134].map((x, col) => (
            <circle key={`${x}-${y}`} cx={x} cy={y + 8} r="8" fill={[1, 3, 0, 2][row] === col ? INK : PAPER} strokeWidth="3" />
          )),
        )}
      </g>
      <g transform="rotate(24 188 90)">
        <rect x="179" y="30" width="18" height="12" rx="3" fill={INK} />
        <rect x="179" y="42" width="18" height="80" fill={PAPER} />
        <path d="M179 122l9 24 9-24z" fill={PAPER} />
      </g>
    </>
  ),
  // Rafta kitap sırtları
  "kultur-kitaplari": (
    <>
      <rect x="30" y="52" width="26" height="100" fill={PAPER} />
      <path d="M30 72h26M30 132h26" strokeWidth="3" />
      <rect x="56" y="34" width="32" height="118" fill={INK} />
      <path d="M64 56h16M64 66h16" stroke={YELLOW} strokeWidth="3" />
      <rect x="88" y="64" width="22" height="88" fill={PAPER} />
      <rect x="110" y="44" width="30" height="108" fill={PAPER} />
      <rect x="118" y="60" width="14" height="30" fill={YELLOW} strokeWidth="3" />
      <g transform="rotate(16 172 152)">
        <rect x="148" y="54" width="26" height="98" fill={PAPER} />
        <path d="M148 74h26" strokeWidth="3" />
      </g>
      <path d="M12 152h196" />
    </>
  ),
  // Kurdeleli hediye paketi
  hediyelik: (
    <>
      <rect x="50" y="78" width="120" height="78" rx="6" fill={PAPER} />
      <rect x="40" y="54" width="140" height="28" rx="6" fill={PAPER} />
      <rect x="100" y="54" width="20" height="102" fill={INK} />
      <path d="M110 54c-10-28-46-28-42-6 3 13 28 10 42 6z" fill={PAPER} />
      <path d="M110 54c10-28 46-28 42-6-3 13-28 10-42 6z" fill={PAPER} />
    </>
  ),
  // Hesap makinesi
  elektronik: (
    <g transform="rotate(-6 110 85)">
      <rect x="58" y="12" width="104" height="146" rx="12" fill={PAPER} />
      <rect x="72" y="26" width="76" height="30" rx="4" fill={INK} />
      <path d="M118 41h20" stroke={YELLOW} strokeWidth="3" />
      {[70, 96, 122].map((y) =>
        [72, 100, 128].map((x) => (
          <rect key={`${x}-${y}`} x={x} y={y} width="20" height="18" rx="4" fill={x === 128 && y === 122 ? YELLOW : PAPER} strokeWidth="3" />
        )),
      )}
    </g>
  ),
  // Sırt çantası ve matara
  "canta-beslenme": (
    <>
      <path d="M92 44c0-14 8-22 18-22s18 8 18 22" />
      <rect x="62" y="40" width="96" height="116" rx="28" fill={PAPER} />
      <path d="M62 84c14 10 30 14 48 14s34-4 48-14" />
      <rect x="80" y="106" width="60" height="38" rx="10" fill={YELLOW} />
      <path d="M92 120h36" strokeWidth="3" />
      <path d="M62 70c-14 2-22 12-22 28v28c0 8 6 12 12 12h10" fill={PAPER} />
      <rect x="168" y="62" width="26" height="86" rx="9" fill={PAPER} />
      <rect x="172" y="46" width="18" height="16" rx="4" fill={INK} />
      <path d="M168 92h26M168 118h26" strokeWidth="3" />
    </>
  ),
  // Üst üste yapı tuğlaları
  oyuncak: (
    <>
      <rect x="22" y="104" width="84" height="48" rx="5" fill={PAPER} />
      <rect x="34" y="94" width="20" height="10" rx="3" fill={PAPER} />
      <rect x="74" y="94" width="20" height="10" rx="3" fill={PAPER} />
      <rect x="106" y="104" width="92" height="48" rx="5" fill={YELLOW} />
      <rect x="118" y="94" width="20" height="10" rx="3" fill={YELLOW} />
      <rect x="150" y="94" width="20" height="10" rx="3" fill={YELLOW} />
      <rect x="62" y="56" width="92" height="48" rx="5" fill={INK} />
      <rect x="74" y="46" width="20" height="10" rx="3" fill={INK} />
      <rect x="122" y="46" width="20" height="10" rx="3" fill={INK} />
      <path d="M32 138h64M116 138h72" strokeWidth="3" />
    </>
  ),
};

export default function CategoryArt({ rootSlug, className = "" }: { rootSlug: string; className?: string }) {
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
      {art[rootSlug] ?? art.kirtasiye}
    </svg>
  );
}
