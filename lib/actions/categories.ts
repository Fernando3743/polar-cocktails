"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { categorySchema, type CategorySchema } from "@/lib/validation/schemas";

export type CategoryActionResult =
  | { ok: true; categoryId: string }
  | { ok: false; error: string };

interface SupabaseLike {
  auth: { getUser: () => Promise<{ data: { user: unknown } }> };
}

type AdminGuard =
  | { ok: false; error: string }
  | { ok: true; supabase: Awaited<ReturnType<typeof createClient>> };

async function requireAdmin(): Promise<AdminGuard> {
  if (!hasSupabaseEnv()) {
    return { ok: false, error: "Base de datos no configurada." };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await (supabase as unknown as SupabaseLike).auth.getUser();
  if (!user) {
    return { ok: false, error: "No autorizado." };
  }
  return { ok: true, supabase };
}

function toRow(input: CategorySchema) {
  return {
    name: input.name,
    slug: input.slug,
    sort_order: input.sortOrder,
    is_active: input.isActive,
  };
}

function revalidateStorefrontAndAdmin() {
  revalidatePath("/");
  revalidatePath("/menu");
  revalidatePath("/admin/categories");
}

export async function createCategory(
  input: CategorySchema,
): Promise<CategoryActionResult> {
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }

  const guard = await requireAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };
  const { supabase } = guard;

  const { data, error } = await supabase
    .from("categories")
    .insert(toRow(parsed.data))
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: "No pudimos crear la categoría." };
  }

  revalidateStorefrontAndAdmin();
  return { ok: true, categoryId: (data as { id: string }).id };
}

export async function updateCategory(
  id: string,
  input: CategorySchema,
): Promise<CategoryActionResult> {
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }

  const guard = await requireAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };
  const { supabase } = guard;

  const { error } = await supabase
    .from("categories")
    .update(toRow(parsed.data))
    .eq("id", id);

  if (error) {
    return { ok: false, error: "No pudimos actualizar la categoría." };
  }

  revalidateStorefrontAndAdmin();
  return { ok: true, categoryId: id };
}

export async function deleteCategory(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const guard = await requireAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };
  const { supabase } = guard;

  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) {
    return {
      ok: false,
      error:
        "No pudimos eliminar la categoría (puede tener productos asociados).",
    };
  }

  revalidateStorefrontAndAdmin();
  return { ok: true };
}
