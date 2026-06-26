import { Container } from "@/components/ui/Container";
import { PromoBanner } from "@/components/promos/PromoBanner";
import type { PromoBanner as PromoBannerType } from "@/lib/types";

interface NuevoProps {
  banners: PromoBannerType[];
}

/**
 * "Nuevo" storefront section: a stack of promotional banners shown just under
 * the Hero. Renders nothing when there are no banners (DB mode starts empty
 * until the owner adds them).
 */
export function Nuevo({ banners }: NuevoProps) {
  if (banners.length === 0) return null;

  return (
    <section id="nuevo" className="pt-8 pb-2 md:pt-10">
      <Container className="px-5 md:px-6">
        <div className="mx-auto grid max-w-[760px] gap-4 md:gap-5">
          {banners.map((banner) => (
            <PromoBanner key={banner.id} banner={banner} />
          ))}
        </div>
      </Container>
    </section>
  );
}
