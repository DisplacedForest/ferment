import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { formatGravity, formatTemperature } from "@/lib/utils";
import type { BatchWithComputed } from "@/types";

export function StatusHeader({ batch }: { batch: BatchWithComputed }) {
  return (
    <div className="mb-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl tracking-tight text-wine-800 sm:text-3xl">
            {batch.name}
          </h1>
          {batch.style && (
            <p className="mt-1 text-parchment-700">{batch.style}</p>
          )}
        </div>
        <StatusBadge status={batch.status} />
      </div>

      {/* Metrics row */}
      <div className="mt-5 flex flex-wrap gap-6">
        {batch.latestGravity != null && (
          <div>
            <p className="text-xs text-parchment-700/80 uppercase tracking-wide">Gravity</p>
            <p className="font-mono text-lg text-wine-800">
              {formatGravity(batch.latestGravity)}
            </p>
          </div>
        )}
        {batch.latestTemperature != null && (
          <div>
            <p className="text-xs text-parchment-700/80 uppercase tracking-wide">Temp</p>
            <p className="font-mono text-lg text-wine-800">
              {formatTemperature(batch.latestTemperature)}
            </p>
          </div>
        )}
        {batch.abv != null && (
          <div>
            <p className="text-xs text-parchment-700/80 uppercase tracking-wide">ABV</p>
            <p className="font-mono text-lg text-wine-800">{batch.abv}%</p>
          </div>
        )}
        <div>
          <p className="text-xs text-parchment-700/80 uppercase tracking-wide">Day</p>
          <p className="font-mono text-lg text-wine-800">{batch.daysSinceStart}</p>
        </div>
        {batch.originalGravity != null && (
          <div>
            <p className="text-xs text-parchment-700/80 uppercase tracking-wide">OG</p>
            <p className="font-mono text-lg text-parchment-700">
              {formatGravity(batch.originalGravity)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
