import Image from "next/image";
import {
  categoryIcons,
  categoryPatterns,
  categoryTones,
  fallbackCategoryIcon,
  fallbackCategoryPattern,
  fallbackCategoryTone,
} from "@/lib/category-icons";

interface ProductVisualProps {
  name: string;
  rootCategorySlug: string;
  image?: { url: string; alt: string | null } | null;
  sizes?: string;
  priority?: boolean;
  // Renk paleti gibi bileşenlerin bu görseli bulabilmesi için.
  id?: string;
}

// Ürün adının ilk harfi ya da rakamı (kapak harfi). Bulunamazsa soru işareti yerine boş bırakılır.
function initialOf(name: string): string {
  const match = name.match(/[\p{L}\p{N}]/u);
  return match ? match[0].toLocaleUpperCase("tr-TR") : "";
}

// Ürün görseli varsa onu, yoksa kategoriye göre renkli bir "kapak" gösterir: ürün adının baş harfi,
// köşede kategori ikonu, altta el yazısıyla not. Ölçüler kutunun genişliğine göre (cqw) ayarlanır; aynı
// kapak sepetteki küçük kutuda da ürün sayfasındaki büyük kutuda da orantılı görünür.
// Renkler currentColor üzerinden gelir: renk paleti (globals.css, [data-paint]) kapağı boyayabilsin.
// data-fly-source: sepete eklerken bu kutunun kopyası sepete uçar (lib/fly-to-cart).
export default function ProductVisual({ name, rootCategorySlug, image, sizes = "(min-width: 1024px) 25vw, 50vw", priority, id }: ProductVisualProps) {
  const Icon = categoryIcons[rootCategorySlug] ?? fallbackCategoryIcon;
  const pattern = categoryPatterns[rootCategorySlug] ?? fallbackCategoryPattern;
  const tone = categoryTones[rootCategorySlug] ?? fallbackCategoryTone;
  const initial = initialOf(name);

  return (
    <div
      id={id}
      data-fly-source
      className={`@container relative aspect-square overflow-hidden rounded-lg ${image ? "bg-neutral-100" : tone.split(" ")[0]}`}
    >
      {image ? (
        <Image src={image.url} alt={image.alt ?? name} fill sizes={sizes} priority={priority} className="object-cover" />
      ) : (
        <div
          className={`product-placeholder relative size-full ${pattern} ${tone.split(" ")[1]} [--pattern-color:color-mix(in_srgb,currentColor_14%,transparent)]`}
          role="img"
          aria-label={`${name} için görsel henüz eklenmedi`}
        >
          <Icon aria-hidden className="absolute right-[7cqw] top-[7cqw] size-[24cqw] rotate-6 opacity-60" strokeWidth={1.5} />
          {/* Alt kenara rozetler biner (ProductCard); harf ve not onların üstünde kalacak kadar yukarıda durur. */}
          <span aria-hidden className="absolute inset-0 grid place-items-center pb-[11cqw] text-[52cqw] font-extrabold leading-none">
            {initial}
          </span>
          <span aria-hidden className="absolute inset-x-0 bottom-[10cqw] hidden text-center font-hand text-[9cqw] leading-none opacity-70 @min-[8rem]:block">
            görsel yakında
          </span>
        </div>
      )}
    </div>
  );
}
