"use client";

import { createContext, use, useEffect, useMemo, useState } from "react";

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

  // Lock body scroll while the mobile menu is open so the page can't slide
  // behind the fixed drawer. Only the mobile menu ever sets this open.
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [mobileMenuOpen]);

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
