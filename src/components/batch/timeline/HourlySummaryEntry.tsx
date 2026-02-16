import type { HourlySummaryData } from "@/types";

interface HourlySummaryEntryProps {
  data: HourlySummaryData;
}

export function HourlySummaryEntry({ data }: HourlySummaryEntryProps) {
  const gravityMoved = data.startGravity !== data.endGravity;
  const delta = data.startGravity - data.endGravity;

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-parchment-700">
        {data.hourLabel}
      </p>

      <p className="text-sm text-parchment-800/80">
        {gravityMoved ? (
          <>
            <span className="font-mono text-wine-800">
              {data.startGravity.toFixed(3)}
            </span>
            {" → "}
            <span className="font-mono text-wine-800">
              {data.endGravity.toFixed(3)}
            </span>
            <span className="text-parchment-600">
              {" "}
              SG ({delta > 0 ? "-" : "+"}
              {Math.abs(delta).toFixed(4)})
            </span>
          </>
        ) : (
          <>
            Steady at{" "}
            <span className="font-mono text-wine-800">
              {data.startGravity.toFixed(3)} SG
            </span>
          </>
        )}
      </p>

      {data.avgTemperature != null && (
        <p className="text-sm text-parchment-800/80">
          Avg{" "}
          <span className="font-mono text-wine-800">
            {data.avgTemperature}°{data.tempUnit}
          </span>
        </p>
      )}

      <p className="text-xs text-parchment-600">
        {data.readingCount} reading{data.readingCount !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
