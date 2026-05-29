import { hasSupabaseEnv } from "@/lib/supabase/env";
import { getAdminCategories } from "../../_lib/queries";
import { CategoriesManager } from "../../_components/CategoriesManager";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const categories = await getAdminCategories();

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-3xl font-700 text-polar-text">
          Categorías
        </h1>
        <p className="mt-1 text-sm text-polar-muted">
          Las categorías agrupan los sabores. &quot;Todos&quot; es un filtro
          virtual, no una categoría.
        </p>
      </header>

      {!hasSupabaseEnv() && (
        <p className="rounded-xl border border-[rgba(224,165,46,0.4)] bg-[rgba(224,165,46,0.08)] px-4 py-3 text-sm text-[#e0c08a]">
          Base de datos no configurada: categorías de demostración (solo
          lectura).
        </p>
      )}

      <CategoriesManager
        initial={categories.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          sortOrder: c.sortOrder,
          isActive: c.isActive,
        }))}
        readOnly={!hasSupabaseEnv()}
      />
    </div>
  );
}
