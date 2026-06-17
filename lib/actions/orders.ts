"use server";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { requireAdmin } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
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
 * Narrows the untyped jsonb the RPC returns to the expected summary shape.
 * Validates only the top-level fields createOrder reads — a cheap guard so a
 * malformed result degrades to the generic error instead of crashing the map.
 */
function isCreateOrderRpcResult(
  value: unknown,
): value is CreateOrderRpcResult {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.short_code === "string" &&
    Array.isArray(r.items) &&
    typeof r.subtotal_cop === "number" &&
    typeof r.total_cop === "number"
  );
}

/**
 * Collapses repeated productIds into one entry each, summing their quantities
 * while preserving first-seen order. Both pricing branches consume this so a
 * product that appears in several cart lines is priced once.
 */
function dedupeItemsByProductId(
  items: OrderInput["items"],
): OrderInput["items"] {
  const merged = new Map<string, { productId: string; qty: number }>();
  for (const item of items) {
    const existing = merged.get(item.productId);
    if (existing) {
      existing.qty += item.qty;
    } else {
      merged.set(item.productId, { productId: item.productId, qty: item.qty });
    }
  }
  return Array.from(merged.values());
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

  // Best-effort abuse barrier: cap order attempts per client IP before any
  // pricing or DB work. createOrder is callable unauthenticated, so this
  // throttles spam / amplification. Per-instance in-memory (see lib/rate-limit.ts);
  // back it with a shared store for strict multi-instance limits.
  const forwardedFor = (await headers()).get("x-forwarded-for") ?? "";
  const clientIp = forwardedFor.split(",")[0]?.trim() || "unknown";
  if (!rateLimit(`createOrder:${clientIp}`, 10, 60_000).ok) {
    return {
      ok: false,
      error: "Demasiados pedidos seguidos. Espera un momento e intenta de nuevo.",
    };
  }

  // De-duplicate by productId before pricing: a client could send the same
  // product across many lines, so merge their quantities into one line each.
  // Bounds amplification together with the per-array cap in orderSchema, and
  // keeps the demo and DB branches pricing an identical, normalized list.
  const items = dedupeItemsByProductId(data.items);

  // --- Demo mode (no database): price against the seed catalog. -----------
  if (!hasSupabaseEnv()) {
    const summaryItems: OrderSummary["items"] = [];
    let subtotal = 0;
    for (const item of items) {
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
      items: items.map((item) => ({
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
  // Lightly confirm the shape before trusting it; fall back to the generic
  // error if the RPC ever returns something unexpected.
  if (!isCreateOrderRpcResult(rpcResult)) {
    return { ok: false, error: "No pudimos crear tu pedido. Intenta de nuevo." };
  }
  const r = rpcResult;
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
 * Admin: change an order's status. Gated by requireAdmin(), which validates the
 * JWT (never getSession()) and passes when the user is the SUPER_ADMIN_EMAIL
 * super admin OR carries app_metadata.role in {admin, super_admin} — there is no
 * ADMIN_EMAIL fallback. RLS also enforces that only authenticated users can
 * update orders. Inputs are validated server-side before touching Supabase: the
 * id must be non-empty and the status must be a known order status.
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
  const { data, error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", id)
    .select("id");

  if (error) {
    return { ok: false, error: "No pudimos actualizar el estado." };
  }
  if (!data || data.length === 0) {
    return { ok: false, error: "No se encontró el registro." };
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin");
  return { ok: true };
}
