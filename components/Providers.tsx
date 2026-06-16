"use client";

import { CartProvider } from "@/components/cart/CartProvider";
import { MobileMenuProvider } from "@/components/layout/MobileMenuProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <MobileMenuProvider>{children}</MobileMenuProvider>
    </CartProvider>
  );
}
