import { Container } from "@/components/ui/Container";
import {
  ArrowRightIcon,
  MapPinIcon,
  PhoneIcon,
  ScooterIcon,
} from "@/components/icons";
import { ADDRESS_LINES, MAPS_URL, whatsappUrl } from "@/lib/config";
import type { OpeningHour } from "@/lib/types";

const ctaClass =
  "mt-[9px] inline-flex items-center gap-1.5 text-[14px] font-semibold text-polar-magenta transition-colors hover:text-polar-purple-light";

const DELIVERY_MESSAGE =
  "¡Hola Polar! Quiero pedir un domicilio de cócteles granizados.";
const CONTACT_MESSAGE =
  "¡Hola Polar! Tengo una duda / quiero hacer un pedido especial.";

interface InfoRowProps {
  addressLines?: string[];
  mapsUrl?: string;
  openingHours?: OpeningHour[];
  whatsappNumber?: string;
}

export function InfoRow({
  addressLines,
  mapsUrl,
  openingHours,
  whatsappNumber,
}: InfoRowProps) {
  // Fall back to the static config constants so demo mode and the
  // pre-migration build keep rendering identically to the prototype.
  const resolvedAddress =
    addressLines && addressLines.length > 0 ? addressLines : ADDRESS_LINES;
  const resolvedMapsUrl = mapsUrl || MAPS_URL;
  const hours = openingHours ?? [];

  return (
    <section className="pt-[24px] pb-0">
      <Container>
        <div className="glass-card grid gap-6 px-[30px] pt-[18px] pb-[19px] sm:min-h-[141px] sm:grid-cols-3 sm:gap-0">
          <div id="domicilio" className="flex items-start gap-[23px]">
            <span className="mt-[1px] inline-flex shrink-0">
              <ScooterIcon className="h-[41px] w-auto" />
            </span>
            <div className="flex flex-col">
              <h3 className="font-display text-[18px] font-semibold text-white">
                ¡Pide ya tu domicilio!
              </h3>
              <p className="mt-[7px] max-w-[200px] text-[13px] leading-[1.38] text-[#B9B2C6]">
                Llevamos la frescura hasta la puerta de tu casa.
              </p>
              <a
                href={whatsappUrl(DELIVERY_MESSAGE, whatsappNumber)}
                target="_blank"
                rel="noopener noreferrer"
                className={ctaClass}
              >
                Pedir ahora
                <ArrowRightIcon className="h-[14px] w-[14px]" />
              </a>
            </div>
          </div>

          <div
            id="ubicacion"
            className="flex items-start gap-[23px] border-y border-[rgba(255,255,255,0.22)] py-6 sm:border-x sm:border-y-0 sm:px-[30px] sm:py-0"
          >
            <span className="mt-[1px] inline-flex shrink-0">
              <MapPinIcon className="h-[43px] w-auto" />
            </span>
            <div className="flex flex-col">
              <h3 className="font-display text-[18px] font-semibold text-white">
                Visítanos
              </h3>
              <p className="mt-[7px] max-w-[210px] text-[13px] leading-[1.38] text-[#B9B2C6]">
                {resolvedAddress.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </p>
              {hours.length > 0 && (
                <dl className="mt-[7px] max-w-[210px] text-[12px] leading-[1.4] text-polar-dim">
                  {hours.map((h) => (
                    <div
                      key={`${h.label}-${h.value}`}
                      className="flex justify-between gap-2"
                    >
                      <dt>{h.label}</dt>
                      <dd className="text-right text-[#B9B2C6]">{h.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
              <a
                href={resolvedMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={ctaClass}
              >
                Ver en mapa
                <ArrowRightIcon className="h-[14px] w-[14px]" />
              </a>
            </div>
          </div>

          <div id="contacto" className="flex items-start gap-[27px] sm:pl-[30px]">
            <span className="mt-[1px] inline-flex shrink-0">
              <PhoneIcon className="h-[43px] w-auto" />
            </span>
            <div className="flex flex-col">
              <h3 className="font-display text-[18px] font-semibold text-white">
                Contáctanos
              </h3>
              <p className="mt-[7px] max-w-[220px] text-[13px] leading-[1.38] text-[#B9B2C6]">
                ¿Tienes dudas o quieres hacer un pedido especial?
              </p>
              <a
                href={whatsappUrl(CONTACT_MESSAGE, whatsappNumber)}
                target="_blank"
                rel="noopener noreferrer"
                className={ctaClass}
              >
                Escríbenos
                <ArrowRightIcon className="h-[14px] w-[14px]" />
              </a>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
