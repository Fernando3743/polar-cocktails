import { Container } from "@/components/ui/Container";
import {
  ArrowRightIcon,
  MapPinIcon,
  PhoneIcon,
  ScooterIcon,
} from "@/components/icons";
import { ADDRESS_LINES, MAPS_URL, whatsappUrl } from "@/lib/config";

const ctaClass =
  "mt-2 inline-flex items-center gap-1.5 text-[14px] font-semibold text-polar-magenta transition-colors hover:text-polar-purple-light";

const DELIVERY_MESSAGE =
  "¡Hola Polar! Quiero pedir un domicilio de cócteles granizados.";
const CONTACT_MESSAGE =
  "¡Hola Polar! Tengo una duda / quiero hacer un pedido especial.";

export function InfoRow() {
  return (
    <section className="py-7">
      <Container>
        <div className="grid gap-9 sm:grid-cols-3">
          {/* Domicilio */}
          <div id="domicilio" className="flex items-start gap-4">
            <span className="icon-chip shrink-0">
              <ScooterIcon className="h-6 w-6" />
            </span>
            <div className="flex flex-col">
              <h3 className="font-display text-[18px] font-semibold text-white">
                ¡Pide ya tu domicilio!
              </h3>
              <p className="mt-1 max-w-[240px] text-[14px] leading-relaxed text-polar-muted">
                Llevamos la frescura hasta la puerta de tu casa.
              </p>
              <a
                href={whatsappUrl(DELIVERY_MESSAGE)}
                target="_blank"
                rel="noopener noreferrer"
                className={ctaClass}
              >
                Pedir ahora
                <ArrowRightIcon className="h-[14px] w-[14px]" />
              </a>
            </div>
          </div>

          {/* Ubicación */}
          <div id="ubicacion" className="flex items-start gap-4">
            <span className="icon-chip shrink-0">
              <MapPinIcon className="h-6 w-6" />
            </span>
            <div className="flex flex-col">
              <h3 className="font-display text-[18px] font-semibold text-white">
                Visítanos
              </h3>
              <p className="mt-1 max-w-[240px] text-[14px] leading-relaxed text-polar-muted">
                {ADDRESS_LINES.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </p>
              <a
                href={MAPS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={ctaClass}
              >
                Ver en mapa
                <ArrowRightIcon className="h-[14px] w-[14px]" />
              </a>
            </div>
          </div>

          {/* Contacto */}
          <div id="contacto" className="flex items-start gap-4">
            <span className="icon-chip shrink-0">
              <PhoneIcon className="h-6 w-6" />
            </span>
            <div className="flex flex-col">
              <h3 className="font-display text-[18px] font-semibold text-white">
                Contáctanos
              </h3>
              <p className="mt-1 max-w-[240px] text-[14px] leading-relaxed text-polar-muted">
                ¿Tienes dudas o quieres hacer un pedido especial?
              </p>
              <a
                href={whatsappUrl(CONTACT_MESSAGE)}
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
