import { hasSupabaseEnv } from "@/lib/supabase/env";
import { getShopSettings } from "@/lib/queries/site";
import { DemoModeNotice } from "@/components/ui/DemoModeNotice";
import { SettingsManager } from "../../_components/SettingsManager";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const settings = await getShopSettings();

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-3xl font-700 text-polar-text">
          Configuración
        </h1>
        <p className="mt-1 text-sm text-polar-muted">
          Datos de contacto, redes sociales, horarios y contraseña del panel.
        </p>
      </header>

      {!hasSupabaseEnv() && (
        <DemoModeNotice>
          Configura Supabase para guardar cambios.
        </DemoModeNotice>
      )}

      <SettingsManager settings={settings} hasEnv={hasSupabaseEnv()} />
    </div>
  );
}
