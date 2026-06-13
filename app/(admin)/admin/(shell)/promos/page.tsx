import { hasSupabaseEnv } from "@/lib/supabase/env";
import { getAdminPromos } from "../../_lib/queries";
import { PromosManager } from "../../_components/PromosManager";

export const dynamic = "force-dynamic";

export default async function AdminPromosPage() {
  const promos = await getAdminPromos();

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-3xl font-700 text-polar-text">
          Promos
        </h1>
        <p className="mt-1 text-sm text-polar-muted">
          Crea códigos de descuento por porcentaje o monto fijo. El descuento se
          recalcula y valida en el servidor al confirmar el pedido.
        </p>
      </header>

      {!hasSupabaseEnv() && (
        <p className="rounded-xl border border-[rgba(224,165,46,0.4)] bg-[rgba(224,165,46,0.08)] px-4 py-3 text-sm text-[#e0c08a]">
          Base de datos no configurada: promos de demostración (solo lectura).
        </p>
      )}

      <PromosManager initial={promos} readOnly={!hasSupabaseEnv()} />
    </div>
  );
}
