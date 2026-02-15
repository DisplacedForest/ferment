import Link from "next/link";
import { StatusBadge } from "./StatusBadge";
import { formatGravity, formatTemperature, timeAgo } from "@/lib/utils";
import type { BatchWithComputed } from "@/types";
import { cn } from "@/lib/utils";

export function BatchCard({ batch }: { batch: BatchWithComputed }) {
  const isArchived = batch.status === "archived";

  return (
    <Link
      href={`/batches/${batch.uuid}`}
      className={cn(
        "group block rounded-md border border-parchment-300/80 bg-parchment-50 px-5 py-4",
        "shadow-[0_1px_2px_rgba(46,14,29,0.04)] transition-all",
        "hover:border-parchment-400 hover:shadow-[0_2px_8px_rgba(46,14,29,0.08)]",
        isArchived && "opacity-60"
      )}
    >
      {/* Header: name + status */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-display text-lg leading-tight text-wine-800 group-hover:text-wine-600 transition-colors truncate">
            {batch.name}
          </h3>
          {batch.style && (
            <p className="mt-0.5 text-sm text-parchment-700 truncate">{batch.style}</p>
          )}
        </div>
        <StatusBadge status={batch.status} />
      </div>

      {/* Metrics row */}
      <div className="mt-4 flex items-baseline gap-4 flex-wrap">
        {batch.latestGravity && (
          <span className="font-mono text-lg text-wine-800">
            {formatGravity(batch.latestGravity)}
          </span>
        )}
        {batch.latestTemperature && (
          <span className="font-mono text-sm text-parchment-700">
            {formatTemperature(batch.latestTemperature)}
          </span>
        )}
        {batch.abv !== undefined && (
          <span className="font-mono text-sm text-parchment-700">
            {batch.abv}% ABV
          </span>
        )}
      </div>

      {/* Footer: day count + last activity */}
      <div className="mt-3 flex items-center justify-between text-xs text-parchment-700/80">
        <span>
          Day {batch.daysSinceStart}
          {batch.entryCount ? ` \u00b7 ${batch.entryCount} entries` : ""}
        </span>
        <span>{timeAgo(batch.updatedAt)}</span>
      </div>

      {/* Phase bar placeholder */}
      <div className="mt-3 flex gap-0.5">
        {[1, 2, 3, 4, 5].map((seg) => (
          <div
            key={seg}
            className="h-1.5 flex-1 rounded-sm bg-parchment-300/40"
          />
        ))}
      </div>
    </Link>
  );
}
