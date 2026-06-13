import { Sabores } from "@/components/sections/Sabores";
import { Snowfall } from "@/components/layout/Snowfall";
import { Container } from "@/components/ui/Container";
import { MenuJsonLd } from "@/components/seo/MenuJsonLd";
import { getProducts, getCategories } from "@/lib/queries/menu";

// Single source so the page <meta> description and the social (OG/Twitter)
// descriptions stay in sync.
const MENU_DESCRIPTION =
  "Explora todos los sabores de cócteles granizados Polar en Tuluá. " +
  "Frutales, tropicales, clásicos y especiales.";

export const metadata = {
  title: "Menú de Cócteles Granizados en Tuluá",
  description: MENU_DESCRIPTION,
  alternates: { canonical: "/menu" },
  // Relative og:url resolves against metadataBase (lib/seo.ts siteUrl()).
  openGraph: {
    title: "Menú — Polar",
    description: MENU_DESCRIPTION,
    url: "/menu",
    // A per-route openGraph object REPLACES the root's (it is not deep-merged),
    // which drops the file-convention og:image — so re-attach the shared image
    // (served at /opengraph-image.png) explicitly to keep /menu link previews.
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "Polar — Cócteles Granizados en Tuluá",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Menú — Polar",
    description: MENU_DESCRIPTION,
    // Same reason as openGraph above: re-attach the shared twitter image.
    images: [
      {
        url: "/twitter-image.png",
        alt: "Polar — Cócteles Granizados en Tuluá",
      },
    ],
  },
};

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
