"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { requireAdmin } from "@/lib/auth";

/**
 * Signs the admin user out and sends them back to the login page.
 * No-op redirect when the database/auth is not configured.
 */
export async function signOut() {
  if (hasSupabaseEnv()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/admin/login");
}

/**
 * Updates the authenticated admin's password (CMP-5).
 * Re-checks authorization server-side and requires a configured database/auth.
 */
export async function changePassword(
  newPassword: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const guard = await requireAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };

  if (!hasSupabaseEnv()) {
    return { ok: false, error: "Configura Supabase." };
  }

  if (typeof newPassword !== "string" || newPassword.length < 8) {
    return {
      ok: false,
      error: "La contraseña debe tener al menos 8 caracteres.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) {
    return { ok: false, error: "No pudimos actualizar la contraseña." };
  }

  return { ok: true };
}
