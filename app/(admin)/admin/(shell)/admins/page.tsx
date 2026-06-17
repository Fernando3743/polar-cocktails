import { redirect } from "next/navigation";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { requireSuperAdmin } from "@/lib/auth";
import { listAdmins } from "@/lib/actions/admins";
import { Alert } from "@/components/ui/Alert";
import { DemoModeNotice } from "@/components/ui/DemoModeNotice";
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
        <DemoModeNotice>
          Configura Supabase para gestionar administradores.
        </DemoModeNotice>
      )}

      {loadError && <Alert tone="error">{loadError}</Alert>}

      <AdminsManager initial={admins} selfId={guard.user.id} hasEnv={hasEnv} />
    </div>
  );
}
