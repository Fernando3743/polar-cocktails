import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export type AdminAuthResult =
  | { ok: true; user: User }
  | { ok: false; error: string };

/**
 * The single super admin's email, from SUPER_ADMIN_EMAIL (server-only, never
 * NEXT_PUBLIC). Returns null when unset/empty so isSuperAdmin fails CLOSED.
 */
export function superAdminEmail(): string | null {
  const value = (process.env.SUPER_ADMIN_EMAIL ?? "").trim().toLowerCase();
  return value.length > 0 ? value : null;
}

/**
 * True when `email` is the configured super admin. Fails CLOSED: when
 * SUPER_ADMIN_EMAIL is unset, nobody is the super admin (no accidental owner).
 */
export function isSuperAdmin(email: string | null | undefined): boolean {
  const superEmail = superAdminEmail();
  return superEmail !== null && (email ?? "").toLowerCase() === superEmail;
}

/**
 * True when the user carries an admin role in app_metadata. app_metadata is
 * writable only by the service-role key (never by the user), so the claim is
 * trustworthy and rides in the JWT — no extra DB read is needed to authorize.
 */
function hasAdminRole(user: User): boolean {
  const role = (user.app_metadata as { role?: unknown } | undefined)?.role;
  return role === "admin" || role === "super_admin";
}

/**
 * Authorizes an admin request server-side. Uses getUser() (validates the JWT,
 * never getSession()). A user passes when they are the super admin (by
 * SUPER_ADMIN_EMAIL) OR carry app_metadata.role in {admin, super_admin}. Fails
 * closed otherwise — there is no email-allowlist fallback (the DB-layer
 * is_admin() in migration 0009 mirrors this on the role claim).
 */
export async function requireAdmin(): Promise<AdminAuthResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "No autorizado." };
  }

  if (!isSuperAdmin(user.email) && !hasAdminRole(user)) {
    return { ok: false, error: "No autorizado." };
  }

  return { ok: true, user };
}

/**
 * Authorizes a SUPER-admin-only request (managing other admins). Only the
 * SUPER_ADMIN_EMAIL user passes; everyone else — including regular admins — is
 * rejected.
 */
export async function requireSuperAdmin(): Promise<AdminAuthResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "No autorizado." };
  }

  if (!isSuperAdmin(user.email)) {
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
