import { hasSupabaseEnv } from "@/lib/supabase/env";
import { getShopSettings } from "@/lib/queries/site";
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
        <p className="rounded-xl border border-[rgba(224,165,46,0.4)] bg-[rgba(224,165,46,0.08)] px-4 py-3 text-sm text-[#e0c08a]">
          Configura Supabase para guardar cambios.
        </p>
      )}

      <SettingsManager settings={settings} hasEnv={hasSupabaseEnv()} />
    </div>
  );
}
