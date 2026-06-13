import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export type AdminAuthResult =
  | { ok: true; user: User }
  | { ok: false; error: string };

/**
 * Authorizes an admin request server-side.
 *
 * Uses the server Supabase client's `getUser()` (validates the JWT, never
 * `getSession()`). When `ADMIN_EMAIL` is set (server-only, never `NEXT_PUBLIC`),
 * the authenticated user's email must be in it; `ADMIN_EMAIL` may be a single
 * email or a comma-separated allowlist of admins. When unset/empty, any
 * authenticated user passes so there is no lockout.
 */
export async function requireAdmin(): Promise<AdminAuthResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "No autorizado." };
  }

  if (!isAllowedAdminEmail(user.email)) {
    return { ok: false, error: "No autorizado." };
  }

  return { ok: true, user };
}

/**
 * Parses `ADMIN_EMAIL` (single email or comma-separated allowlist) into a
 * lowercased list. Server-only — `ADMIN_EMAIL` is never exposed to the client.
 */
export function adminEmailAllowlist(): string[] {
  return (process.env.ADMIN_EMAIL ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.length > 0);
}

/**
 * True when `email` is an allowed admin. An empty allowlist (ADMIN_EMAIL
 * unset/empty) allows any address so there is no lockout; the caller is still
 * responsible for requiring an authenticated user.
 */
export function isAllowedAdminEmail(email: string | null | undefined): boolean {
  const allowlist = adminEmailAllowlist();
  return (
    allowlist.length === 0 ||
    allowlist.includes((email ?? "").toLowerCase())
  );
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
