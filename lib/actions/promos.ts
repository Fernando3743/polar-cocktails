"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { requireAdmin, isForeignKeyViolation } from "@/lib/auth";
import {
  promoBannerSchema,
  type PromoBannerSchema,
} from "@/lib/validation/schemas";

export type PromoBannerActionResult =
  | { ok: true; bannerId: string }
  | { ok: false; error: string };

function toRow(input: PromoBannerSchema) {
  return {
    heading: input.heading,
    image_url: input.imageUrl === "" ? null : input.imageUrl,
    product_id: input.productId,
    href: input.href,
    is_active: input.isActive,
    sort_order: input.sortOrder,
  };
}

function revalidateStorefrontAndAdmin() {
  revalidateTag("promo_banners", "max");
  revalidatePath("/");
  revalidatePath("/admin/promos");
}

export async function createPromoBanner(
  input: PromoBannerSchema,
): Promise<PromoBannerActionResult> {
  const parsed = promoBannerSchema.safeParse(input);
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
    .from("promo_banners")
    .insert(toRow(parsed.data))
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: "No pudimos crear el banner." };
  }

  revalidateStorefrontAndAdmin();
  return { ok: true, bannerId: (data as { id: string }).id };
}

export async function updatePromoBanner(
  id: string,
  input: PromoBannerSchema,
): Promise<PromoBannerActionResult> {
  const parsed = promoBannerSchema.safeParse(input);
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
    .from("promo_banners")
    .update(toRow(parsed.data))
    .eq("id", id)
    .select("id");

  if (error) {
    return { ok: false, error: "No pudimos actualizar el banner." };
  }
  if (!data || data.length === 0) {
    return { ok: false, error: "No se encontró el registro." };
  }

  revalidateStorefrontAndAdmin();
  revalidatePath(`/admin/promos/${id}`);
  return { ok: true, bannerId: id };
}

export async function deletePromoBanner(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!hasSupabaseEnv()) {
    return { ok: false, error: "Base de datos no configurada." };
  }

  const guard = await requireAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("promo_banners")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) {
    if (isForeignKeyViolation(error)) {
      return { ok: false, error: "No pudimos eliminar el banner." };
    }
    return { ok: false, error: "No pudimos eliminar el banner." };
  }
  if (!data || data.length === 0) {
    return { ok: false, error: "No se encontró el registro." };
  }

  revalidateStorefrontAndAdmin();
  return { ok: true };
}
