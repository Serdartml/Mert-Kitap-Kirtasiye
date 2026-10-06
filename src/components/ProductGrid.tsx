import ProductCard from "./ProductCard";
import type { ProductCardData } from "@/lib/catalog";

// "dense": yan menüsü olmayan tam genişlik listeler (kategori, arama) için bir sütun fazla.
export const gridClasses = {
  default: "grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4",
  dense: "grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-4 md:gap-4 xl:grid-cols-5",
};

export default function ProductGrid({ products, dense = false }: { products: ProductCardData[]; dense?: boolean }) {
  return (
    <div className={dense ? gridClasses.dense : gridClasses.default}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
