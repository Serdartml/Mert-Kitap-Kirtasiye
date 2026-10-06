import Image from "next/image";
import { categoryIcons, categoryPatterns, fallbackCategoryIcon, fallbackCategoryPattern } from "@/lib/category-icons";

interface ProductVisualProps {
  name: string;
  rootCategorySlug: string;
  image?: { url: string; alt: string | null } | null;
  sizes?: string;
  priority?: boolean;
}

// Ürün görseli varsa onu, yoksa kategoriye göre bir yer tutucu gösterir.
export default function ProductVisual({ name, rootCategorySlug, image, sizes = "(min-width: 1024px) 25vw, 50vw", priority }: ProductVisualProps) {
  const Icon = categoryIcons[rootCategorySlug] ?? fallbackCategoryIcon;
  const pattern = categoryPatterns[rootCategorySlug] ?? fallbackCategoryPattern;

  return (
    <div className="relative aspect-square overflow-hidden rounded-lg bg-neutral-100">
      {image ? (
        <Image src={image.url} alt={image.alt ?? name} fill sizes={sizes} priority={priority} className="object-cover" />
      ) : (
        <div className={`grid h-full place-items-center text-neutral-300 ${pattern}`} role="img" aria-label={`${name} için görsel henüz eklenmedi`}>
          <Icon className="size-1/3" strokeWidth={1.25} />
        </div>
      )}
    </div>
  );
}
