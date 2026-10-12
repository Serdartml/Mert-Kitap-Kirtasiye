// Renkli bir bölümün üst ya da alt kenarını "yırtılmış kâğıt" gibi dişli çizer. Üst kapsayıcı `relative`
// olmalı. Kenar bölümün dışına taşar; bölümden önce/sonra biraz boşluk (margin) bırakın.
const WIDTH = 1200;
const HEIGHT = 24;
const TEETH = 56;

// Sabit tohumlu sözde rastgele: sunucu ve tarayıcı aynı şekli çizer (hidrasyon uyuşmazlığı olmaz).
function buildPath() {
  let seed = 7;
  const next = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const step = WIDTH / TEETH;
  let d = `M0 ${HEIGHT}`;
  for (let i = 0; i <= TEETH; i++) {
    // Her diş: kâğıdın düzensiz yırtığı gibi 3-20 birim yükseklik, hafif yatay sapma.
    const x = Math.min(WIDTH, Math.round(i * step + (i === 0 || i === TEETH ? 0 : (next() - 0.5) * step * 0.5)));
    const y = Math.round(3 + next() * 17);
    d += ` L${x} ${y}`;
  }
  return `${d} L${WIDTH} ${HEIGHT} Z`;
}

const PATH = buildPath();

// colorClass: şeklin rengi (bölümün zemin rengiyle aynı), örn. "text-ink". Bölümün kendi yazı rengi
// kalıtılmaz; çünkü bölüm içindeki kartlar o rengi miras alıp temaya göre bozulabilir.
export default function SectionEdge({ position, colorClass }: { position: "top" | "bottom"; colorClass: string }) {
  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      className={`pointer-events-none absolute inset-x-0 block h-3 w-full fill-current md:h-5 ${colorClass} ${
        position === "top" ? "bottom-full translate-y-px" : "top-full -translate-y-px -scale-y-100"
      }`}
    >
      <path d={PATH} />
    </svg>
  );
}
