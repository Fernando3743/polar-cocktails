import { redirect } from "next/navigation";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { requireSuperAdmin } from "@/lib/auth";
import { listAdmins } from "@/lib/actions/admins";
import { AdminsManager } from "../../_components/AdminsManager";

export const dynamic = "force-dynamic";

export default async function AdminAdminsPage() {
  // Super-admin-only route — authoritative gate (alongside the conditional nav
  // link and the edge middleware). Regular admins are bounced to the dashboard.
  const guard = await requireSuperAdmin();
  if (!guard.ok) {
    redirect("/admin");
  }

  const hasEnv = hasSupabaseEnv();
  const result = hasEnv ? await listAdmins() : null;
  const admins = result && result.ok ? result.admins : [];
  const loadError = result && !result.ok ? result.error : null;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-3xl font-700 text-polar-text">
          Administradores
        </h1>
        <p className="mt-1 text-sm text-polar-muted">
          Crea y gestiona las cuentas con acceso al panel. Solo el propietario ve
          esta sección.
        </p>
      </header>

      {!hasEnv && (
        <p className="rounded-xl border border-[rgba(224,165,46,0.4)] bg-[rgba(224,165,46,0.08)] px-4 py-3 text-sm text-[#e0c08a]">
          Configura Supabase para gestionar administradores.
        </p>
      )}

      {loadError && (
        <p
          role="alert"
          className="rounded-xl border border-[rgba(226,69,122,0.4)] bg-[rgba(226,69,122,0.08)] px-4 py-3 text-sm text-[#f3a9c1]"
        >
          {loadError}
        </p>
      )}

      <AdminsManager initial={admins} selfId={guard.user.id} hasEnv={hasEnv} />
    </div>
  );
}
