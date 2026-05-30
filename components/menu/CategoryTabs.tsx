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
    <div className="flex flex-nowrap justify-center gap-[5px] md:flex-wrap md:gap-[14px]">
      {tabs.map((tab) => {
        const isActive = active === tab.slug;
        return (
          <button
            key={tab.slug}
            type="button"
            onClick={() => onChange(tab.slug)}
            aria-pressed={isActive}
            className={clsx(
              "h-[28px] min-w-0 px-[8px] text-[10px] md:h-[34px] md:min-w-[86px] md:px-[21px] md:text-[13px]",
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
