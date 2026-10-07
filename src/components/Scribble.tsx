// Kalemle elde çizilmiş vurgular: daire, dalgalı alt çizgi, ok. Satır içi SVG; JavaScript gerektirmez.
// Çizilme animasyonu sınıfla seçilir (globals.css):
//   scribble-draw   : sayfa açılınca bir kez çizilir
//   scribble-scroll : sayfa kaydırılıp ekrana girdikçe çizilir (desteklemeyen tarayıcıda çizili durur)
// Konum ve boyut className ile verilir; renk yazı renginden gelir.

const shapes = {
  // Bir fiyatın ya da kelimenin etrafına atılan, ucu üst üste binen halka.
  circle: {
    viewBox: "0 0 120 48",
    paths: ["M64 5C32 1 6 11 5 25c-1 14 27 20 59 19 30-1 52-9 51-21C114 10 86 2 52 7"],
  },
  underline: {
    viewBox: "0 0 200 12",
    paths: ["M3 7c16-6 30 6 48 0s30 6 48 0 30 6 48 0 30 5 50 0"],
  },
  // Sağ üstten sol alta kıvrılan ok.
  arrow: {
    viewBox: "0 0 80 50",
    paths: ["M76 8C52 2 24 10 10 38", "M8 20l1 20 19-7"],
  },
} as const;

interface ScribbleProps {
  variant: keyof typeof shapes;
  className?: string;
}

export default function Scribble({ variant, className = "" }: ScribbleProps) {
  const shape = shapes[variant];
  return (
    <svg
      viewBox={shape.viewBox}
      // Daire ve alt çizgi sarıldıkları yazının oranına esner; ok oranını korur.
      preserveAspectRatio={variant === "arrow" ? "xMidYMid meet" : "none"}
      aria-hidden
      className={`scribble ${className}`}
    >
      {shape.paths.map((d) => (
        <path key={d} d={d} pathLength={1} />
      ))}
    </svg>
  );
}
