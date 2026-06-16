import Link from "next/link";
import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { ArrowRightIcon, SnowflakeIcon, WhatsAppIcon } from "@/components/icons";
import { whatsappUrl } from "@/lib/config";
import heroImage from "@/public/images/polarheroimage.png";
import heroMobileImage from "@/public/generated/polar-mobile-hero.png";

const ORDER_MESSAGE =
  "¡Hola Polar! Quiero pedir un domicilio de cócteles granizados.";

function CupIconMini() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-[24px] w-[24px] text-[#B84DFF]"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M7 7q5-4 10 0" />
      <path d="M6.4 7h11.2" />
      <path d="M14.5 5.3 16.6 1.5" />
      <path d="M7.4 7 8.7 20.2Q8.8 22 10.4 22h3.2q1.6 0 1.7-1.8L16.6 7" />
      <path d="M8.2 12.5h7.6" />
    </svg>
  );
}

function SparklesMini() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-[24px] w-[24px] text-[#B84DFF]"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M13 3 11.2 8.2 6 10l5.2 1.8L13 17l1.8-5.2L20 10l-5.2-1.8L13 3Z" />
      <path d="M5 15.5 4.2 18 2 18.8l2.2.8L5 22l.8-2.4 2.2-.8-2.2-.8L5 15.5Z" />
    </svg>
  );
}

interface HeroProps {
  heroDesktopUrl?: string;
  heroMobileUrl?: string;
  whatsappNumber?: string;
}

export function Hero({
  heroDesktopUrl,
  heroMobileUrl,
  whatsappNumber,
}: HeroProps) {
  // Remote (Supabase) URLs cannot use placeholder="blur" — that only works with
  // static imports that carry a blurDataURL. When a URL prop is provided we use
  // it as a plain string src and drop the blur; otherwise we keep the bundled
  // static import as the demo/pre-migration fallback.
  const desktopSrc = heroDesktopUrl ?? heroImage;
  const mobileSrc = heroMobileUrl ?? heroMobileImage;

  return (
    <section className="relative overflow-hidden pb-0 md:-mt-[132px] md:pt-[132px]">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div
          className="absolute right-[-48%] top-[28px] h-[300px] w-[370px] rounded-full opacity-55 md:right-[-5%] md:top-[1%] md:h-[560px] md:w-[760px] md:opacity-45"
          style={{
            background:
              "radial-gradient(circle,#5C109B 0%,#2A0F52 42%,transparent 70%)",
            filter: "blur(100px)",
          }}
        />
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[322px] overflow-hidden md:hidden">
        <div
          className="absolute right-[-18px] top-0 h-full w-[340px]"
          aria-hidden="true"
        >
          <Image
            src={mobileSrc}
            alt=""
            priority
            fill
            sizes="(max-width: 767px) 340px, 0px"
            className="object-cover object-[58%_45%] opacity-95"
          />
        </div>
        <div className="absolute inset-y-0 left-0 w-[55%] bg-gradient-to-r from-black via-black/90 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-[74px] bg-gradient-to-t from-black to-transparent" />
      </div>
      <Container className="relative z-10 px-7 md:px-8 lg:px-16">
        <div className="grid min-h-[310px] items-start gap-5 md:min-h-[456px] md:grid-cols-[360px_1fr]">
          <div className="relative z-20 flex flex-col">
            <span className="mt-[25px] inline-flex h-[22px] w-fit items-center gap-2 rounded-full border border-[rgba(167,73,197,0.62)] bg-[rgba(11,7,28,0.72)] px-[14px] text-[10px] font-semibold uppercase text-[#DEB7FF] shadow-[0_0_15px_rgba(177,62,255,0.7)] md:mt-[28px] md:h-[28px] md:bg-[rgba(146,40,218,0.15)] md:px-[16px] md:text-[11px] md:tracking-[0.14em] md:text-[#D9CBF2]">
              <SnowflakeIcon className="h-[14px] w-[14px] text-polar-snow" />
              Cócteles granizados
            </span>

            <h1 className="hero-title mt-[15px] max-w-[220px] origin-left text-[54px] uppercase leading-[0.88] text-white md:mt-[19px] md:max-w-full md:translate-y-[3px] md:text-[78px] md:leading-[0.94] lg:w-[520px] lg:scale-x-[1.08] lg:text-[92px]">
              Que rico
              <br />
              <span className="text-polar-purple">Es-coger</span>
            </h1>

            <p className="mt-[10px] max-w-[242px] text-[14px] leading-[1.45] text-[#D4CDDD] md:mt-[27px] md:max-w-full md:text-[16px] md:leading-[1.48] sm:md:w-[390px]">
              <span className="md:hidden">
                Cócteles granizados con una explosión de frescura.
              </span>
              <span className="hidden md:inline">
                Cócteles granizados con una explosión de frescura. 12 sabores
                diferentes y 8 combinaciones únicas para todos los gustos.
              </span>
            </p>

            <div className="mt-[11px] flex items-center gap-[18px] md:hidden">
              <div className="flex items-center gap-[8px]">
                <CupIconMini />
                <div className="leading-none">
                  <div className="text-[20px] font-bold text-[#B84DFF]">12</div>
                  <div className="mt-[2px] text-[9px] font-semibold uppercase text-[#C8C2D6]">
                    Sabores
                  </div>
                </div>
              </div>
              <div className="h-[30px] w-px bg-[rgba(255,255,255,0.24)]" />
              <div className="flex items-center gap-[8px]">
                <SparklesMini />
                <div className="leading-none">
                  <div className="text-[20px] font-bold text-[#B84DFF]">8</div>
                  <div className="mt-[2px] text-[9px] font-semibold uppercase text-[#C8C2D6]">
                    Combinaciones
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-[16px] flex items-center gap-[12px] md:mt-[27px] md:flex-wrap">
              <a
                href={whatsappUrl(ORDER_MESSAGE, whatsappNumber)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-brand h-[38px] px-[14px] text-[11px] shadow-[0_0_22px_rgba(177,62,255,0.65)] md:h-[45px] md:px-[17px] md:text-[14px]"
              >
                <WhatsAppIcon className="h-[17px] w-[17px] md:h-[18px] md:w-[18px]" />
                ¡Pide ya tu domicilio!
              </a>
              <Link
                href="#menu"
                className="btn-ghost h-[38px] px-[18px] text-[11px] md:h-[45px] md:px-[21px] md:text-[14px]"
              >
                Ver menú
                <ArrowRightIcon className="h-[15px] w-[15px] text-polar-purple-light md:hidden" />
              </Link>
            </div>
          </div>

          <div className="relative hidden h-[456px] md:block">
            <div className="absolute top-[8px] right-[-40px] h-[420px] w-[500px] overflow-hidden lg:top-[-26px] lg:right-[64px] lg:h-[500px] lg:w-[610px]">
              <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-[120px] bg-gradient-to-r from-black to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[110px] bg-gradient-to-t from-black to-transparent" />
              <Image
                src={desktopSrc}
                alt="Cuatro cócteles granizados Polar sobre pedestales morados"
                priority
                {...(heroDesktopUrl ? {} : { placeholder: "blur" as const })}
                sizes="(min-width: 1024px) 620px, (min-width: 768px) 500px, 0px"
                className="h-full w-full select-none object-cover object-[50%_45%]"
              />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
