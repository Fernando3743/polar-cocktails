import { Container } from "@/components/ui/Container";
import { ComboCard } from "@/components/combos/ComboCard";
import type { Combo } from "@/lib/types";

interface CombosProps {
  combos: Combo[];
}

/**
 * "Combos" storefront section: a 2-up grid of combo cards. Renders nothing when
 * there are no combos (DB mode starts empty until the owner adds them).
 */
export function Combos({ combos }: CombosProps) {
  if (combos.length === 0) return null;

  return (
    <section id="combos" className="pt-12 pb-2 md:pt-16">
      <Container className="px-5 md:px-6">
        <div className="flex flex-col items-center text-center">
          <span className="eyebrow text-[11px] md:text-[12px] md:tracking-[0.18em]">
            ARMA TU PLAN
          </span>
          <h2 className="mt-[7px] max-w-[310px] font-display text-[27px] font-bold leading-[1.05] text-white md:mt-[8px] md:max-w-none md:text-[30px] md:leading-tight">
            Combos para <span className="text-polar-magenta">compartir</span>
          </h2>
        </div>

        <div className="mt-[24px] grid gap-4 md:mt-[28px] md:grid-cols-2 md:gap-5">
          {combos.map((combo) => (
            <ComboCard key={combo.id} combo={combo} />
          ))}
        </div>
      </Container>
    </section>
  );
}
