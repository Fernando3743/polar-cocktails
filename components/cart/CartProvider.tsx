"use client";

import {
  createContext,
  use,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";
import type { CartItem, Combo, Product } from "@/lib/types";

const STORAGE_KEY = "polar_cart";

// Cart lines carry the product's stock at add-time so the drawer can cap the
// "+" stepper. `stockQty` is null/undefined when the product is untracked
// (no cap). It is structurally compatible with CartItem, so existing
// CartItem consumers are unaffected.
export type CartLineItem = CartItem & { stockQty?: number | null };

// A normalized add payload: everything a cart line needs except its quantity.
// Both products and combos collapse to this shape before they enter the cart.
type AddPayload = Omit<CartLineItem, "qty">;

function productToPayload(product: Product): AddPayload {
  return {
    kind: "product",
    productId: product.id,
    name: product.name,
    unitPriceCop: product.priceCop,
    accentColor: product.accentColor,
    imageUrl: product.imageUrl,
    stockQty: product.stockQty ?? null,
  };
}

function comboToPayload(combo: Combo): AddPayload {
  return {
    kind: "combo",
    productId: combo.id,
    name: combo.name,
    unitPriceCop: combo.priceCop,
    accentColor: combo.accentColor,
    imageUrl: combo.imageUrl,
    stockQty: null, // combos are untracked (only a sold_out flag)
  };
}

type CartState = {
  items: CartLineItem[];
  mounted: boolean;
};

type CartAction =
  | { type: "HYDRATE"; items: CartLineItem[] }
  | { type: "ADD"; payload: AddPayload }
  | { type: "REMOVE"; productId: string }
  | { type: "SET_QTY"; productId: string; qty: number }
  | { type: "CLEAR" };

// Clamp a requested qty to the product's stock when it is tracked. A null
// stock (untracked) imposes no cap. Never returns less than 1.
function clampToStock(qty: number, stockQty: number | null | undefined): number {
  if (stockQty == null) return Math.max(1, qty);
  return Math.max(1, Math.min(qty, stockQty));
}

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "HYDRATE":
      // Hydration also flips the mounted flag so the count badge only
      // renders client-side, avoiding an SSR hydration mismatch.
      return { items: action.items, mounted: true };

    case "ADD": {
      const { payload } = action;
      const stockQty = payload.stockQty ?? null;
      const existing = state.items.find(
        (item) => item.productId === payload.productId,
      );
      if (existing) {
        return {
          ...state,
          items: state.items.map((item) =>
            item.productId === payload.productId
              ? {
                  ...item,
                  // Refresh stock from the latest add and clamp the bump.
                  stockQty,
                  qty: clampToStock(item.qty + 1, stockQty),
                }
              : item,
          ),
        };
      }
      const newItem: CartLineItem = {
        ...payload,
        stockQty,
        qty: clampToStock(1, stockQty),
      };
      return { ...state, items: [...state.items, newItem] };
    }

    case "REMOVE":
      return {
        ...state,
        items: state.items.filter(
          (item) => item.productId !== action.productId,
        ),
      };

    case "SET_QTY": {
      // A qty of 0 (or less) removes the line entirely.
      if (action.qty <= 0) {
        return {
          ...state,
          items: state.items.filter(
            (item) => item.productId !== action.productId,
          ),
        };
      }
      return {
        ...state,
        items: state.items.map((item) =>
          item.productId === action.productId
            ? { ...item, qty: clampToStock(action.qty, item.stockQty) }
            : item,
        ),
      };
    }

    case "CLEAR":
      return { ...state, items: [] };

    default:
      return state;
  }
}

interface CartContextValue {
  items: CartLineItem[];
  addItem: (product: Product) => void;
  addCombo: (combo: Combo) => void;
  removeItem: (productId: string) => void;
  setQty: (productId: string, qty: number) => void;
  clear: () => void;
  itemCount: number;
  subtotalCop: number;
  mounted: boolean;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

// Strict shape + value validation for a persisted cart line. Rejects
// non-integer/non-positive quantities and non-finite/non-integer/negative
// prices, and requires the imagery fields, so corrupt or stale localStorage
// data can never re-enter the cart. `stockQty` is normalized to a number,
// null, or undefined.
function isValidCartLine(item: unknown): item is CartLineItem {
  if (typeof item !== "object" || item === null) return false;
  const candidate = item as Record<string, unknown>;
  return (
    (candidate.kind === undefined ||
      candidate.kind === "product" ||
      candidate.kind === "combo") &&
    typeof candidate.productId === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.unitPriceCop === "number" &&
    Number.isFinite(candidate.unitPriceCop) &&
    Number.isInteger(candidate.unitPriceCop) &&
    candidate.unitPriceCop >= 0 &&
    typeof candidate.qty === "number" &&
    Number.isInteger(candidate.qty) &&
    candidate.qty > 0 &&
    typeof candidate.accentColor === "string" &&
    (candidate.imageUrl === null || typeof candidate.imageUrl === "string") &&
    (candidate.stockQty == null ||
      (typeof candidate.stockQty === "number" &&
        Number.isInteger(candidate.stockQty) &&
        candidate.stockQty >= 0))
  );
}

function loadFromStorage(): CartLineItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Defensive: drop any line that fails strict validation, normalizing
    // stockQty in the same pass.
    return parsed.reduce<CartLineItem[]>((acc, item) => {
      if (isValidCartLine(item)) {
        // Default kind for carts persisted before combos existed.
        acc.push({ ...item, kind: item.kind ?? "product", stockQty: item.stockQty ?? null });
      }
      return acc;
    }, []);
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, {
    items: [],
    mounted: false,
  });
  const [isOpen, setIsOpen] = useState(false);
  const { mounted } = state;

  // Hydrate from localStorage after mount to avoid SSR mismatch.
  useEffect(() => {
    dispatch({ type: "HYDRATE", items: loadFromStorage() });
  }, []);

  // Cross-tab sync: when another tab writes the cart key, re-hydrate from
  // storage so every open tab stays consistent. The storage event only fires
  // in other tabs, so this never loops with the persist effect below.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY) return;
      dispatch({ type: "HYDRATE", items: loadFromStorage() });
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Persist on every change, but only after hydration so we never
  // clobber stored data with the empty initial state.
  useEffect(() => {
    if (!mounted) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
    } catch {
      // Ignore quota / privacy-mode write failures.
    }
  }, [state.items, mounted]);

  const value = useMemo<CartContextValue>(() => {
    const itemCount = state.items.reduce((sum, item) => sum + item.qty, 0);
    const subtotalCop = state.items.reduce(
      (sum, item) => sum + item.unitPriceCop * item.qty,
      0,
    );
    return {
      items: state.items,
      addItem: (product) =>
        dispatch({ type: "ADD", payload: productToPayload(product) }),
      addCombo: (combo) =>
        dispatch({ type: "ADD", payload: comboToPayload(combo) }),
      removeItem: (productId) => dispatch({ type: "REMOVE", productId }),
      setQty: (productId, qty) => dispatch({ type: "SET_QTY", productId, qty }),
      clear: () => dispatch({ type: "CLEAR" }),
      itemCount,
      subtotalCop,
      mounted,
      isOpen,
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
    };
  }, [state.items, mounted, isOpen]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = use(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return ctx;
}
