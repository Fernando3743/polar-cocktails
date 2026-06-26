"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import {
  requireAdmin,
  isUniqueViolation,
  isForeignKeyViolation,
} from "@/lib/auth";
import { productSchema, type ProductSchema } from "@/lib/validation/schemas";

export type ProductActionResult =
  | { ok: true; productId: string }
  | { ok: false; error: string };

/** Resolves a category slug to its id (regardless of active state). */
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
  revalidateTag("products", "max");
  // Promo banners embed the linked product, so a product change can leave a
  // stale/dangling COMPRAR target in the promo_banners cache (tagged below).
  revalidateTag("promo_banners", "max");
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

  if (!hasSupabaseEnv()) {
    return { ok: false, error: "Base de datos no configurada." };
  }

  const guard = await requireAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };
  const supabase = await createClient();

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
    if (isUniqueViolation(error)) {
      return { ok: false, error: "Ya existe un producto con ese slug." };
    }
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

  if (!hasSupabaseEnv()) {
    return { ok: false, error: "Base de datos no configurada." };
  }

  const guard = await requireAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };
  const supabase = await createClient();

  const categoryId = await categoryIdForSlug(supabase, parsed.data.categorySlug);
  if (!categoryId) {
    return { ok: false, error: "Categoría no encontrada." };
  }

  const { data, error } = await supabase
    .from("products")
    .update(toRow(parsed.data, categoryId))
    .eq("id", id)
    .select("id");

  if (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, error: "Ya existe un producto con ese slug." };
    }
    return { ok: false, error: "No pudimos actualizar el producto." };
  }
  if (!data || data.length === 0) {
    return { ok: false, error: "No se encontró el registro." };
  }

  revalidateStorefrontAndAdmin();
  revalidatePath(`/admin/products/${id}`);
  return { ok: true, productId: id };
}

export async function deleteProduct(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!hasSupabaseEnv()) {
    return { ok: false, error: "Base de datos no configurada." };
  }

  const guard = await requireAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) {
    if (isForeignKeyViolation(error)) {
      return {
        ok: false,
        error:
          "No se puede eliminar: el producto tiene pedidos asociados. Desactívalo (Activo = off) en lugar de eliminarlo.",
      };
    }
    return { ok: false, error: "No pudimos eliminar el producto." };
  }
  if (!data || data.length === 0) {
    return { ok: false, error: "No se encontró el registro." };
  }

  revalidateStorefrontAndAdmin();
  return { ok: true };
}
