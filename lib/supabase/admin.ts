import { createClient } from "@supabase/supabase-js";

// SERVER-ONLY. This module reads SUPABASE_SERVICE_ROLE_KEY, which bypasses RLS
// and can manage auth users, so it must never reach the browser bundle. The
// `server-only` package isn't a dependency here, so we guard at runtime instead.
if (typeof window !== "undefined") {
  throw new Error(
    "lib/supabase/admin.ts is server-only and must not be imported in client code.",
  );
}

/** True when the service-role key is configured (required for admin management). */
export function hasServiceRoleKey(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Supabase admin client built with the service-role key. It BYPASSES RLS and can
 * create/delete/update auth users, so it must ONLY be constructed inside
 * requireSuperAdmin()-gated server actions, after the guard passes. The only
 * importer is lib/actions/admins.ts.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
