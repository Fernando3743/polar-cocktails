import { ProductCard } from "@/components/menu/ProductCard";
import type { Product } from "@/lib/types";

interface ProductGridProps {
  products: Product[];
}

export function ProductGrid({ products }: ProductGridProps) {
  return (
    <div className="grid grid-cols-2 gap-[22px] sm:grid-cols-3 lg:grid-cols-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
