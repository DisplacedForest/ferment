"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const statusFilters = [
  { label: "All", value: "" },
  { label: "Active", value: "active" },
  { label: "Completed", value: "completed" },
] as const;

const sortOptions = [
  { label: "Last updated", value: "updatedAt" },
  { label: "Name", value: "name" },
  { label: "Date created", value: "createdAt" },
] as const;

export function DashboardFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const currentStatus = searchParams.get("status") ?? "";
  const currentSort = searchParams.get("sort") ?? "updatedAt";

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      {/* Status filter — segmented control */}
      <div className="flex rounded border border-parchment-300/80 bg-parchment-50 p-0.5">
        {statusFilters.map((filter) => (
          <button
            key={filter.value}
            onClick={() => updateParam("status", filter.value)}
            className={cn(
              "rounded-sm px-3 py-1.5 text-sm font-medium transition-colors",
              currentStatus === filter.value
                ? "bg-wine-500 text-parchment-100 shadow-[0_1px_2px_rgba(46,14,29,0.12)]"
                : "text-parchment-800/70 hover:text-wine-600"
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Sort select */}
      <select
        value={currentSort}
        onChange={(e) => updateParam("sort", e.target.value)}
        className="rounded border border-parchment-300/80 bg-parchment-50 px-3 py-1.5 text-sm text-parchment-800/80 focus:border-wine-400 focus:outline-none focus:ring-1 focus:ring-wine-500/50"
      >
        {sortOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
