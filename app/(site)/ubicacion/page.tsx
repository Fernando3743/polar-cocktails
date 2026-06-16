import type { Metadata } from "next";
import Image from "next/image";
import { Snowfall } from "@/components/layout/Snowfall";
import { ArrowRightIcon, MapPinIcon, PhoneIcon } from "@/components/icons";
import { Container } from "@/components/ui/Container";
import { getShopSettings } from "@/lib/queries/site";
import { SITE_NAME, whatsappUrl } from "@/lib/config";

const LOCATION_DESCRIPTION =
  "Encuentra Polar en Tuluá y llega por Google Maps por tus cócteles granizados favoritos.";

const VISIT_MESSAGE =
  "¡Hola Polar! Quiero confirmar la ubicación y el horario para visitarlos.";

export const metadata: Metadata = {
  title: "Ubicación de Polar en Tuluá",
  description: LOCATION_DESCRIPTION,
  alternates: { canonical: "/ubicacion" },
  openGraph: {
    title: "Ubicación — Polar",
    description: LOCATION_DESCRIPTION,
    url: "/ubicacion",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "Polar — Cócteles Granizados en Tuluá",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ubicación — Polar",
    description: LOCATION_DESCRIPTION,
    images: [
      {
        url: "/twitter-image.png",
        alt: "Polar — Cócteles Granizados en Tuluá",
      },
    ],
  },
};

export default async function UbicacionPage() {
  const settings = await getShopSettings();
  const [city = "Tuluá", ...streetLines] = settings.addressLines;
  const addressText = settings.addressLines.join(", ");

  return (
    <>
      <Snowfall />
      <div className="relative z-10 overflow-hidden pt-10 pb-16 sm:pt-14 sm:pb-20">
        <Container>
          <section className="grid items-center gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:gap-10">
            <div className="max-w-[560px]">
              <p className="eyebrow">Visítanos</p>
              <h1 className="mt-3 font-display text-4xl leading-[1.05] font-800 text-balance text-polar-text uppercase sm:text-5xl lg:text-6xl">
                Estamos en{" "}
                <span className="text-polar-magenta">{city}</span>
              </h1>
              <p className="mt-5 max-w-[500px] text-base leading-relaxed text-polar-muted sm:text-lg">
                Pasa por tus cócteles granizados favoritos, recoge tu pedido o
                escríbenos antes de venir para confirmar disponibilidad y
                horario.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <a
                  href={settings.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-brand"
                >
                  Cómo llegar
                  <ArrowRightIcon className="h-4 w-4" />
                </a>
                <a
                  href={whatsappUrl(VISIT_MESSAGE, settings.whatsappNumber)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost"
                >
                  Confirmar por WhatsApp
                  <ArrowRightIcon className="h-4 w-4" />
                </a>
              </div>
            </div>

            <div className="glass-card relative min-h-[320px] overflow-hidden px-6 py-7 sm:min-h-[420px] sm:px-8 sm:py-8">
              <div
                className="absolute inset-0 bg-[radial-gradient(circle_at_70%_18%,rgba(178,49,202,0.24),transparent_34%),linear-gradient(135deg,rgba(13,5,44,0.82),rgba(4,5,18,0.94))]"
                aria-hidden="true"
              />
              <div
                className="absolute inset-x-8 top-1/2 h-px bg-[linear-gradient(90deg,transparent,rgba(184,77,255,0.7),transparent)]"
                aria-hidden="true"
              />
              <div className="absolute top-[76px] right-[52px] hidden w-[150px] sm:block lg:top-[68px] lg:right-[70px] lg:w-[166px]">
                <div
                  className="absolute inset-x-[-22%] top-[18%] h-[72%] rounded-full bg-[radial-gradient(circle,rgba(56,216,242,0.26)_0%,rgba(178,49,202,0.22)_44%,transparent_72%)] blur-xl"
                  aria-hidden="true"
                />
                <Image
                  src="/images/polar-cocktail-product-transparent-trimmed.png"
                  alt="Cóctel granizado Polar azul"
                  width={734}
                  height={1195}
                  sizes="(min-width: 1024px) 166px, 150px"
                  className="relative h-auto w-full drop-shadow-[0_0_28px_rgba(56,216,242,0.34)]"
                />
              </div>

              <div className="relative flex min-h-[260px] flex-col justify-between sm:min-h-[356px]">
                <div className="flex items-start justify-between gap-5">
                  <div>
                    <p className="eyebrow">Punto Polar</p>
                    <h2 className="mt-3 max-w-[360px] font-display text-3xl font-semibold leading-tight text-white sm:max-w-[280px] sm:text-4xl">
                      Llega por tus granizados favoritos
                    </h2>
                  </div>
                  <span className="icon-chip shrink-0">
                    <MapPinIcon className="h-[34px] w-auto" />
                  </span>
                </div>

                <div className="max-w-[420px]">
                  <address className="text-base not-italic leading-relaxed text-[#D7D0E4]">
                    {settings.addressLines.map((line) => (
                      <span key={line} className="block">
                        {line}
                      </span>
                    ))}
                  </address>
                  <a
                    href={settings.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Abrir ruta de ${SITE_NAME}: ${addressText}`}
                    className="btn-outline-rect mt-6 h-11 px-5"
                  >
                    Abrir ruta en Maps
                    <ArrowRightIcon className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-8 grid gap-4 md:grid-cols-3">
            <article className="glass-card p-6">
              <span className="icon-chip">
                <MapPinIcon className="h-[34px] w-auto" />
              </span>
              <h2 className="mt-4 font-display text-xl font-semibold text-polar-text">
                Dirección
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-[#B9B2C6]">
                {streetLines.length > 0 ? (
                  streetLines.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))
                ) : (
                  <span className="block">{city}</span>
                )}
                {streetLines.length > 0 && (
                  <span className="block">{city}, Valle del Cauca</span>
                )}
              </p>
            </article>

            <article className="glass-card p-6">
              <span className="icon-chip">
                <PhoneIcon className="h-[34px] w-auto" />
              </span>
              <h2 className="mt-4 font-display text-xl font-semibold text-polar-text">
                Antes de venir
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-[#B9B2C6]">
                Si quieres separar sabores o confirmar disponibilidad, escríbenos
                por WhatsApp y te respondemos con los detalles.
              </p>
            </article>

            <article className="glass-card p-6">
              <span className="icon-chip">
                <MapPinIcon className="h-[34px] w-auto" />
              </span>
              <h2 className="mt-4 font-display text-xl font-semibold text-polar-text">
                Horario
              </h2>
              {settings.openingHours.length > 0 ? (
                <dl className="mt-3 space-y-2 text-sm leading-relaxed text-[#B9B2C6]">
                  {settings.openingHours.map((hour) => (
                    <div
                      key={`${hour.label}-${hour.value}`}
                      className="flex justify-between gap-4"
                    >
                      <dt className="text-polar-muted">{hour.label}</dt>
                      <dd className="text-right">{hour.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="mt-3 text-sm leading-relaxed text-[#B9B2C6]">
                  Escríbenos para confirmar el horario de atención del día.
                </p>
              )}
            </article>
          </section>
        </Container>
      </div>
    </>
  );
}
