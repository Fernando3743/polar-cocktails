import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { SnowflakeIcon, WhatsAppIcon } from "@/components/icons";
import { whatsappUrl } from "@/lib/config";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Pedido confirmado — Polar",
};

export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const message = `Hola Polar, acabo de hacer un pedido. Mi número de pedido es ${id}.`;

  return (
    <div className="py-16 sm:py-24">
      <Container>
        <div className="glass-card mx-auto flex max-w-[560px] flex-col items-center gap-6 px-6 py-12 text-center sm:px-10">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(146,40,218,0.18)] text-polar-snow shadow-[0_0_40px_rgba(178,49,202,0.35)]">
            <SnowflakeIcon className="h-8 w-8" />
          </span>

          <div className="flex flex-col gap-2">
            <p className="eyebrow">Pedido recibido</p>
            <h1 className="font-display text-3xl font-700 text-polar-text sm:text-4xl">
              ¡Gracias por tu <span className="text-polar-magenta">pedido</span>!
            </h1>
          </div>

          <p className="max-w-[420px] text-base leading-relaxed text-polar-muted">
            Hemos recibido tu pedido y lo estamos preparando. Te contactaremos
            por WhatsApp para confirmar los detalles de entrega.
          </p>

          <div className="w-full rounded-2xl border border-[rgba(167,73,197,0.2)] bg-[rgba(25,3,75,0.3)] px-5 py-4">
            <p className="text-xs uppercase tracking-[0.14em] text-polar-dim">
              Número de pedido
            </p>
            <p className="mt-1 break-all font-display text-lg font-600 text-polar-text">
              {id}
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
            <a
              href={whatsappUrl(message)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-brand w-full sm:w-auto"
            >
              <WhatsAppIcon className="h-[18px] w-[18px]" />
              Confirmar por WhatsApp
            </a>
            <Link href="/menu" className="btn-ghost w-full sm:w-auto">
              Seguir comprando
            </Link>
          </div>

          <Link
            href="/"
            className="text-sm text-polar-muted transition-colors hover:text-polar-text"
          >
            Volver al inicio
          </Link>
        </div>
      </Container>
    </div>
  );
}
