import { hasSupabaseEnv } from "@/lib/supabase/env";
import { getSiteAssets } from "@/lib/queries/site";
import { DemoModeNotice } from "@/components/ui/DemoModeNotice";
import { BrandingManager } from "../../_components/BrandingManager";

export const dynamic = "force-dynamic";

export default async function AdminBrandingPage() {
  const assets = await getSiteAssets();

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-3xl font-700 text-polar-text">
          Multimedia
        </h1>
        <p className="mt-1 text-sm text-polar-muted">
          Sube las imágenes de la tienda: portada, logo, imagen para compartir y
          la galería de Instagram.
        </p>
      </header>

      {!hasSupabaseEnv() && (
        <DemoModeNotice>
          Configura Supabase para subir imágenes.
        </DemoModeNotice>
      )}

      <BrandingManager assets={assets} hasEnv={hasSupabaseEnv()} />
    </div>
  );
}
