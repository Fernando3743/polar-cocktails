import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export type AdminAuthResult =
  | { ok: true; user: User }
  | { ok: false; error: string };

/**
 * Authorizes an admin request server-side.
 *
 * Uses the server Supabase client's `getUser()` (validates the JWT, never
 * `getSession()`). When `ADMIN_EMAIL` is set (server-only, never
 * `NEXT_PUBLIC`), the authenticated user's email must match it; when unset,
 * any authenticated user passes so there is no lockout.
 */
export async function requireAdmin(): Promise<AdminAuthResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "No autorizado." };
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  if (
    typeof adminEmail === "string" &&
    adminEmail.length > 0 &&
    user.email?.toLowerCase() !== adminEmail.toLowerCase()
  ) {
    return { ok: false, error: "No autorizado." };
  }

  return { ok: true, user };
}

/** True when the Postgres error is a unique-constraint violation (code 23505). */
export function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: string }).code === "23505"
  );
}

/** True when the Postgres error is a foreign-key violation (code 23503). */
export function isForeignKeyViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: string }).code === "23503"
  );
}
