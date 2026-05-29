"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { SEED_PRODUCTS } from "@/lib/seed-data";
import { orderSchema } from "@/lib/validation/schemas";
import type { OrderInput, OrderStatus } from "@/lib/types";

export type CreateOrderResult =
  | { ok: true; orderId: string }
  | { ok: false; error: string };

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
      if (!product) {
        return { ok: false, error: "Uno de los productos no está disponible." };
      }
      total += product.priceCop * item.qty;
    }
    if (total <= 0) {
      return { ok: false, error: "Tu carrito está vacío." };
    }
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
      items: data.items.map((item) => ({
        productId: item.productId,
        qty: item.qty,
      })),
    },
  });

  if (error || !orderId) {
    return {
      ok: false,
      error: "No pudimos crear tu pedido. Intenta de nuevo.",
    };
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
