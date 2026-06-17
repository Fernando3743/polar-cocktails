"use server";

import { redirect } from "next/navigation";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { requireAdmin } from "@/lib/auth";
import { passwordSchema } from "@/lib/validation/schemas";

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
  currentPassword: string,
  newPassword: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!hasSupabaseEnv()) {
    return { ok: false, error: "Configura Supabase." };
  }

  const parsed = passwordSchema.safeParse(newPassword);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Contraseña inválida.",
    };
  }

  const guard = await requireAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };

  const email = guard.user.email;
  if (!email) {
    return { ok: false, error: "No pudimos verificar tu identidad." };
  }

  // Step-up: verify the CURRENT password before allowing the change, so a
  // hijacked but already-authenticated session cannot silently reset it. Use a
  // throwaway client (no session persistence) so this sign-in probe does not
  // overwrite the admin's active cookies/session.
  const probe = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { error: reauthError } = await probe.auth.signInWithPassword({
    email,
    password: currentPassword,
  });
  if (reauthError) {
    return { ok: false, error: "La contraseña actual no es correcta." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data });

  if (error) {
    return { ok: false, error: "No pudimos actualizar la contraseña." };
  }

  return { ok: true };
}
