"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { promoSchema, type PromoSchema } from "@/lib/validation/schemas";

export type PromoActionResult =
  | { ok: true; promoId: string }
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

function toRow(input: PromoSchema) {
  return {
    code: input.code,
    type: input.type,
    value: input.value,
    min_subtotal: input.minSubtotalCop,
    active: input.active,
    starts_at: input.startsAt,
    ends_at: input.endsAt,
    max_redemptions: input.maxRedemptions,
  };
}

function isUniqueViolation(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return (
    error.code === "23505" ||
    (error.message?.toLowerCase().includes("duplicate") ?? false)
  );
}

export async function createPromo(
  input: PromoSchema,
): Promise<PromoActionResult> {
  const parsed = promoSchema.safeParse(input);
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
    .from("promos")
    .insert(toRow(parsed.data))
    .select("id")
    .single();

  if (error || !data) {
    if (isUniqueViolation(error)) {
      return { ok: false, error: "Ya existe un código con ese nombre." };
    }
    return { ok: false, error: "No pudimos crear la promo." };
  }

  revalidatePath("/admin/promos");
  return { ok: true, promoId: (data as { id: string }).id };
}

export async function updatePromo(
  id: string,
  input: PromoSchema,
): Promise<PromoActionResult> {
  const parsed = promoSchema.safeParse(input);
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
    .from("promos")
    .update(toRow(parsed.data))
    .eq("id", id);

  if (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, error: "Ya existe un código con ese nombre." };
    }
    return { ok: false, error: "No pudimos actualizar la promo." };
  }

  revalidatePath("/admin/promos");
  return { ok: true, promoId: id };
}

export async function deletePromo(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const guard = await requireAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };
  const { supabase } = guard;

  const { error } = await supabase.from("promos").delete().eq("id", id);
  if (error) {
    return { ok: false, error: "No pudimos eliminar la promo." };
  }

  revalidatePath("/admin/promos");
  return { ok: true };
}
