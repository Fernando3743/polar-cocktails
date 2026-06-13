import { Container } from "@/components/ui/Container";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Pagar",
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return (
    <div className="py-12 sm:py-16">
      <Container>
        <div className="mx-auto max-w-[680px]">
          <p className="eyebrow">Finaliza tu pedido</p>
          <h1 className="mt-3 font-display text-3xl font-700 text-polar-text sm:text-4xl">
            Datos de <span className="text-polar-magenta">entrega</span>
          </h1>
          <p className="mt-3 text-base leading-relaxed text-polar-muted">
            Revisa tu carrito y completa tus datos. Confirmamos tu pedido por
            WhatsApp.
          </p>

          <div className="mt-8">
            <CheckoutForm />
          </div>
        </div>
      </Container>
    </div>
  );
}
