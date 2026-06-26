import type { CartItemKind } from "@/lib/types";

/**
 * The single source of truth for cart/order line identity. A line is keyed by
 * its kind plus its catalog id, so a product and a combo that happen to share
 * an id never collapse into the same line. Both the cart reducer and the order
 * dedupe step use this so identity stays consistent across the app.
 */
export function lineItemKey(kind: CartItemKind, id: string): string {
  return kind + ":" + id;
}
