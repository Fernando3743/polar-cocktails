"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import {
  requireAdmin,
  isUniqueViolation,
  isForeignKeyViolation,
} from "@/lib/auth";
import { categorySchema, type CategorySchema } from "@/lib/validation/schemas";

export type CategoryActionResult =
  | { ok: true; categoryId: string }
  | { ok: false; error: string };

function toRow(input: CategorySchema) {
  return {
    name: input.name,
    slug: input.slug,
    sort_order: input.sortOrder,
    is_active: input.isActive,
  };
}

function revalidateStorefrontAndAdmin() {
  // Category edits also change the denormalized category fields embedded in the
  // cached products read, so flush both catalog tags.
  revalidateTag("categories", "max");
  revalidateTag("products", "max");
  revalidatePath("/");
  revalidatePath("/menu");
  revalidatePath("/admin/categories");
}

export async function createCategory(
  input: CategorySchema,
): Promise<CategoryActionResult> {
  if (!hasSupabaseEnv()) {
    return { ok: false, error: "Base de datos no configurada." };
  }

  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }

  const guard = await requireAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("categories")
    .insert(toRow(parsed.data))
    .select("id")
    .single();

  if (error || !data) {
    if (isUniqueViolation(error)) {
      return { ok: false, error: "Ya existe una categoría con ese slug." };
    }
    return { ok: false, error: "No pudimos crear la categoría." };
  }

  revalidateStorefrontAndAdmin();
  return { ok: true, categoryId: (data as { id: string }).id };
}

export async function updateCategory(
  id: string,
  input: CategorySchema,
): Promise<CategoryActionResult> {
  if (!hasSupabaseEnv()) {
    return { ok: false, error: "Base de datos no configurada." };
  }

  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }

  const guard = await requireAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("categories")
    .update(toRow(parsed.data))
    .eq("id", id)
    .select("id");

  if (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, error: "Ya existe una categoría con ese slug." };
    }
    return { ok: false, error: "No pudimos actualizar la categoría." };
  }
  if (!data || data.length === 0) {
    return { ok: false, error: "No se encontró el registro." };
  }

  revalidateStorefrontAndAdmin();
  return { ok: true, categoryId: id };
}

export async function deleteCategory(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!hasSupabaseEnv()) {
    return { ok: false, error: "Base de datos no configurada." };
  }

  const guard = await requireAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) {
    if (isForeignKeyViolation(error)) {
      return {
        ok: false,
        error:
          "No se puede eliminar: la categoría tiene productos asociados.",
      };
    }
    return { ok: false, error: "No pudimos eliminar la categoría." };
  }
  if (!data || data.length === 0) {
    return { ok: false, error: "No se encontró el registro." };
  }

  revalidateStorefrontAndAdmin();
  return { ok: true };
}
