"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { CategoryTabs } from "@/components/menu/CategoryTabs";
import { ProductGrid } from "@/components/menu/ProductGrid";
import { CupIcon } from "@/components/icons";
import type { Category, Product } from "@/lib/types";

interface SaboresProps {
  products: Product[];
  categories: Category[];
}

export function Sabores({ products, categories }: SaboresProps) {
  const [active, setActive] = useState<string>("all");

  const filtered = useMemo(() => {
    if (active === "all") return products;
    return products.filter((p) => p.categorySlug === active);
  }, [active, products]);

  return (
    <section id="menu" className="pt-10 pb-2">
      <Container>
        <div className="flex flex-col items-center text-center">
          <span className="eyebrow">NUESTROS GRANIZADOS</span>
          <h2 className="mt-3 font-display text-[30px] font-bold leading-tight text-white">
            Sabores que te{" "}
            <span className="text-polar-magenta">encantarán</span>
          </h2>

          <div className="mt-5 w-full">
            <CategoryTabs
              categories={categories}
              active={active}
              onChange={setActive}
            />
          </div>
        </div>

        <div className="mt-6">
          <ProductGrid products={filtered} />
        </div>

        <div className="flex justify-center pt-7">
          <Link href="/menu" className="btn-outline-rect">
            Ver todos los sabores
            <CupIcon className="h-[18px] w-[18px]" />
          </Link>
        </div>
      </Container>
    </section>
  );
}
