"use server";

import { revalidatePath } from "next/cache";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { requireSuperAdmin, isSuperAdmin } from "@/lib/auth";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import {
  createAdminSchema,
  passwordSchema,
  type CreateAdminSchema,
} from "@/lib/validation/schemas";

export type AdminListItem = {
  id: string;
  email: string;
  role: "super" | "admin";
  createdAt: string;
  lastSignInAt: string | null;
};

export type AdminActionResult = { ok: true } | { ok: false; error: string };
export type ListAdminsResult =
  | { ok: true; admins: AdminListItem[] }
  | { ok: false; error: string };

const ENV_ERROR = "Configura Supabase.";
const KEY_ERROR = "Falta SUPABASE_SERVICE_ROLE_KEY.";

function roleOf(appMetadata: unknown): unknown {
  return (appMetadata as { role?: unknown } | undefined)?.role;
}

export async function listAdmins(): Promise<ListAdminsResult> {
  if (!hasSupabaseEnv()) return { ok: false, error: ENV_ERROR };
  const guard = await requireSuperAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };
  if (!hasServiceRoleKey()) return { ok: false, error: KEY_ERROR };

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (error) {
    return { ok: false, error: "No pudimos cargar los administradores." };
  }

  const admins: AdminListItem[] = data.users
    .filter((u) => {
      const role = roleOf(u.app_metadata);
      return (
        isSuperAdmin(u.email) || role === "admin" || role === "super_admin"
      );
    })
    .map((u) => ({
      id: u.id,
      email: u.email ?? "",
      role: isSuperAdmin(u.email) ? ("super" as const) : ("admin" as const),
      createdAt: u.created_at ?? "",
      lastSignInAt: u.last_sign_in_at ?? null,
    }))
    .sort((a, b) => {
      if (a.role !== b.role) return a.role === "super" ? -1 : 1;
      return a.email.localeCompare(b.email);
    });

  return { ok: true, admins };
}

export async function createAdmin(
  input: CreateAdminSchema,
): Promise<AdminActionResult> {
  const parsed = createAdminSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }
  if (!hasSupabaseEnv()) return { ok: false, error: ENV_ERROR };
  const guard = await requireSuperAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };
  if (!hasServiceRoleKey()) return { ok: false, error: KEY_ERROR };

  if (isSuperAdmin(parsed.data.email)) {
    return { ok: false, error: "Ese correo es el del propietario." };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    app_metadata: { role: "admin" },
  });

  if (error) {
    const message = error.message?.toLowerCase() ?? "";
    if (
      message.includes("already") ||
      message.includes("registered") ||
      message.includes("exists")
    ) {
      return { ok: false, error: "Ya existe un usuario con ese correo." };
    }
    return { ok: false, error: "No pudimos crear el administrador." };
  }

  revalidatePath("/admin/admins");
  return { ok: true };
}

export async function deleteAdmin(userId: string): Promise<AdminActionResult> {
  if (!hasSupabaseEnv()) return { ok: false, error: ENV_ERROR };
  const guard = await requireSuperAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };
  if (!hasServiceRoleKey()) return { ok: false, error: KEY_ERROR };
  if (!userId) return { ok: false, error: "Administrador inválido." };
  if (userId === guard.user.id) {
    return { ok: false, error: "No puedes eliminar tu propia cuenta." };
  }

  const admin = createAdminClient();
  const { data: target, error: lookupError } =
    await admin.auth.admin.getUserById(userId);
  if (lookupError || !target.user) {
    return { ok: false, error: "No encontramos ese administrador." };
  }
  if (isSuperAdmin(target.user.email)) {
    return { ok: false, error: "No puedes eliminar al propietario." };
  }

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    return { ok: false, error: "No pudimos eliminar el administrador." };
  }

  revalidatePath("/admin/admins");
  return { ok: true };
}

export async function resetAdminPassword(
  userId: string,
  newPassword: string,
): Promise<AdminActionResult> {
  const parsed = passwordSchema.safeParse(newPassword);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Contraseña inválida.",
    };
  }
  if (!hasSupabaseEnv()) return { ok: false, error: ENV_ERROR };
  const guard = await requireSuperAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };
  if (!hasServiceRoleKey()) return { ok: false, error: KEY_ERROR };
  if (!userId) return { ok: false, error: "Administrador inválido." };

  const admin = createAdminClient();
  const { data: target, error: lookupError } =
    await admin.auth.admin.getUserById(userId);
  if (lookupError || !target.user) {
    return { ok: false, error: "No encontramos ese administrador." };
  }
  if (isSuperAdmin(target.user.email)) {
    return { ok: false, error: "Cambia tu contraseña en Configuración." };
  }

  const { error } = await admin.auth.admin.updateUserById(userId, {
    password: parsed.data,
  });
  if (error) {
    return { ok: false, error: "No pudimos actualizar la contraseña." };
  }

  revalidatePath("/admin/admins");
  return { ok: true };
}
