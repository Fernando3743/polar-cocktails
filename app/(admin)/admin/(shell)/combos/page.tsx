import Link from "next/link";
import { formatCop } from "@/lib/format";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { ProductThumb } from "@/components/menu/ProductThumb";
import { DemoModeNotice } from "@/components/ui/DemoModeNotice";
import { getAdminCombos } from "../../_lib/queries";
import { RowActions } from "../../_components/RowActions";
import { deleteCombo } from "@/lib/actions/combos";

export const dynamic = "force-dynamic";

export default async function AdminCombosPage() {
  const combos = await getAdminCombos();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-700 text-polar-text">
            Combos
          </h1>
          <p className="mt-1 text-sm text-polar-muted">
            {combos.length} combo{combos.length === 1 ? "" : "s"} en la tienda.
          </p>
        </div>
        <Link href="/admin/combos/new" className="btn-brand h-11 text-sm">
          Nuevo combo
        </Link>
      </header>

      {!hasSupabaseEnv() && (
        <DemoModeNotice>
          Base de datos no configurada: combos de demostración (solo lectura).
        </DemoModeNotice>
      )}

      <div className="glass-card overflow-hidden">
        {combos.length === 0 ? (
          <p className="px-5 py-8 text-sm text-polar-muted">
            No hay combos todavía.
          </p>
        ) : (
          <ul className="divide-y divide-[rgba(167,73,197,0.08)]">
            {combos.map((combo) => (
              <li key={combo.id} className="flex items-center gap-4 px-5 py-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[rgba(25,3,75,0.4)]">
                  <ProductThumb
                    src={combo.imageUrl}
                    alt={combo.name}
                    width={48}
                    height={48}
                    placeholderClassName="h-10 w-10"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-600 text-polar-text">
                      {combo.name}
                    </p>
                    {!combo.isActive && (
                      <span className="rounded-full border border-[rgba(126,119,144,0.4)] bg-[rgba(126,119,144,0.12)] px-2 py-0.5 text-[10px] font-600 uppercase tracking-wide text-polar-dim">
                        Inactivo
                      </span>
                    )}
                    {combo.soldOut && (
                      <span className="rounded-full border border-[rgba(126,119,144,0.4)] bg-[rgba(126,119,144,0.12)] px-2 py-0.5 text-[10px] font-600 uppercase tracking-wide text-polar-dim">
                        Agotado
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-polar-dim">
                    {formatCop(combo.priceCop)}
                  </p>
                </div>

                <span
                  aria-hidden
                  className="hidden h-5 w-5 shrink-0 rounded-full border border-white/10 sm:block"
                  style={{ backgroundColor: combo.accentColor }}
                  title={combo.accentColor}
                />

                <div className="flex shrink-0 items-center gap-3">
                  <Link
                    href={`/admin/combos/${combo.id}`}
                    className="text-sm text-polar-magenta transition-colors hover:text-polar-purple-light"
                  >
                    Editar
                  </Link>
                  <RowActions
                    id={combo.id}
                    name={combo.name}
                    onDelete={deleteCombo}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
