"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { SEED_PRODUCTS, validateSeedPromo } from "@/lib/seed-data";
import { orderSchema } from "@/lib/validation/schemas";
import type {
  OrderInput,
  OrderStatus,
  PromoType,
  PromoValidation,
} from "@/lib/types";

export type CreateOrderResult =
  | { ok: true; orderId: string }
  | { ok: false; error: string };

/**
 * Validates a promo code against a subtotal (in COP). Used by the checkout
 * "Aplicar" button. In demo mode this checks SEED_PROMOS; with a database it
 * calls the anon-safe `validate_promo` RPC (no direct table read needed).
 * Never trusts a client-sent discount — only the code is provided.
 */
export async function validatePromo(
  code: string,
  subtotalCop: number,
): Promise<PromoValidation> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) {
    return {
      valid: false,
      type: null,
      value: null,
      discountCop: 0,
      reason: "Ingresa un código.",
    };
  }

  // Demo mode: validate against the seed list.
  if (!hasSupabaseEnv()) {
    return validateSeedPromo(normalized, subtotalCop);
  }

  // DB mode: anon-safe RPC (no table read access needed).
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("validate_promo", {
    p_code: normalized,
    p_subtotal: subtotalCop,
  });
  if (error || !data) {
    return {
      valid: false,
      type: null,
      value: null,
      discountCop: 0,
      reason: "Código no válido.",
    };
  }
  const row = data as {
    valid: boolean;
    type: PromoType | null;
    value: number | null;
    discount: number;
    reason: string | null;
  };
  return {
    valid: row.valid,
    type: row.type,
    value: row.value,
    discountCop: row.discount ?? 0,
    reason: row.reason, // RPC returns Spanish reasons
  };
}

/**
 * Creates an order. The price of every line is re-fetched server-side
 * (from the DB, or from SEED_PRODUCTS in demo mode) and all totals are
 * recomputed here — client-supplied prices are never trusted.
 *
 * With a database: delegates to the `create_order` SECURITY DEFINER RPC so the
 * order and its items are inserted atomically. Without a database: validates,
 * recomputes the total, and returns a generated id so the checkout demo works.
 */
export async function createOrder(
  input: OrderInput,
): Promise<CreateOrderResult> {
  const parsed = orderSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message ?? "Datos inválidos." };
  }

  const data = parsed.data;

  // --- Demo mode (no database): price against the seed catalog. -----------
  if (!hasSupabaseEnv()) {
    let total = 0;
    for (const item of data.items) {
      const product = SEED_PRODUCTS.find(
        (p) => p.id === item.productId && p.isActive,
      );
      if (!product || product.soldOut) {
        return {
          ok: false,
          error: `${product?.name ?? "Un producto"} no está disponible por ahora.`,
        };
      }
      if (product.stockQty != null && product.stockQty < item.qty) {
        return {
          ok: false,
          error: `No hay suficiente stock de ${product.name}.`,
        };
      }
      total += product.priceCop * item.qty;
    }
    if (total <= 0) {
      return { ok: false, error: "Tu carrito está vacío." };
    }
    // Re-validate the promo server-side; never trust a client-sent discount.
    if (data.promoCode) {
      const v = validateSeedPromo(data.promoCode, total);
      if (!v.valid) {
        return { ok: false, error: v.reason ?? "Código no válido." };
      }
    }
    // finalTotal = Math.max(0, total - discount) for parity, but nothing is
    // persisted in demo mode; still return a generated id.
    return { ok: true, orderId: randomUUID() };
  }

  // --- With a database: insert atomically via the create_order RPC. -------
  const supabase = await createClient();
  const { data: orderId, error } = await supabase.rpc("create_order", {
    payload: {
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      address: data.address ?? null,
      deliveryType: data.deliveryType,
      notes: data.notes ?? null,
      promoCode: data.promoCode ?? null,
      items: data.items.map((item) => ({
        productId: item.productId,
        qty: item.qty,
      })),
    },
  });

  if (error || !orderId) {
    // The RPC raises typed tokens; surface useful Spanish copy for each.
    const code = error?.message ?? "";
    if (code.includes("product_sold_out")) {
      return {
        ok: false,
        error:
          "Uno de los productos ya no está disponible. Actualiza tu carrito.",
      };
    }
    if (code.includes("insufficient_stock")) {
      return {
        ok: false,
        error: "No hay suficiente stock de uno de los productos.",
      };
    }
    if (code.includes("invalid_promo")) {
      return { ok: false, error: "El código de descuento no es válido." };
    }
    return { ok: false, error: "No pudimos crear tu pedido. Intenta de nuevo." };
  }

  return { ok: true, orderId: orderId as string };
}

/**
 * Admin: change an order's status. Guarded by getUser() (RLS also enforces
 * that only authenticated users can update orders).
 */
export async function updateOrderStatus(
  id: string,
  status: OrderStatus,
): Promise<{ ok: boolean; error?: string }> {
  if (!hasSupabaseEnv()) {
    return { ok: false, error: "Base de datos no configurada." };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "No autorizado." };
  }

  const { error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", id);

  if (error) {
    return { ok: false, error: "No pudimos actualizar el estado." };
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin");
  return { ok: true };
}
