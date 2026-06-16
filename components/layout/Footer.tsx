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
  const activeSocialIcons = SOCIAL_ICONS.filter(({ key }) => {
    const href = resolvedSocials[key];
    return href && href !== "#";
  });

  // Compact NAP line mirroring the JSON-LD PostalAddress. addressLines[0] is the
  // city ("Tuluá"); the remaining lines are the street address.
  const napLine = `${SITE_NAME} · ${resolvedAddress.slice(1).join(", ")}, ${resolvedAddress[0]}, Valle del Cauca`;

  return (
    <footer className="bg-transparent pt-[34px] pb-[92px] md:pb-0">
      <Container>
        <div className="border-t border-[rgba(255,255,255,0.13)]">
          <div className="grid grid-cols-1 gap-[18px] pt-[22px] pb-[14px] md:grid-cols-[290px_150px_1fr] md:gap-[42px] md:pb-[4px]">
            <div className="rounded-[8px] border border-[rgba(177,93,255,0.16)] bg-[rgba(8,6,22,0.58)] p-4 md:border-0 md:bg-transparent md:p-0">
              <div className="flex items-center gap-[18px] md:gap-[28px]">
                <Link
                  href="/"
                  className="flex items-center"
                  aria-label={`${SITE_NAME} - Inicio`}
                >
                  <PolarLogo src={logoUrl} className="h-[74px] w-[74px] text-polar-text md:h-[82px] md:w-[82px]" />
                </Link>
                <div>
                  <p className="font-display text-[18px] font-semibold leading-none text-polar-text">
                    Polar Cocktails
                  </p>
                  <p className="mt-2 max-w-[210px] text-[13px] leading-[1.48] text-[#B9B2C6] md:max-w-[176px]">
                    Cócteles granizados con una explosión de frescura. Hechos
                    para compartir, vivir y disfrutar.
                  </p>
                </div>
              </div>
              {activeSocialIcons.length > 0 ? (
                <div className="mt-4 flex items-center gap-3 md:gap-[31px] md:pl-[16px]">
                  {activeSocialIcons.map(({ key, label, Icon }) => {
                    const href = resolvedSocials[key];
                    return (
                      <a
                        key={key}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={label}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(177,93,255,0.24)] bg-[rgba(15,10,34,0.65)] text-polar-purple-light transition-colors hover:text-polar-text md:h-[28px] md:w-[28px] md:border-0"
                      >
                        <Icon className="h-4 w-4" />
                      </a>
                    );
                  })}
                </div>
              ) : null}
              <p className="mt-4 text-[12px] leading-[1.45] text-polar-dim md:pl-[16px]">
                {napLine}
              </p>
            </div>

            <div className="flex flex-col gap-[12px] rounded-[8px] border border-[rgba(177,93,255,0.16)] bg-[rgba(10,7,28,0.72)] p-4 md:border-0 md:bg-transparent md:p-0">
              <h3 className="font-display text-[13px] font-semibold text-polar-text">
                Enlaces rápidos
              </h3>
              <ul className="grid grid-cols-2 gap-2 md:flex md:flex-col md:gap-[4px]">
                {NAV_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="flex min-h-10 items-center rounded-[8px] border border-[rgba(177,93,255,0.16)] bg-[rgba(177,93,255,0.06)] px-3 text-[13px] leading-[1.25] text-[#D8D0E7] transition-colors hover:border-[rgba(177,93,255,0.34)] hover:text-polar-text md:min-h-0 md:border-0 md:bg-transparent md:px-0 md:text-[12px] md:text-[#B9B2C6]"
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
              <div className="grid grid-cols-5 gap-2 md:gap-[11px]">
                {tiles.map((tile, i) => {
                  const tileHref = tile.href || "#";
                  return (
                    <a
                      key={tile.url}
                      href={tileHref}
                      {...(tileHref !== "#"
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {})}
                      aria-label={`Síguenos en Instagram - foto ${i + 1}`}
                      className="group relative aspect-square overflow-hidden rounded-[8px] border border-[rgba(167,73,197,0.2)] md:h-[84px] md:rounded-[6px]"
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
