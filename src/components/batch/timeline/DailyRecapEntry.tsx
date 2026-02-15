import type { DailyRecapData } from "@/types";
import { formatDate } from "@/lib/utils";

interface DailyRecapEntryProps {
  data: DailyRecapData;
}

function MiniSparkline({ data }: { data: DailyRecapData }) {
  // Simple inline SVG sparkline — no library needed
  const gravityDelta = data.gravityDelta;
  if (gravityDelta === 0) return null;

  // Simple two-point sparkline showing opening → closing
  const width = 80;
  const height = 24;
  const padding = 2;

  // If gravity dropped (normal fermentation), line goes down
  // If gravity rose (unusual), line goes up
  const y1 = gravityDelta >= 0 ? padding : height - padding;
  const y2 = gravityDelta >= 0 ? height - padding : padding;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="inline-block align-middle"
      aria-hidden="true"
    >
      <line
        x1={padding}
        y1={y1}
        x2={width - padding}
        y2={y2}
        stroke="#8b3f58"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <circle cx={padding} cy={y1} r={2} fill="#8b3f58" />
      <circle cx={width - padding} cy={y2} r={2} fill="#a8677a" />
    </svg>
  );
}

export function DailyRecapEntry({ data }: DailyRecapEntryProps) {
  const dateStr = formatDate(data.date + "T12:00:00Z");

  const gravityMoved = data.gravityDelta !== 0;
  const tempStable =
    data.tempRange && data.tempRange.max - data.tempRange.min <= 4;

  return (
    <div className="space-y-2">
      {/* Day header */}
      <p className="font-display text-sm font-medium text-wine-800">
        Day {data.dayNumber} — {dateStr}
      </p>

      {/* Gravity summary */}
      <p className="text-sm text-parchment-800/80">
        {gravityMoved ? (
          <>
            SG moved from{" "}
            <span className="font-mono text-wine-800">{data.openingGravity.toFixed(3)}</span>
            {" to "}
            <span className="font-mono text-wine-800">{data.closingGravity.toFixed(3)}</span>
            <span className="text-parchment-600">
              {" "}({data.gravityDelta > 0 ? "+" : ""}{data.gravityDelta.toFixed(4)})
            </span>
          </>
        ) : (
          <>
            SG steady at{" "}
            <span className="font-mono text-wine-800">{data.openingGravity.toFixed(3)}</span>
          </>
        )}
      </p>

      {/* Temperature summary */}
      {data.avgTemperature != null && (
        <p className="text-sm text-parchment-800/80">
          {tempStable ? "Temperature stable at" : "Temperature averaged"}{" "}
          <span className="font-mono text-wine-800">
            {data.avgTemperature}°{data.tempUnit}
          </span>
          {data.tempRange && data.tempRange.max !== data.tempRange.min && (
            <span className="text-parchment-600">
              {" "}(+/- {Math.round((data.tempRange.max - data.tempRange.min) / 2)}°{data.tempUnit})
            </span>
          )}
        </p>
      )}

      {/* Reading count + sparkline */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-parchment-600">
          {data.readingCount} reading{data.readingCount !== 1 ? "s" : ""}
        </span>
        <MiniSparkline data={data} />
      </div>
    </div>
  );
}
