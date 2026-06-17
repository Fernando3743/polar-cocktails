import Image from "next/image";
import Link from "next/link";
import { Snowfall } from "@/components/layout/Snowfall";
import { Container } from "@/components/ui/Container";
import {
  ArrowRightIcon,
  CupIcon,
  MapPinIcon,
  SnowflakeIcon,
} from "@/components/icons";
import { pageMetadata } from "@/lib/seo";

const NOSOTROS_DESCRIPTION =
  "Conoce Polar, el negocio local de Tuluá que prepara cócteles granizados frescos, coloridos y listos para compartir.";

const VALUES = [
  {
    title: "Frescura al momento",
    description:
      "Cada granizado se arma para que llegue con textura, color y ese golpe frío que hace diferente la experiencia Polar.",
    Icon: SnowflakeIcon,
  },
  {
    title: "Sabores para elegir",
    description:
      "Trabajamos combinaciones frutales, tropicales, clásicas y especiales para que cada pedido tenga su propio estilo.",
    Icon: CupIcon,
  },
  {
    title: "Hecho en Tuluá",
    description:
      "Somos una marca local: atendemos con cercanía, cuidamos el detalle y llevamos la frescura hasta tu puerta.",
    Icon: MapPinIcon,
  },
];

const STEPS = [
  "Elige tus sabores favoritos en la carta.",
  "Confirma disponibilidad y domicilio por WhatsApp.",
  "Recibe tus cócteles granizados listos para disfrutar.",
];

export const metadata = pageMetadata({
  title: "Nosotros",
  socialTitle: "Nosotros — Polar",
  description: NOSOTROS_DESCRIPTION,
  path: "/nosotros",
});

export default function NosotrosPage() {
  return (
    <>
      <Snowfall />
      <div className="relative z-10 overflow-hidden pt-10 pb-16 sm:pt-14 sm:pb-24">
        <Container>
          <section className="grid items-center gap-10 lg:grid-cols-[0.96fr_1.04fr]">
            <div>
              <p className="eyebrow">Nosotros</p>
              <h1 className="mt-3 max-w-[720px] font-display text-4xl font-800 leading-[1.05] text-polar-text uppercase sm:text-5xl lg:text-6xl">
                La frescura que nos{" "}
                <span className="text-polar-magenta">distingue</span>
              </h1>
              <p className="mt-5 max-w-[570px] text-base leading-relaxed text-polar-muted sm:text-lg">
                En Polar convertimos los cócteles granizados en un momento
                frío, intenso y fácil de compartir. Nacimos en Tuluá para
                preparar sabores con personalidad, atención cercana y pedidos
                sin vueltas.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/menu" className="btn-brand">
                  Ver menú
                  <ArrowRightIcon className="h-4 w-4" />
                </Link>
                <Link href="/contacto" className="btn-ghost">
                  Contáctanos
                  <ArrowRightIcon className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="relative min-h-[320px] sm:min-h-[400px]">
              <div
                className="absolute inset-x-[8%] top-[8%] h-[72%] rounded-full bg-[radial-gradient(circle,rgba(178,49,202,0.38)_0%,rgba(145,40,218,0.18)_42%,transparent_72%)] blur-2xl"
                aria-hidden="true"
              />
              <div className="relative mx-auto max-w-[560px] pt-8">
                <div className="relative aspect-[1.25] overflow-hidden rounded-lg border border-white/10 bg-[#090712] shadow-[0_0_44px_rgba(178,49,202,0.24)]">
                  <Image
                    src="/images/polarheroimage.png"
                    alt="Cócteles granizados Polar en vasos de colores"
                    fill
                    priority
                    sizes="(min-width: 1024px) 560px, 90vw"
                    className="object-cover object-center"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="mt-12 grid gap-5 md:grid-cols-3">
            {VALUES.map(({ title, description, Icon }) => (
              <article key={title} className="glass-card px-6 py-6">
                <span className="icon-chip">
                  <Icon className="h-[28px] w-[28px]" />
                </span>
                <h2 className="mt-5 font-display text-xl font-semibold text-white">
                  {title}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-[#B9B2C6]">
                  {description}
                </p>
              </article>
            ))}
          </section>

          <section className="mt-8 grid gap-5 lg:grid-cols-[0.92fr_1.08fr]">
            <div className="glass-card px-6 py-6 sm:px-8">
              <p className="eyebrow">Cómo trabajamos</p>
              <h2 className="mt-3 font-display text-2xl font-semibold text-white">
                Simple, fresco y directo
              </h2>
              <ol className="mt-5 grid gap-4">
                {STEPS.map((step, index) => (
                  <li key={step} className="flex gap-4">
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-polar-purple text-sm font-bold text-white">
                      {index + 1}
                    </span>
                    <p className="pt-1 text-sm leading-relaxed text-polar-muted">
                      {step}
                    </p>
                  </li>
                ))}
              </ol>
            </div>

            <div className="glass-card px-6 py-6 sm:px-8">
              <p className="eyebrow">Nuestra promesa</p>
              <h2 className="mt-3 font-display text-2xl font-semibold text-white">
                Cócteles granizados para todos los gustos
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-polar-muted sm:text-base">
                Cuidamos la presentación, el balance de sabor y la atención para
                que cada vaso se sienta especial, ya sea para una visita rápida,
                un domicilio o un pedido para compartir.
              </p>
              <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row">
                <Link href="/ubicacion" className="btn-outline-rect h-11 px-5">
                  Ubicación
                  <ArrowRightIcon className="h-4 w-4" />
                </Link>
                <Link href="/contacto" className="btn-outline-rect h-11 px-5">
                  Contacto
                  <ArrowRightIcon className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </section>
        </Container>
      </div>
    </>
  );
}
