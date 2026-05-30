import { Hero } from "@/components/sections/Hero";
import { Sabores } from "@/components/sections/Sabores";
import { InfoRow } from "@/components/sections/InfoRow";
import { Snowfall } from "@/components/layout/Snowfall";
import { getProducts, getCategories } from "@/lib/queries/menu";

export default async function Home() {
  const [products, categories] = await Promise.all([
    getProducts(),
    getCategories(),
  ]);

  return (
    <>
      <Snowfall />
      <div className="relative z-10">
        <Hero />
        <Sabores products={products} categories={categories} />
        <InfoRow />
      </div>
    </>
  );
}
