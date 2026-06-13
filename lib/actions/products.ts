"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { productSchema, type ProductSchema } from "@/lib/validation/schemas";

export type ProductActionResult =
  | { ok: true; productId: string }
  | { ok: false; error: string };

interface SupabaseLike {
  auth: { getUser: () => Promise<{ data: { user: unknown } }> };
}

type AdminGuard =
  | { ok: false; error: string }
  | { ok: true; supabase: Awaited<ReturnType<typeof createClient>> };

/** Returns the authenticated client or an error; guards every admin mutation. */
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

/** Resolves a category slug to its id (active categories only). */
async function categoryIdForSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  slug: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

function toRow(input: ProductSchema, categoryId: string) {
  return {
    category_id: categoryId,
    name: input.name,
    slug: input.slug,
    description: input.description,
    price_cop: input.priceCop,
    accent_color: input.accentColor,
    image_url: input.imageUrl === "" ? null : input.imageUrl,
    is_active: input.isActive,
    sold_out: input.soldOut,
    stock_qty: input.stockQty,
    sort_order: input.sortOrder,
  };
}

function revalidateStorefrontAndAdmin() {
  revalidatePath("/");
  revalidatePath("/menu");
  revalidatePath("/admin/products");
}

export async function createProduct(
  input: ProductSchema,
): Promise<ProductActionResult> {
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }

  const guard = await requireAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };
  const { supabase } = guard;

  const categoryId = await categoryIdForSlug(supabase, parsed.data.categorySlug);
  if (!categoryId) {
    return { ok: false, error: "Categoría no encontrada." };
  }

  const { data, error } = await supabase
    .from("products")
    .insert(toRow(parsed.data, categoryId))
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: "No pudimos crear el producto." };
  }

  revalidateStorefrontAndAdmin();
  return { ok: true, productId: (data as { id: string }).id };
}

export async function updateProduct(
  id: string,
  input: ProductSchema,
): Promise<ProductActionResult> {
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }

  const guard = await requireAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };
  const { supabase } = guard;

  const categoryId = await categoryIdForSlug(supabase, parsed.data.categorySlug);
  if (!categoryId) {
    return { ok: false, error: "Categoría no encontrada." };
  }

  const { error } = await supabase
    .from("products")
    .update(toRow(parsed.data, categoryId))
    .eq("id", id);

  if (error) {
    return { ok: false, error: "No pudimos actualizar el producto." };
  }

  revalidateStorefrontAndAdmin();
  revalidatePath(`/admin/products/${id}`);
  return { ok: true, productId: id };
}

export async function deleteProduct(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const guard = await requireAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };
  const { supabase } = guard;

  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) {
    return { ok: false, error: "No pudimos eliminar el producto." };
  }

  revalidateStorefrontAndAdmin();
  return { ok: true };
}
