"use client";

import {
  createContext,
  use,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";
import type { CartItem, Product } from "@/lib/types";

const STORAGE_KEY = "polar_cart";

type CartState = {
  items: CartItem[];
  mounted: boolean;
};

type CartAction =
  | { type: "HYDRATE"; items: CartItem[] }
  | { type: "ADD"; product: Product }
  | { type: "REMOVE"; productId: string }
  | { type: "SET_QTY"; productId: string; qty: number }
  | { type: "CLEAR" };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "HYDRATE":
      // Hydration also flips the mounted flag so the count badge only
      // renders client-side, avoiding an SSR hydration mismatch.
      return { items: action.items, mounted: true };

    case "ADD": {
      const { product } = action;
      const existing = state.items.find(
        (item) => item.productId === product.id,
      );
      if (existing) {
        return {
          ...state,
          items: state.items.map((item) =>
            item.productId === product.id
              ? { ...item, qty: item.qty + 1 }
              : item,
          ),
        };
      }
      const newItem: CartItem = {
        productId: product.id,
        name: product.name,
        unitPriceCop: product.priceCop,
        accentColor: product.accentColor,
        imageUrl: product.imageUrl,
        qty: 1,
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
            ? { ...item, qty: action.qty }
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
  items: CartItem[];
  addItem: (product: Product) => void;
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

function loadFromStorage(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Defensive: keep only well-formed items.
    return parsed.filter(
      (item): item is CartItem =>
        item &&
        typeof item.productId === "string" &&
        typeof item.name === "string" &&
        typeof item.unitPriceCop === "number" &&
        typeof item.qty === "number",
    );
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
      addItem: (product) => dispatch({ type: "ADD", product }),
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
