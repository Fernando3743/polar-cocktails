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

/**
 * Server-trusted order summary returned by createOrder. Every amount is
 * recomputed server-side (DB `create_order` jsonb, or seed prices in demo
 * mode) — client-sent unit prices are never reflected here. The confirmation
 * page and the WhatsApp message are built from this, not from cart state.
 */
export type OrderSummary = {
  shortCode: string | null;
  items: {
    productId: string;
    productName: string;
    qty: number;
    unitPriceCop: number;
    lineTotalCop: number;
  }[];
  subtotalCop: number;
  discountCop: number;
  totalCop: number;
  promoCode: string | null;
};

export type CreateOrderResult =
  | { ok: true; orderId: string; summary: OrderSummary }
  | { ok: false; error: string };

// Shape of the jsonb returned by the `create_order` RPC (snake_case, all
// fields server-computed and authoritative).
type CreateOrderRpcResult = {
  short_code: string;
  items: {
    product_id: string;
    product_name: string;
    qty: number;
    unit_price_cop: number;
    line_total_cop: number;
  }[];
  subtotal_cop: number;
  discount_total: number;
  promo_code: string | null;
  total_cop: number;
};

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
    const summaryItems: OrderSummary["items"] = [];
    let subtotal = 0;
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
      const lineTotal = product.priceCop * item.qty;
      summaryItems.push({
        productId: product.id,
        productName: product.name,
        qty: item.qty,
        unitPriceCop: product.priceCop, // seed price, never the client value
        lineTotalCop: lineTotal,
      });
      subtotal += lineTotal;
    }
    if (subtotal <= 0) {
      return { ok: false, error: "Tu carrito está vacío." };
    }
    // Re-validate the promo server-side; never trust a client-sent discount.
    let discountCop = 0;
    let promoCode: string | null = null;
    if (data.promoCode) {
      const v = validateSeedPromo(data.promoCode, subtotal);
      if (!v.valid) {
        return { ok: false, error: v.reason ?? "Código no válido." };
      }
      discountCop = v.discountCop;
      promoCode = data.promoCode;
    }
    // Nothing is persisted in demo mode; still return a generated id and the
    // same server-trusted summary shape the DB branch produces.
    return {
      ok: true,
      orderId: randomUUID(),
      summary: {
        shortCode: null, // demo has no short code
        items: summaryItems,
        subtotalCop: subtotal,
        discountCop,
        totalCop: Math.max(0, subtotal - discountCop),
        promoCode,
      },
    };
  }

  // --- With a database: insert atomically via the create_order RPC. -------
  const supabase = await createClient();
  const { data: rpcResult, error } = await supabase.rpc("create_order", {
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

  if (error || !rpcResult) {
    // The RPC raises typed tokens; surface useful Spanish copy for each.
    // Note (locked decision #4): create_order no longer raises for promo
    // problems — a bad code is soft-dropped (no discount) and the order is
    // still created — so `invalid_promo` no longer reaches this path.
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
    return { ok: false, error: "No pudimos crear tu pedido. Intenta de nuevo." };
  }

  // The RPC returns an authoritative jsonb summary; map snake_case -> camelCase.
  const r = rpcResult as CreateOrderRpcResult;
  const summary: OrderSummary = {
    shortCode: r.short_code,
    items: (r.items ?? []).map((it) => ({
      productId: it.product_id,
      productName: it.product_name,
      qty: it.qty,
      unitPriceCop: it.unit_price_cop,
      lineTotalCop: it.line_total_cop,
    })),
    subtotalCop: r.subtotal_cop,
    discountCop: r.discount_total,
    totalCop: r.total_cop,
    promoCode: r.promo_code,
  };

  // The route param is the human-friendly short code (what the confirmation
  // page looks up / displays).
  return { ok: true, orderId: r.short_code, summary };
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
