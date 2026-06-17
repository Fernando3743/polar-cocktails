import { Sabores } from "@/components/sections/Sabores";
import { Snowfall } from "@/components/layout/Snowfall";
import { Container } from "@/components/ui/Container";
import { MenuJsonLd } from "@/components/seo/MenuJsonLd";
import { getProducts, getCategories } from "@/lib/queries/menu";
import { pageMetadata } from "@/lib/seo";

// Single source so the page <meta> description and the social (OG/Twitter)
// descriptions stay in sync.
const MENU_DESCRIPTION =
  "Explora todos los sabores de cócteles granizados Polar en Tuluá. " +
  "Frutales, tropicales, clásicos y especiales.";

// Relative og:url resolves against metadataBase (lib/seo.ts siteUrl()). The
// shared file-convention OG/Twitter images are re-attached by pageMetadata.
export const metadata = pageMetadata({
  title: "Menú de Cócteles Granizados en Tuluá",
  socialTitle: "Menú — Polar",
  description: MENU_DESCRIPTION,
  path: "/menu",
});

export default async function MenuPage() {
  const [products, categories] = await Promise.all([
    getProducts(),
    getCategories(),
  ]);

  return (
    <>
      <Snowfall />
      <MenuJsonLd />
      <div className="relative z-10 pt-10">
        <Container className="text-center">
          <p className="eyebrow">Nuestra carta</p>
          <h1 className="mt-3 font-display text-4xl font-800 uppercase tracking-[-0.02em] text-polar-text sm:text-5xl">
            Nuestro <span className="text-polar-magenta">menú</span>
          </h1>
          <p className="mx-auto mt-4 max-w-[480px] text-base leading-relaxed text-polar-muted">
            Cócteles granizados con una explosión de frescura en Tuluá. Elige
            tus sabores favoritos y arma tu pedido.
          </p>
        </Container>

        <Sabores products={products} categories={categories} />
      </div>
    </>
  );
}
