"use client";

import { createContext, use, useMemo, useState } from "react";

interface MobileMenuContextValue {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  toggleMobileMenu: () => void;
}

const MobileMenuContext = createContext<MobileMenuContextValue | null>(null);

export function MobileMenuProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const value = useMemo<MobileMenuContextValue>(
    () => ({
      mobileMenuOpen,
      setMobileMenuOpen,
      toggleMobileMenu: () => setMobileMenuOpen((open) => !open),
    }),
    [mobileMenuOpen],
  );

  return (
    <MobileMenuContext.Provider value={value}>
      {children}
    </MobileMenuContext.Provider>
  );
}

export function useMobileMenu(): MobileMenuContextValue {
  const ctx = use(MobileMenuContext);
  if (!ctx) {
    throw new Error("useMobileMenu must be used within a MobileMenuProvider");
  }
  return ctx;
}
