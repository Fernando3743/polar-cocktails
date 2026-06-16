import { Container } from "@/components/ui/Container";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Pagar",
  robots: { index: false, follow: false },
};

const CHECKOUT_STEPS = [
  "Revisa sabores",
  "Completa tus datos",
  "Confirma por WhatsApp",
];

export default function CheckoutPage() {
  return (
    <div className="relative overflow-hidden px-0 pb-28 pt-10 sm:pb-16 sm:pt-14">
      <div
        className="pointer-events-none absolute left-[-160px] top-[120px] h-[320px] w-[320px] rounded-full bg-[rgba(64,196,255,0.12)] blur-[110px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute right-[-180px] top-[16px] h-[420px] w-[420px] rounded-full bg-[rgba(184,77,255,0.18)] blur-[130px]"
        aria-hidden="true"
      />
      <Container>
        <div className="relative mx-auto max-w-[1120px]">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_440px] lg:items-end">
            <div>
              <p className="eyebrow">Finaliza tu pedido</p>
              <h1 className="mt-3 max-w-[720px] font-display text-[34px] font-700 leading-[1.05] text-polar-text sm:text-[48px] lg:text-[56px]">
                Datos de <span className="text-polar-magenta">entrega</span>
              </h1>
              <p className="mt-4 max-w-[620px] text-[15px] leading-relaxed text-polar-muted sm:text-base">
                Revisa tus granizados, dinos cómo entregarlos y deja listo el
                pedido para confirmarlo por WhatsApp.
              </p>
            </div>

            <div className="grid gap-2 rounded-3xl border border-[rgba(177,93,255,0.18)] bg-[rgba(10,9,24,0.58)] p-3 shadow-[0_18px_50px_rgba(0,0,0,0.28)] sm:grid-cols-3">
              {CHECKOUT_STEPS.map((step, index) => (
                <div
                  key={step}
                  className="flex items-center gap-3 rounded-2xl px-3 py-2"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[rgba(177,93,255,0.32)] bg-[rgba(146,40,218,0.18)] text-sm font-700 text-polar-purple-light">
                    {index + 1}
                  </span>
                  <span className="text-sm font-600 text-[#E7E2F2]">
                    {step}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 lg:mt-10">
            <CheckoutForm />
          </div>
        </div>
      </Container>
    </div>
  );
}
