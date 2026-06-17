import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Snowfall } from "@/components/layout/Snowfall";
import {
  ArrowRightIcon,
  FacebookIcon,
  InstagramIcon,
  MapPinIcon,
  PhoneIcon,
  ScooterIcon,
  TikTokIcon,
  WhatsAppIcon,
} from "@/components/icons";
import { SITE_NAME, isPlaceholderWhatsapp, whatsappUrl } from "@/lib/config";
import { pageMetadata } from "@/lib/seo";
import { getShopSettings } from "@/lib/queries/site";
import type { OpeningHour } from "@/lib/types";

const CONTACT_DESCRIPTION =
  "Habla con Polar para pedidos, domicilios y visitas en Tuluá. Escríbenos por WhatsApp o encuentra nuestra ubicación.";

const CONTACT_MESSAGE =
  "¡Hola Polar! Tengo una duda y quiero hablar con ustedes.";

const DELIVERY_MESSAGE =
  "¡Hola Polar! Quiero pedir un domicilio de cócteles granizados.";

const SPECIAL_ORDER_MESSAGE =
  "¡Hola Polar! Quiero cotizar un pedido especial.";

export const metadata = pageMetadata({
  title: "Contacto",
  socialTitle: "Contacto — Polar",
  description: CONTACT_DESCRIPTION,
  path: "/contacto",
});

function formatPhone(number: string): string {
  if (number.length === 12 && number.startsWith("57")) {
    return `+57 ${number.slice(2, 5)} ${number.slice(5, 8)} ${number.slice(8)}`;
  }

  return number;
}

function HoursList({ hours }: { hours: OpeningHour[] }) {
  if (hours.length === 0) {
    return (
      <p className="mt-3 max-w-[360px] text-sm leading-relaxed text-polar-muted">
        Consulta disponibilidad, horarios de atención y cobertura de domicilio
        directamente por WhatsApp.
      </p>
    );
  }

  return (
    <dl className="mt-4 grid gap-2 text-sm text-polar-muted">
      {hours.map((hour) => (
        <div
          key={`${hour.label}-${hour.value}`}
          className="flex items-start justify-between gap-4 border-b border-white/10 pb-2 last:border-b-0 last:pb-0"
        >
          <dt className="text-polar-text">{hour.label}</dt>
          <dd className="text-right">{hour.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export default async function ContactPage() {
  const settings = await getShopSettings();
  const addressText = settings.addressLines.join(", ");
  // While the WhatsApp number is still the placeholder, never show a formatted
  // phone label or wire a dialable WhatsApp CTA (a fake number must not be shown
  // or dialed). Map/location CTAs are unaffected.
  const whatsappPending = isPlaceholderWhatsapp(settings.whatsappNumber);
  const phoneLabel = formatPhone(settings.whatsappNumber);
  const socialLinks = [
    {
      label: "Instagram",
      href: settings.socialLinks.instagram,
      icon: InstagramIcon,
    },
    { label: "Facebook", href: settings.socialLinks.facebook, icon: FacebookIcon },
    { label: "TikTok", href: settings.socialLinks.tiktok, icon: TikTokIcon },
  ].filter((link) => link.href && link.href !== "#");

  return (
    <>
      <Snowfall />
      <div className="relative z-10 overflow-hidden pt-10 pb-16 sm:pt-14 sm:pb-24">
        <Container>
          <section className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <p className="eyebrow">Contacto</p>
              <h1 className="mt-3 max-w-[700px] font-display text-4xl font-800 uppercase leading-[1.05] text-polar-text sm:text-5xl lg:text-6xl">
                Hablemos de tu próximo{" "}
                <span className="text-polar-magenta">Polar</span>
              </h1>
              <p className="mt-5 max-w-[560px] text-base leading-relaxed text-polar-muted sm:text-lg">
                Escríbenos para domicilios, pedidos especiales, dudas sobre
                sabores o indicaciones para visitarnos en Tuluá.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                {whatsappPending ? (
                  <span
                    aria-disabled="true"
                    className="btn-brand cursor-not-allowed opacity-60"
                  >
                    <WhatsAppIcon className="h-5 w-5" />
                    WhatsApp disponible pronto
                  </span>
                ) : (
                  <a
                    href={whatsappUrl(CONTACT_MESSAGE, settings.whatsappNumber)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-brand"
                  >
                    <WhatsAppIcon className="h-5 w-5" />
                    Escribir por WhatsApp
                  </a>
                )}
                <a
                  href={settings.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost"
                >
                  <MapPinIcon className="h-5 w-auto" />
                  Ver ubicación
                </a>
              </div>
            </div>

            <div className="glass-card px-6 py-6 sm:px-8 sm:py-8">
              <div className="flex items-start gap-4">
                <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-polar-magenta">
                  <PhoneIcon className="h-8 w-auto" />
                </span>
                <div>
                  <h2 className="font-display text-2xl font-semibold text-white">
                    Atención directa
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-polar-muted">
                    Nuestro canal principal es WhatsApp. Te ayudamos a elegir
                    sabores, confirmar disponibilidad y coordinar tu pedido.
                  </p>
                  {whatsappPending ? (
                    <p className="mt-5 text-sm font-semibold text-polar-muted">
                      Habilitaremos nuestro WhatsApp muy pronto.
                    </p>
                  ) : (
                    <a
                      href={whatsappUrl(CONTACT_MESSAGE, settings.whatsappNumber)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link-accent mt-5 gap-2"
                    >
                      {phoneLabel}
                      <ArrowRightIcon className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="mt-12 grid gap-5 md:grid-cols-3">
            <article className="glass-card px-6 py-6">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-polar-magenta">
                <ScooterIcon className="h-8 w-auto" />
              </span>
              <h2 className="mt-5 font-display text-xl font-semibold text-white">
                Domicilios
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-polar-muted">
                Pide tus cócteles granizados y confirma cobertura, tiempos de
                entrega y forma de pago por WhatsApp.
              </p>
              {whatsappPending ? (
                <p className="mt-5 text-sm font-semibold text-polar-muted">
                  Disponible pronto por WhatsApp.
                </p>
              ) : (
                <a
                  href={whatsappUrl(DELIVERY_MESSAGE, settings.whatsappNumber)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-accent mt-5 gap-2"
                >
                  Pedir domicilio
                  <ArrowRightIcon className="h-4 w-4" />
                </a>
              )}
            </article>

            <article className="glass-card px-6 py-6">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-polar-magenta">
                <MapPinIcon className="h-8 w-auto" />
              </span>
              <h2 className="mt-5 font-display text-xl font-semibold text-white">
                Visítanos
              </h2>
              <address className="mt-3 text-sm not-italic leading-relaxed text-polar-muted">
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
                aria-label={`Ver ubicación de ${SITE_NAME}: ${addressText}`}
                className="link-accent mt-5 gap-2"
              >
                Abrir mapa
                <ArrowRightIcon className="h-4 w-4" />
              </a>
            </article>

            <article className="glass-card px-6 py-6">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-polar-magenta">
                <WhatsAppIcon className="h-7 w-7" />
              </span>
              <h2 className="mt-5 font-display text-xl font-semibold text-white">
                Pedidos especiales
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-polar-muted">
                Cuéntanos la ocasión, cantidad estimada y sabores que tienes en
                mente para orientarte con una cotización.
              </p>
              {whatsappPending ? (
                <p className="mt-5 text-sm font-semibold text-polar-muted">
                  Disponible pronto por WhatsApp.
                </p>
              ) : (
                <a
                  href={whatsappUrl(
                    SPECIAL_ORDER_MESSAGE,
                    settings.whatsappNumber,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-accent mt-5 gap-2"
                >
                  Cotizar pedido
                  <ArrowRightIcon className="h-4 w-4" />
                </a>
              )}
            </article>
          </section>

          <section className="mt-8 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="glass-card px-6 py-6 sm:px-8">
              <p className="eyebrow">Horarios</p>
              <h2 className="mt-3 font-display text-2xl font-semibold text-white">
                Planea tu visita
              </h2>
              <HoursList hours={settings.openingHours} />
            </div>

            <div className="glass-card px-6 py-6 sm:px-8">
              <p className="eyebrow">Síguenos</p>
              <h2 className="mt-3 font-display text-2xl font-semibold text-white">
                Más Polar en redes
              </h2>
              <p className="mt-3 max-w-[520px] text-sm leading-relaxed text-polar-muted">
                Revisa novedades, sabores disponibles y contenido del día en
                nuestras redes sociales.
              </p>
              {socialLinks.length > 0 ? (
                <div className="mt-5 flex flex-wrap gap-3">
                  {socialLinks.map(({ href, icon: Icon, label }) => (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-ghost h-11 px-4"
                    >
                      <Icon className="h-5 w-5" />
                      {label}
                    </a>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-polar-muted">
                  Pregúntanos por WhatsApp cuáles son nuestros canales activos.
                </p>
              )}
            </div>
          </section>

          <section className="mt-10 flex flex-col items-start justify-between gap-5 border-t border-white/10 pt-8 sm:flex-row sm:items-center">
            <div>
              <p className="eyebrow">Carta completa</p>
              <h2 className="mt-3 font-display text-2xl font-semibold text-white">
                Mira los sabores antes de escribirnos
              </h2>
            </div>
            <Link href="/menu" className="btn-outline-rect">
              Ver menú
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </section>
        </Container>
      </div>
    </>
  );
}
