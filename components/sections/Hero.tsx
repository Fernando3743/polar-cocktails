import Link from "next/link";
import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { SnowflakeIcon, WhatsAppIcon } from "@/components/icons";
import { whatsappUrl } from "@/lib/config";
import heroImage from "@/public/images/polarheronobg.png";

const ORDER_MESSAGE =
  "¡Hola Polar! Quiero pedir un domicilio de cócteles granizados.";

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-8 pb-6">
      {/* Ambient purple bloom spanning the hero (sits behind the content) */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div
          className="absolute right-[6%] top-[6%] h-[620px] w-[760px] rounded-full opacity-45"
          style={{
            background:
              "radial-gradient(circle,#5C109B 0%,#2A0F52 42%,transparent 70%)",
            filter: "blur(100px)",
          }}
        />
      </div>
      <Container className="relative z-10">
        <div className="grid items-center gap-8 lg:grid-cols-2">
          {/* LEFT — copy + CTAs */}
          <div className="flex flex-col">
            <span className="inline-flex h-[34px] w-fit items-center gap-2 rounded-full border border-[rgba(167,73,197,0.45)] bg-[rgba(146,40,218,0.12)] px-[17px] text-[13px] font-semibold uppercase tracking-[0.12em] text-[#D9CBF2]">
              <SnowflakeIcon className="h-[14px] w-[14px] text-polar-snow" />
              Cócteles granizados
            </span>

            <h1 className="mt-5 font-display text-[64px] font-extrabold uppercase leading-[0.98] tracking-[-0.02em] text-white sm:text-[68px] lg:text-[72px]">
              Que rico
              <br />
              <span className="text-polar-purple">Es-coger</span>
            </h1>

            <p className="mt-5 max-w-[360px] text-[16px] leading-relaxed text-[#C8C2D6]">
              Cócteles granizados con una explosión de frescura. 12 sabores
              diferentes y 8 combinaciones únicas para todos los gustos.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-4">
              <a
                href={whatsappUrl(ORDER_MESSAGE)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-brand h-[50px] px-6"
              >
                <WhatsAppIcon className="h-[18px] w-[18px]" />
                ¡Pide ya tu domicilio!
              </a>
              <Link href="#menu" className="btn-ghost h-[50px] px-6">
                Ver menú
              </Link>
            </div>
          </div>

          {/* RIGHT — cup cluster floating in a CSS "purple spray": a multi-tone
              bloom plus defocused bokeh specks that recreate the studio backdrop
              from the source photo so the transparent cluster merges into it. The
              inner wrapper enlarges the cluster and pulls it toward the centre. */}
          <div className="relative hidden lg:block">
            <div className="relative w-[112%] -translate-x-[28%] -translate-y-[2%]">
              {/* Purple spray backdrop behind the cups */}
              <div
                className="pointer-events-none absolute left-1/2 top-[40%] h-[660px] w-[700px] -translate-x-1/2 -translate-y-1/2"
                aria-hidden="true"
              >
                {/* Multi-range purple bloom */}
                <div className="hero-spray" />
                {/* Out-of-focus light specks scattered through the haze */}
                <div className="hero-bokeh" />
                {/* Brighter magenta core directly behind the cups */}
                <div
                  className="absolute left-1/2 top-[40%] h-[300px] w-[330px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-90"
                  style={{
                    background:
                      "radial-gradient(circle,#D24AEB 0%,#9128DA 45%,transparent 72%)",
                    filter: "blur(55px)",
                  }}
                />
              </div>
              <Image
                src={heroImage}
                alt="Cuatro cócteles granizados Polar sobre pedestales morados"
                priority
                placeholder="blur"
                sizes="(min-width: 1024px) 60vw, 100vw"
                className="relative h-auto w-full select-none"
              />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
