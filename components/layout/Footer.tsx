import Link from "next/link";
import Image from "next/image";
import { Container } from "@/components/ui/Container";
import {
  PolarLogo,
  InstagramIcon,
  FacebookIcon,
  TikTokIcon,
} from "@/components/icons";
import { NAV_LINKS, SITE_NAME } from "@/lib/config";

const SOCIAL_LINKS = [
  { label: "Instagram", href: "#", Icon: InstagramIcon },
  { label: "Facebook", href: "#", Icon: FacebookIcon },
  { label: "TikTok", href: "#", Icon: TikTokIcon },
];

// Real product photos over an accent-tinted tile so the Instagram grid is on-brand.
const INSTAGRAM_TILES = [
  { src: "/images/polar-cocktail-product-transparent.png", accent: "#2EA6E0" },
  { src: "/images/polar-cocktail-purple-transparent.png", accent: "#7B2FB0" },
  { src: "/images/polar-cocktail-golden-transparent.png", accent: "#E0A52E" },
  { src: "/images/polar-cocktail-red-transparent.png", accent: "#E0457A" },
  { src: "/images/polar-cocktail-mint-cookie-transparent.png", accent: "#3FB58A" },
];

export function Footer() {
  return (
    <footer className="bg-polar-bg3">
      <Container>
        <div className="grid grid-cols-1 gap-8 pt-10 pb-8 md:grid-cols-[1.2fr_1fr_1.4fr] md:gap-8">
          {/* Column 1: logo + blurb + social */}
          <div className="flex flex-col gap-4">
            <Link
              href="/"
              className="flex items-center"
              aria-label={`${SITE_NAME} - Inicio`}
            >
              <PolarLogo className="h-20 w-20 text-polar-text" />
            </Link>
            <p className="max-w-[220px] text-[14px] leading-relaxed text-polar-muted">
              Cócteles granizados con una explosión de frescura. Hechos para
              compartir, vivir y disfrutar.
            </p>
            <div className="flex items-center gap-2.5">
              {SOCIAL_LINKS.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[rgba(167,73,197,0.25)] bg-[rgba(15,10,34,0.6)] text-polar-purple-light transition-colors hover:border-[rgba(167,73,197,0.55)] hover:text-polar-text"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Column 2: quick links */}
          <div className="flex flex-col gap-3">
            <h3 className="font-display text-[16px] font-semibold text-polar-text">
              Enlaces rápidos
            </h3>
            <ul className="flex flex-col gap-2">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-[14px] text-polar-muted transition-colors hover:text-polar-text"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Instagram grid */}
          <div className="flex flex-col gap-4">
            <h3 className="font-display text-[16px] font-semibold text-polar-text">
              Síguenos en Instagram
            </h3>
            <div className="grid grid-cols-5 gap-[10px]">
              {INSTAGRAM_TILES.map(({ src, accent }, i) => (
                <a
                  key={i}
                  href="#"
                  aria-label={`Síguenos en Instagram — foto ${i + 1}`}
                  className="group relative aspect-square overflow-hidden rounded-[11px] border border-[rgba(167,73,197,0.18)]"
                  style={{
                    background: `radial-gradient(120% 120% at 50% 12%, ${accent}55 0%, #0f0a22 72%)`,
                  }}
                >
                  <Image
                    src={src}
                    alt=""
                    fill
                    sizes="120px"
                    className="object-contain p-1.5 transition-transform group-hover:scale-105"
                  />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-[rgba(167,73,197,0.15)] py-4">
          <p className="text-center text-[13px] text-polar-dim">
            © 2024 Polar Cocktails. Todos los derechos reservados.
          </p>
        </div>
      </Container>
    </footer>
  );
}

export default Footer;
