import ProductCard from "./ProductCard";
import type { ProductCardData } from "@/lib/catalog";

// "dense": yan menüsü olmayan tam genişlik listeler (kategori, arama) için bir sütun fazla.
export const gridClasses = {
  default: "grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4",
  dense: "grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-4 md:gap-4 xl:grid-cols-5",
};

// Mobilde tek satır, parmakla yana kayan şerit (scroll-snap); sm ve üstünde normal ızgara. Kartlar ekranın
// yaklaşık %43'ü kadar geniştir: iki kart tam, üçüncüsünün ucu görünür ve "kaydırılabilir" izlenimi verir.
// Kenarlara kadar uzasın diye container boşluğu (px-4) geri alınır.
const scrollClasses =
  "-mx-4 flex snap-x snap-mandatory gap-2.5 overflow-x-auto overscroll-x-contain px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid sm:gap-3 sm:overflow-visible sm:px-0 sm:pb-0 md:grid-cols-3 md:gap-4 lg:grid-cols-4 sm:grid-cols-2";

export default function ProductGrid({
  products,
  dense = false,
  scrollOnMobile = false,
}: {
  products: ProductCardData[];
  dense?: boolean;
  scrollOnMobile?: boolean;
}) {
  // ProductCard asenkron sunucu bileşeni (rozet kesitini önbellekten okur).
  if (scrollOnMobile) {
    return (
      <div className={scrollClasses}>
        {products.map((product) => (
          <div key={product.id} className="flex w-[43vw] max-w-60 shrink-0 snap-start scroll-ml-4 sm:w-auto sm:max-w-none [&>article]:w-full">
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={dense ? gridClasses.dense : gridClasses.default}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
