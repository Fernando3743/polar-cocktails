import Link from "next/link";
import { Container } from "@/components/ui/Container";
import {
  PolarLogo,
  PlaceholderCup,
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

// Accent colours reused from the seed flavours so the Instagram tiles feel on-brand.
const TILE_ACCENTS = ["#2EA6E0", "#7B2FB0", "#E0A52E", "#E0457A", "#3FB58A"];

export function Footer() {
  return (
    <footer className="bg-polar-bg3">
      <Container>
        <div className="grid grid-cols-1 gap-12 pt-[52px] pb-10 md:grid-cols-[1.2fr_1fr_1.4fr] md:gap-10">
          {/* Column 1: logo + blurb + social */}
          <div className="flex flex-col gap-5">
            <Link
              href="/"
              className="flex items-center gap-3"
              aria-label={`${SITE_NAME} - Inicio`}
            >
              <PolarLogo className="h-16 w-16 text-polar-text" />
              <span className="font-display text-lg font-bold tracking-[0.18em] text-polar-text uppercase">
                {SITE_NAME}
              </span>
            </Link>
            <p className="max-w-[260px] text-[14px] leading-relaxed text-polar-muted">
              Cócteles granizados con una explosión de frescura. Hechos para
              compartir, vivir y disfrutar.
            </p>
            <div className="flex items-center gap-3">
              {SOCIAL_LINKS.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(167,73,197,0.25)] bg-[rgba(15,10,34,0.6)] text-polar-purple-light transition-colors hover:border-[rgba(167,73,197,0.55)] hover:text-polar-text"
                >
                  <Icon className="h-[18px] w-[18px]" />
                </a>
              ))}
            </div>
          </div>

          {/* Column 2: quick links */}
          <div className="flex flex-col gap-4">
            <h3 className="font-display text-[16px] font-semibold text-polar-text">
              Enlaces rápidos
            </h3>
            <ul className="flex flex-col gap-3">
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
              {TILE_ACCENTS.map((accent, i) => (
                <a
                  key={i}
                  href="#"
                  aria-label="Síguenos en Instagram"
                  className="group relative aspect-square overflow-hidden rounded-[11px] border border-[rgba(167,73,197,0.18)] bg-polar-surface"
                >
                  <PlaceholderCup
                    accentColor={accent}
                    className="h-full w-full transition-transform group-hover:scale-105"
                  />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-[rgba(167,73,197,0.15)] py-[22px]">
          <p className="text-center text-[13px] text-polar-dim">
            © 2024 Polar Cocktails. Todos los derechos reservados.
          </p>
        </div>
      </Container>
    </footer>
  );
}

export default Footer;
