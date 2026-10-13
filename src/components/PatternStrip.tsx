// Süs şeridi: marka sarısı/siyah eş merkezli yaylar (globals.css, .pattern-deco). Bölümler arasında ayraç olarak
// kullanılır; yazıların arkasına konmaz (okunurluğu bozar). className ile dış boşluk verilir.
export default function PatternStrip({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`pattern-deco theme-fixed h-10 border-y-2 border-ink sm:h-14 ${className}`} />;
}