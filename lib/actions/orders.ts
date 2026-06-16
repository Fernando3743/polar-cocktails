"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { requireAdmin } from "@/lib/auth";
import { SEED_PRODUCTS } from "@/lib/seed-data";
import { orderSchema, orderStatusSchema } from "@/lib/validation/schemas";
import type { OrderInput, OrderStatus } from "@/lib/types";

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
  totalCop: number;
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
  total_cop: number;
};

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
    // Nothing is persisted in demo mode; still return a generated id and the
    // same server-trusted summary shape the DB branch produces.
    return {
      ok: true,
      orderId: randomUUID(),
      summary: {
        shortCode: null, // demo has no short code
        items: summaryItems,
        subtotalCop: subtotal,
        totalCop: subtotal,
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
      items: data.items.map((item) => ({
        productId: item.productId,
        qty: item.qty,
      })),
    },
  });

  if (error || !rpcResult) {
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
    totalCop: r.total_cop,
  };

  // The route param is the human-friendly short code (what the confirmation
  // page looks up / displays).
  return { ok: true, orderId: r.short_code, summary };
}

/**
 * Admin: change an order's status. Gated by requireAdmin() (validates the JWT
 * and, when ADMIN_EMAIL is set, the admin identity); RLS also enforces that
 * only authenticated users can update orders. Inputs are validated server-side
 * before touching Supabase: the id must be non-empty and the status must be a
 * known order status.
 */
export async function updateOrderStatus(
  id: string,
  status: OrderStatus,
): Promise<{ ok: boolean; error?: string }> {
  // SEC-2: validate inputs before any Supabase access. Reject an empty/invalid
  // id and an out-of-range status (the param is typed, but a Server Action is a
  // network boundary, so the value cannot be trusted).
  if (typeof id !== "string" || id.trim().length === 0) {
    return { ok: false, error: "Pedido inválido." };
  }
  if (!orderStatusSchema.safeParse(status).success) {
    return { ok: false, error: "Estado inválido." };
  }

  if (!hasSupabaseEnv()) {
    return { ok: false, error: "Base de datos no configurada." };
  }

  // SEC-1: gate the mutation through the shared admin guard.
  const guard = await requireAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };

  const supabase = await createClient();
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
