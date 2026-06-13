import { Container } from "@/components/ui/Container";

interface Feature {
  title: string;
  description: string;
  icon: (props: { className?: string }) => React.ReactElement;
}

function FreshIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 2v20" />
      <path d="M12 12 7 7" />
      <path d="M12 12l5-5" />
      <path d="M12 17l-4-4" />
      <path d="M12 17l4-4" />
      <path d="M5 12H2.5" />
      <path d="M21.5 12H19" />
    </svg>
  );
}

function FlavorsIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M7 7q5-4 10 0" />
      <path d="M6.4 7h11.2" />
      <path d="M7.4 7 8.7 20.2Q8.8 22 10.4 22h3.2q1.6 0 1.7-1.8L16.6 7" />
      <path d="M8.2 12.5h7.6" />
    </svg>
  );
}

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20.5 4.4 13a4.6 4.6 0 0 1 6.5-6.5l1.1 1.1 1.1-1.1A4.6 4.6 0 0 1 19.6 13Z" />
    </svg>
  );
}

const FEATURES: Feature[] = [
  {
    title: "Frescura en cada vaso",
    description:
      "Preparamos nuestros granizados al momento, con una explosión de frescura que se siente desde el primer sorbo.",
    icon: FreshIcon,
  },
  {
    title: "Sabores para todos",
    description:
      "12 sabores diferentes y 8 combinaciones únicas para que armes tu cóctel granizado perfecto.",
    icon: FlavorsIcon,
  },
  {
    title: "Hecho con cariño en Tuluá",
    description:
      "Somos un negocio local de Tuluá. Pide tu domicilio por WhatsApp y llevamos la frescura hasta tu puerta.",
    icon: HeartIcon,
  },
];

export function Nosotros() {
  return (
    <section id="nosotros" className="pt-[36px] pb-0 md:pt-[48px]">
      <Container className="px-5 md:px-6">
        <div className="flex flex-col items-center text-center">
          <span className="eyebrow text-[11px] md:text-[12px] md:tracking-[0.18em]">
            NOSOTROS
          </span>
          <h2 className="mt-[7px] max-w-[330px] font-display text-[27px] font-bold leading-[1.05] text-white md:mt-[8px] md:max-w-none md:text-[30px] md:leading-tight">
            La frescura que nos{" "}
            <span className="text-polar-magenta">distingue</span>
          </h2>
          <p className="mt-[12px] max-w-[520px] text-[14px] leading-[1.55] text-polar-muted md:mt-[14px] md:text-[15px]">
            En Polar convertimos los cócteles granizados en una experiencia
            congelada e inolvidable. Cada vaso combina sabor, color y una
            frescura que solo se consigue al instante.
          </p>
        </div>

        <div className="mt-[22px] grid gap-5 md:mt-[28px] md:grid-cols-3">
          {FEATURES.map(({ title, description, icon: Icon }) => (
            <div
              key={title}
              className="glass-card flex flex-col items-start px-[24px] py-[26px]"
            >
              <span className="icon-chip">
                <Icon className="h-[24px] w-[24px]" />
              </span>
              <h3 className="mt-[16px] font-display text-[18px] font-semibold text-white">
                {title}
              </h3>
              <p className="mt-[8px] text-[13px] leading-[1.5] text-[#B9B2C6]">
                {description}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
