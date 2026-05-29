import { Container } from "@/components/ui/Container";
import { MapPinIcon, PhoneIcon, ScooterIcon } from "@/components/icons";
import { ADDRESS_LINES, MAPS_URL, whatsappUrl } from "@/lib/config";

const DELIVERY_MESSAGE =
  "¡Hola Polar! Quiero pedir un domicilio de cócteles granizados.";
const CONTACT_MESSAGE =
  "¡Hola Polar! Tengo una duda / quiero hacer un pedido especial.";

export function InfoRow() {
  return (
    <section className="pt-12 pb-12">
      <Container>
        <div className="grid gap-9 sm:grid-cols-3">
          {/* Domicilio */}
          <div id="domicilio" className="flex flex-col">
            <span className="icon-chip">
              <ScooterIcon className="h-6 w-6" />
            </span>
            <h3 className="mt-4 font-display text-[18px] font-semibold text-white">
              ¡Pide ya tu domicilio!
            </h3>
            <p className="mt-2 text-[14px] leading-relaxed text-polar-muted">
              Llevamos la frescura hasta la puerta de tu casa.
            </p>
            <a
              href={whatsappUrl(DELIVERY_MESSAGE)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 text-[14px] font-semibold text-polar-magenta transition-colors hover:text-polar-purple-light"
            >
              Pedir ahora
            </a>
          </div>

          {/* Ubicación */}
          <div id="ubicacion" className="flex flex-col">
            <span className="icon-chip">
              <MapPinIcon className="h-6 w-6" />
            </span>
            <h3 className="mt-4 font-display text-[18px] font-semibold text-white">
              Visítanos
            </h3>
            <p className="mt-2 text-[14px] leading-relaxed text-polar-muted">
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
              className="mt-3 text-[14px] font-semibold text-polar-magenta transition-colors hover:text-polar-purple-light"
            >
              Ver en mapa
            </a>
          </div>

          {/* Contacto */}
          <div id="contacto" className="flex flex-col">
            <span className="icon-chip">
              <PhoneIcon className="h-6 w-6" />
            </span>
            <h3 className="mt-4 font-display text-[18px] font-semibold text-white">
              Contáctanos
            </h3>
            <p className="mt-2 text-[14px] leading-relaxed text-polar-muted">
              ¿Tienes dudas o quieres hacer un pedido especial?
            </p>
            <a
              href={whatsappUrl(CONTACT_MESSAGE)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 text-[14px] font-semibold text-polar-magenta transition-colors hover:text-polar-purple-light"
            >
              Escríbenos
            </a>
          </div>
        </div>
      </Container>
    </section>
  );
}
