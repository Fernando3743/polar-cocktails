import Link from "next/link";
import Image from "next/image";
import { Container } from "@/components/ui/Container";
import {
  PolarLogo,
  InstagramIcon,
  FacebookIcon,
  TikTokIcon,
} from "@/components/icons";
import { ADDRESS_LINES, NAV_LINKS, SITE_NAME } from "@/lib/config";
import { SEED_SHOP_SETTINGS } from "@/lib/seed-data";

interface GalleryTile {
  url: string;
  href: string;
}

interface FooterSocials {
  instagram: string;
  facebook: string;
  tiktok: string;
}

interface FooterProps {
  logoUrl?: string;
  galleryTiles?: GalleryTile[];
  socials?: FooterSocials;
  addressLines?: string[];
}

// Map each social profile to its inline SVG icon. Hrefs come from settings; the
// icon mapping stays here so config/settings hold no JSX. Only real (non-"#",
// non-empty) URLs render a link.
const SOCIAL_ICONS: Array<{
  key: keyof FooterSocials;
  label: string;
  Icon: typeof InstagramIcon;
}> = [
  { key: "instagram", label: "Instagram", Icon: InstagramIcon },
  { key: "facebook", label: "Facebook", Icon: FacebookIcon },
  { key: "tiktok", label: "TikTok", Icon: TikTokIcon },
];

export function Footer({
  logoUrl,
  galleryTiles,
  socials,
  addressLines,
}: FooterProps) {
  // Every value falls back to the seed/constant so demo mode and the
  // pre-migration build keep rendering the prototype footer.
  const resolvedSocials = socials ?? SEED_SHOP_SETTINGS.socialLinks;
  const resolvedAddress =
    addressLines && addressLines.length > 0 ? addressLines : ADDRESS_LINES;
  const tiles = galleryTiles ?? [];

  // Compact NAP line mirroring the JSON-LD PostalAddress. addressLines[0] is the
  // city ("Tuluá"); the remaining lines are the street address.
  const napLine = `${SITE_NAME} · ${resolvedAddress.slice(1).join(", ")}, ${resolvedAddress[0]}, Valle del Cauca`;

  return (
    <footer className="bg-transparent pt-[34px]">
      <Container>
        <div className="border-t border-[rgba(255,255,255,0.13)]">
          <div className="grid grid-cols-1 gap-8 pt-[20px] pb-[4px] md:grid-cols-[290px_150px_1fr] md:gap-[42px]">
            <div className="flex flex-col gap-[14px]">
              <div className="flex items-center gap-[28px]">
                <Link
                  href="/"
                  className="flex items-center"
                  aria-label={`${SITE_NAME} - Inicio`}
                >
                  <PolarLogo src={logoUrl} className="h-[82px] w-[82px] text-polar-text" />
                </Link>
                <p className="max-w-[176px] text-[13px] leading-[1.48] text-[#B9B2C6]">
                  Cócteles granizados con una explosión de frescura. Hechos
                  para compartir, vivir y disfrutar.
                </p>
              </div>
              <div className="flex items-center gap-[31px] pl-[16px]">
                {SOCIAL_ICONS.map(({ key, label, Icon }) => {
                  const href = resolvedSocials[key];
                  if (!href || href === "#") return null;
                  return (
                    <a
                      key={key}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      className="inline-flex h-[28px] w-[28px] items-center justify-center rounded-full bg-[rgba(15,10,34,0.65)] text-polar-purple-light transition-colors hover:text-polar-text"
                    >
                      <Icon className="h-4 w-4" />
                    </a>
                  );
                })}
              </div>
              <p className="pl-[16px] text-[12px] leading-[1.4] text-polar-dim">
                {napLine}
              </p>
            </div>

            <div className="flex flex-col gap-[12px]">
              <h3 className="font-display text-[13px] font-semibold text-polar-text">
                Enlaces rápidos
              </h3>
              <ul className="flex flex-col gap-[4px]">
                {NAV_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-[12px] leading-[1.25] text-[#B9B2C6] transition-colors hover:text-polar-text"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-[13px]">
              <h3 className="font-display text-[13px] font-semibold text-polar-text">
                Síguenos en Instagram
              </h3>
              <div className="grid grid-cols-5 gap-[11px]">
                {tiles.map((tile, i) => {
                  const tileHref = tile.href || "#";
                  return (
                    <a
                      key={i}
                      href={tileHref}
                      {...(tileHref !== "#"
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {})}
                      aria-label={`Síguenos en Instagram - foto ${i + 1}`}
                      className="group relative h-[84px] overflow-hidden rounded-[6px] border border-[rgba(167,73,197,0.18)]"
                    >
                      <Image
                        src={tile.url}
                        alt=""
                        fill
                        sizes="90px"
                        className="object-cover transition-transform group-hover:scale-105"
                      />
                    </a>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="border-t border-[rgba(255,255,255,0.08)] py-[10px]">
            <p className="text-center text-[12px] text-polar-dim">
              © 2026 Polar Cocktails. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </Container>
    </footer>
  );
}

export default Footer;
