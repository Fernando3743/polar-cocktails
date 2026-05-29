import Link from "next/link";
import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { SnowflakeIcon, WhatsAppIcon } from "@/components/icons";
import { whatsappUrl } from "@/lib/config";
import heroImage from "@/public/images/polarheroimage.png";

const ORDER_MESSAGE =
  "¡Hola Polar! Quiero pedir un domicilio de cócteles granizados.";

export function Hero() {
  return (
    <section className="relative -mt-[132px] overflow-hidden pt-[132px] pb-0">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div
          className="absolute right-[-5%] top-[1%] h-[560px] w-[760px] rounded-full opacity-45"
          style={{
            background:
              "radial-gradient(circle,#5C109B 0%,#2A0F52 42%,transparent 70%)",
            filter: "blur(100px)",
          }}
        />
      </div>
      <Container className="relative z-10 px-4 sm:px-10">
        <div className="grid min-h-[456px] items-start gap-5 lg:grid-cols-[360px_1fr]">
          <div className="flex flex-col">
            <span className="mt-[28px] inline-flex h-[28px] w-fit items-center gap-2 rounded-full border border-[rgba(167,73,197,0.45)] bg-[rgba(146,40,218,0.15)] px-[16px] text-[11px] font-semibold uppercase tracking-[0.14em] text-[#D9CBF2] shadow-[0_0_18px_rgba(146,40,218,0.35)]">
              <SnowflakeIcon className="h-[14px] w-[14px] text-polar-snow" />
              Cócteles granizados
            </span>

            <h1 className="hero-title mt-[19px] max-w-full origin-left translate-y-[3px] text-[64px] uppercase leading-[0.94] text-white sm:text-[78px] lg:w-[520px] lg:scale-x-[1.08] lg:text-[92px]">
              Que rico
              <br />
              <span className="text-polar-purple">Es-coger</span>
            </h1>

            <p className="mt-[27px] max-w-full text-[16px] leading-[1.48] text-[#C8C2D6] sm:w-[390px]">
              Cócteles granizados con una explosión de frescura. 12 sabores
              diferentes y 8 combinaciones únicas para todos los gustos.
            </p>

            <div className="mt-[27px] flex flex-wrap items-center gap-[12px]">
              <a
                href={whatsappUrl(ORDER_MESSAGE)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-brand h-[45px] px-[17px] text-[14px]"
              >
                <WhatsAppIcon className="h-[18px] w-[18px]" />
                ¡Pide ya tu domicilio!
              </a>
              <Link
                href="#menu"
                className="btn-ghost h-[45px] px-[21px] text-[14px]"
              >
                Ver menú
              </Link>
            </div>
          </div>

          <div className="relative hidden h-[456px] lg:block">
            <div className="absolute left-[-5px] top-[-26px] h-[500px] w-[610px] overflow-hidden">
              <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-[120px] bg-gradient-to-r from-black to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[110px] bg-gradient-to-t from-black to-transparent" />
              <Image
                src={heroImage}
                alt="Cuatro cócteles granizados Polar sobre pedestales morados"
                priority
                placeholder="blur"
                sizes="620px"
                className="h-full w-full select-none object-cover object-[50%_45%]"
              />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
