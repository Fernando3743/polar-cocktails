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
      <Container className="px-5 md:px-6">
        <div className="flex flex-col items-center text-center">
          <span className="eyebrow text-[11px] md:text-[12px] md:tracking-[0.18em]">
            NUESTROS GRANIZADOS
          </span>
          <h2 className="mt-[7px] max-w-[310px] font-display text-[27px] font-bold leading-[1.05] text-white md:mt-[8px] md:max-w-none md:text-[30px] md:leading-tight">
            Sabores que te{" "}
            <span className="text-polar-magenta">encantarán</span>
          </h2>

          <div className="mt-[12px] w-full md:mt-[18px]">
            <CategoryTabs
              categories={categories}
              active={active}
              onChange={setActive}
            />
          </div>
        </div>

        <div className="mt-[18px] md:mt-[20px]">
          <ProductGrid products={filtered} />
        </div>

        <div className="flex justify-center pt-[13px] md:pt-[17px]">
          <Link
            href="/menu"
            className="btn-outline-rect h-[38px] rounded-[10px] px-[34px] text-[11px] uppercase text-[#B84DFF] md:h-[39px] md:rounded-[12px] md:px-[28px] md:text-[14px] md:normal-case"
          >
            Ver todos los sabores
            <CupIcon className="h-[18px] w-[18px]" />
          </Link>
        </div>
      </Container>
    </section>
  );
}
