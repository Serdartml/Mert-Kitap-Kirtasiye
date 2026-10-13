import { Star } from "lucide-react";

// Yalnızca gösterim: dolu / boş yıldızlar. Ekran okuyucu için metin eşdeğeri verilir.
export default function StarRating({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`5 üzerinden ${String(value).replace(".", ",")}`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          aria-hidden
          className={n <= Math.round(value) ? "fill-brand-500 text-brand-600" : "text-neutral-300"}
        />
      ))}
    </span>
  );
}
