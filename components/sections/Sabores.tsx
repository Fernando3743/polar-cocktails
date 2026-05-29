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
    <section id="menu" className="pt-0 pb-0">
      <Container>
        <div className="flex flex-col items-center text-center">
          <span className="eyebrow text-[12px] tracking-[0.18em]">NUESTROS GRANIZADOS</span>
          <h2 className="mt-[8px] font-display text-[30px] font-bold leading-tight text-white">
            Sabores que te{" "}
            <span className="text-polar-magenta">encantarán</span>
          </h2>

          <div className="mt-[18px] w-full">
            <CategoryTabs
              categories={categories}
              active={active}
              onChange={setActive}
            />
          </div>
        </div>

        <div className="mt-[20px]">
          <ProductGrid products={filtered} />
        </div>

        <div className="flex justify-center pt-[17px]">
          <Link href="/menu" className="btn-outline-rect h-[39px] rounded-[12px] px-[28px] text-[14px]">
            Ver todos los sabores
            <CupIcon className="h-[18px] w-[18px]" />
          </Link>
        </div>
      </Container>
    </section>
  );
}
