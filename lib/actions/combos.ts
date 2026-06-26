"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import {
  requireAdmin,
  isUniqueViolation,
  isForeignKeyViolation,
} from "@/lib/auth";
import { comboSchema, type ComboSchema } from "@/lib/validation/schemas";

export type ComboActionResult =
  | { ok: true; comboId: string }
  | { ok: false; error: string };

function toRow(input: ComboSchema) {
  return {
    name: input.name,
    slug: input.slug,
    description: input.description,
    price_cop: input.priceCop,
    accent_color: input.accentColor,
    image_url: input.imageUrl === "" ? null : input.imageUrl,
    is_active: input.isActive,
    sold_out: input.soldOut,
    sort_order: input.sortOrder,
  };
}

function revalidateStorefrontAndAdmin() {
  revalidateTag("combos", "max");
  revalidatePath("/");
  revalidatePath("/admin/combos");
}

export async function createCombo(
  input: ComboSchema,
): Promise<ComboActionResult> {
  const parsed = comboSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }

  if (!hasSupabaseEnv()) {
    return { ok: false, error: "Base de datos no configurada." };
  }

  const guard = await requireAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("combos")
    .insert(toRow(parsed.data))
    .select("id")
    .single();

  if (error || !data) {
    if (isUniqueViolation(error)) {
      return { ok: false, error: "Ya existe un combo con ese slug." };
    }
    return { ok: false, error: "No pudimos crear el combo." };
  }

  revalidateStorefrontAndAdmin();
  return { ok: true, comboId: (data as { id: string }).id };
}

export async function updateCombo(
  id: string,
  input: ComboSchema,
): Promise<ComboActionResult> {
  const parsed = comboSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }

  if (!hasSupabaseEnv()) {
    return { ok: false, error: "Base de datos no configurada." };
  }

  const guard = await requireAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("combos")
    .update(toRow(parsed.data))
    .eq("id", id)
    .select("id");

  if (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, error: "Ya existe un combo con ese slug." };
    }
    return { ok: false, error: "No pudimos actualizar el combo." };
  }
  if (!data || data.length === 0) {
    return { ok: false, error: "No se encontró el registro." };
  }

  revalidateStorefrontAndAdmin();
  revalidatePath(`/admin/combos/${id}`);
  return { ok: true, comboId: id };
}

export async function deleteCombo(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!hasSupabaseEnv()) {
    return { ok: false, error: "Base de datos no configurada." };
  }

  const guard = await requireAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("combos")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) {
    if (isForeignKeyViolation(error)) {
      return {
        ok: false,
        error:
          "No se puede eliminar: el combo tiene pedidos asociados. Desactívalo (Activo = off) en lugar de eliminarlo.",
      };
    }
    return { ok: false, error: "No pudimos eliminar el combo." };
  }
  if (!data || data.length === 0) {
    return { ok: false, error: "No se encontró el registro." };
  }

  revalidateStorefrontAndAdmin();
  return { ok: true };
}
