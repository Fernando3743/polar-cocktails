import Link from "next/link";
import { Container } from "@/components/ui/Container";
import {
  PlaceholderCup,
  SnowflakeIcon,
  WhatsAppIcon,
} from "@/components/icons";
import { whatsappUrl } from "@/lib/config";

const ORDER_MESSAGE =
  "¡Hola Polar! Quiero pedir un domicilio de cócteles granizados.";

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-11 pb-10">
      {/* Ambient purple bloom spanning the hero (sits behind the content) */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div
          className="absolute right-[6%] top-[6%] h-[620px] w-[760px] rounded-full opacity-60"
          style={{
            background:
              "radial-gradient(circle,#5C109B 0%,#2A0F52 42%,transparent 70%)",
            filter: "blur(100px)",
          }}
        />
      </div>
      <Container className="relative z-10">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          {/* LEFT — copy + CTAs */}
          <div className="flex flex-col">
            <span className="inline-flex h-[34px] w-fit items-center gap-2 rounded-full border border-[rgba(167,73,197,0.45)] bg-[rgba(146,40,218,0.12)] px-[17px] text-[13px] font-semibold uppercase tracking-[0.12em] text-[#D9CBF2]">
              <SnowflakeIcon className="h-[14px] w-[14px] text-polar-snow" />
              Cócteles granizados
            </span>

            <h1 className="mt-6 font-display text-[64px] font-extrabold uppercase leading-[0.98] tracking-[-0.02em] text-white sm:text-[68px] lg:text-[72px]">
              Que rico
              <br />
              Es-coger
            </h1>

            <p className="mt-6 max-w-[420px] text-[16px] leading-relaxed text-[#C8C2D6]">
              Cócteles granizados con una explosión de frescura. 12 sabores
              diferentes y 8 combinaciones únicas para todos los gustos.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
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

          {/* RIGHT — glow + cup cluster on pedestals */}
          <div className="relative hidden min-h-[480px] lg:block">
            {/* Big ambient bloom */}
            <div
              className="hero-glow left-[52%] top-[46%] h-[560px] w-[640px] -translate-x-1/2 -translate-y-1/2 opacity-90"
              aria-hidden="true"
            />
            {/* Intense magenta core */}
            <div
              className="absolute left-[52%] top-[42%] h-[320px] w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-80"
              style={{
                background:
                  "radial-gradient(circle,#B231CA 0%,#9128DA 45%,transparent 72%)",
                filter: "blur(64px)",
              }}
              aria-hidden="true"
            />

            {/* Pedestal blocks */}
            <div
              className="absolute bottom-[46px] left-[6%] h-[28px] w-[150px] rounded-[6px]"
              style={{
                background: "linear-gradient(180deg,#3a1366 0%,#23093f 100%)",
                boxShadow: "0 16px 34px rgba(0,0,0,0.5)",
              }}
              aria-hidden="true"
            />
            <div
              className="absolute bottom-[92px] left-1/2 h-[30px] w-[164px] -translate-x-1/2 rounded-[6px]"
              style={{
                background: "linear-gradient(180deg,#491880 0%,#2a0f52 100%)",
                boxShadow: "0 18px 38px rgba(0,0,0,0.55)",
              }}
              aria-hidden="true"
            />
            <div
              className="absolute bottom-[16px] right-[4%] h-[28px] w-[150px] rounded-[6px]"
              style={{
                background: "linear-gradient(180deg,#3a1366 0%,#23093f 100%)",
                boxShadow: "0 16px 34px rgba(0,0,0,0.5)",
              }}
              aria-hidden="true"
            />

            {/* Cups */}
            <PlaceholderCup
              accentColor="#7B2FB0"
              className="absolute bottom-[66px] left-[4%] h-[262px] w-auto drop-shadow-[0_20px_40px_rgba(0,0,0,0.5)]"
            />
            <PlaceholderCup
              accentColor="#E0A52E"
              className="absolute bottom-[116px] left-1/2 h-[300px] w-auto -translate-x-1/2 drop-shadow-[0_24px_46px_rgba(0,0,0,0.55)]"
            />
            <PlaceholderCup
              accentColor="#3FB58A"
              className="absolute bottom-[36px] right-[2%] h-[252px] w-auto drop-shadow-[0_20px_40px_rgba(0,0,0,0.5)]"
            />
          </div>
        </div>
      </Container>
    </section>
  );
}
