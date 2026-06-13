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

const INSTAGRAM_TILES = [
  "/images/instagram-prototype-1.png",
  "/images/instagram-prototype-2.png",
  "/images/instagram-prototype-3.png",
  "/images/instagram-prototype-4.png",
  "/images/instagram-prototype-5.png",
];

export function Footer() {
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
                  <PolarLogo className="h-[82px] w-[82px] text-polar-text" />
                </Link>
                <p className="max-w-[176px] text-[13px] leading-[1.48] text-[#B9B2C6]">
                  Cócteles granizados con una explosión de frescura. Hechos
                  para compartir, vivir y disfrutar.
                </p>
              </div>
              <div className="flex items-center gap-[31px] pl-[16px]">
                {SOCIAL_LINKS.map(({ label, href, Icon }) => (
                  <a
                    key={label}
                    href={href}
                    aria-label={label}
                    className="inline-flex h-[28px] w-[28px] items-center justify-center rounded-full bg-[rgba(15,10,34,0.65)] text-polar-purple-light transition-colors hover:text-polar-text"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
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
                {INSTAGRAM_TILES.map((src, i) => (
                  <a
                    key={i}
                    href="#"
                    aria-label={`Síguenos en Instagram - foto ${i + 1}`}
                    className="group relative h-[84px] overflow-hidden rounded-[6px] border border-[rgba(167,73,197,0.18)]"
                  >
                    <Image
                      src={src}
                      alt=""
                      fill
                      sizes="90px"
                      className="object-cover transition-transform group-hover:scale-105"
                    />
                  </a>
                ))}
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
