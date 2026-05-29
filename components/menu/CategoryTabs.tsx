"use client";

import { clsx } from "clsx";
import type { Category } from "@/lib/types";

interface CategoryTabsProps {
  categories: Category[];
  /** The active category slug, or "all" for the virtual "Todos" tab. */
  active: string;
  onChange: (slug: string) => void;
}

export function CategoryTabs({
  categories,
  active,
  onChange,
}: CategoryTabsProps) {
  const tabs = [{ slug: "all", name: "Todos" }, ...categories];

  return (
    <div className="flex flex-wrap justify-center gap-[14px]">
      {tabs.map((tab) => {
        const isActive = active === tab.slug;
        return (
          <button
            key={tab.slug}
            type="button"
            onClick={() => onChange(tab.slug)}
            aria-pressed={isActive}
            className={clsx(
              "h-[34px] min-w-[86px] px-[21px] text-[13px]",
              isActive ? "pill-active" : "pill-inactive",
            )}
          >
            {tab.name}
          </button>
        );
      })}
    </div>
  );
}
