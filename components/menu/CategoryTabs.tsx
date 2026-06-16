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
    <div className="-mx-5 overflow-x-auto px-5 pb-1 [scrollbar-width:none] md:mx-0 md:overflow-visible md:px-0 md:pb-0 [&::-webkit-scrollbar]:hidden">
      <div className="flex w-max min-w-full flex-nowrap justify-start gap-2 md:w-full md:flex-wrap md:justify-center md:gap-[14px]">
        {tabs.map((tab) => {
          const isActive = active === tab.slug;
          return (
            <button
              key={tab.slug}
              type="button"
              onClick={() => onChange(tab.slug)}
              aria-pressed={isActive}
              className={clsx(
                "h-[34px] shrink-0 px-[14px] text-[12px] md:min-w-[86px] md:px-[21px] md:text-[13px]",
                isActive ? "pill-active" : "pill-inactive",
              )}
            >
              {tab.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
