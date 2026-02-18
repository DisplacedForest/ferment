"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from "recharts";
import type { BatchPhase } from "@/types";

interface ChartReading {
  recordedAt: string;
  gravity: number;
  temperature: number | null;
}

interface FermentationChartProps {
  batchUuid: string;
  phases?: BatchPhase[];
  accentColor?: string;
}

type TimeRange = "all" | "7d" | "30d";

export function FermentationChart({ batchUuid, phases, accentColor }: FermentationChartProps) {
  const lineColor = accentColor ?? "#8b3f58";
  const lineColorDark = accentColor ? accentColor : "#722e46";
  const [readings, setReadings] = useState<ChartReading[]>([]);
  const [manualReadings, setManualReadings] = useState<ChartReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [showAuto, setShowAuto] = useState(true);
  const [showManual, setShowManual] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Fetch auto readings
        const readingsRes = await fetch(`/api/v1/batches/${batchUuid}/readings?resolution=raw`);
        if (readingsRes.ok) {
          const data = await readingsRes.json();
          setReadings(data.readings ?? []);
        }

        // Fetch manual readings from timeline
        const timelineRes = await fetch(
          `/api/v1/batches/${batchUuid}/timeline?type=reading&limit=100`
        );
        if (timelineRes.ok) {
          const data = await timelineRes.json();
          const manual: ChartReading[] = (data.entries ?? [])
            .filter((e: Record<string, unknown>) => {
              const d = e.data as Record<string, unknown>;
              return d?.gravity != null;
            })
            .map((e: Record<string, unknown>) => {
              const d = e.data as Record<string, unknown>;
              return {
                recordedAt: e.createdAt as string,
                gravity: d.gravity as number,
                temperature: (d.temperature as number) ?? null,
              };
            });
          setManualReadings(manual);
        }
      } catch (err) {
        console.error("Failed to fetch chart data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [batchUuid]);

  const chartData = useMemo(() => {
    // Merge auto + manual readings, sort by time
    const combined: Array<{
      time: number;
      recordedAt: string;
      autoGravity?: number;
      autoTemp?: number;
      manualGravity?: number;
      manualTemp?: number;
    }> = [];

    if (showAuto) {
      for (const r of readings) {
        combined.push({
          time: new Date(r.recordedAt).getTime(),
          recordedAt: r.recordedAt,
          autoGravity: r.gravity,
          autoTemp: r.temperature ?? undefined,
        });
      }
    }

    if (showManual) {
      for (const r of manualReadings) {
        combined.push({
          time: new Date(r.recordedAt).getTime(),
          recordedAt: r.recordedAt,
          manualGravity: r.gravity,
          manualTemp: r.temperature ?? undefined,
        });
      }
    }

    combined.sort((a, b) => a.time - b.time);

    // Apply time range filter
    if (timeRange !== "all" && combined.length > 0) {
      const now = Date.now();
      const cutoff = timeRange === "7d" ? now - 7 * 86400000 : now - 30 * 86400000;
      return combined.filter((d) => d.time >= cutoff);
    }

    return combined;
  }, [readings, manualReadings, timeRange, showAuto, showManual]);

  // Compute phase boundaries for reference lines
  const phaseLines = useMemo(() => {
    if (!phases) return [];
    return phases
      .filter((p) => p.startedAt)
      .map((p) => ({
        time: new Date(p.startedAt!).getTime(),
        name: p.name,
      }));
  }, [phases]);

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-parchment-700">
        Loading chart data...
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-parchment-700">
        No readings yet. Log a reading or connect a hydrometer to see the fermentation curve.
      </div>
    );
  }

  return (
    <div>
      {/* Controls */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded border border-parchment-300/80 p-0.5">
          {(["all", "7d", "30d"] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                timeRange === range
                  ? "bg-wine-500 text-parchment-100"
                  : "text-parchment-700 hover:text-wine-600"
              }`}
            >
              {range === "all" ? "All" : range}
            </button>
          ))}
        </div>

        <div className="flex gap-3 text-xs">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={showAuto}
              onChange={(e) => setShowAuto(e.target.checked)}
              className="accent-wine-500"
            />
            <span className="text-parchment-700">Auto readings</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={showManual}
              onChange={(e) => setShowManual(e.target.checked)}
              className="accent-wine-500"
            />
            <span className="text-parchment-700">Manual readings</span>
          </label>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[300px] sm:h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 8, right: 12, bottom: 8, left: -8 }}>
            <XAxis
              dataKey="time"
              type="number"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(val) => {
                const d = new Date(val);
                return `${d.getMonth() + 1}/${d.getDate()}`;
              }}
              tick={{ fontSize: 11, fill: "#8b7a6e" }}
              stroke="#efe3cc"
              tickLine={false}
            />

            {/* Gravity axis (left) */}
            <YAxis
              yAxisId="gravity"
              orientation="left"
              domain={["dataMin - 0.005", "dataMax + 0.005"]}
              tickFormatter={(val) => val.toFixed(3)}
              tick={{ fontSize: 11, fill: "#8b3f58", fontFamily: "JetBrains Mono, monospace" }}
              stroke="#efe3cc"
              tickLine={false}
              label={{
                value: "SG",
                angle: -90,
                position: "insideLeft",
                offset: 16,
                style: { fontSize: 11, fill: "#8b3f58" },
              }}
            />

            {/* Temperature axis (right) */}
            <YAxis
              yAxisId="temp"
              orientation="right"
              domain={["dataMin - 2", "dataMax + 2"]}
              tickFormatter={(val) => `${Math.round(val)}°`}
              tick={{ fontSize: 11, fill: "#b89a56", fontFamily: "JetBrains Mono, monospace" }}
              stroke="#efe3cc"
              tickLine={false}
              label={{
                value: "Temp",
                angle: 90,
                position: "insideRight",
                offset: 16,
                style: { fontSize: 11, fill: "#b89a56" },
              }}
            />

            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0]?.payload;
                if (!d) return null;

                const gravity = d.autoGravity ?? d.manualGravity;
                const temp = d.autoTemp ?? d.manualTemp;
                const time = new Date(d.time);

                return (
                  <div className="rounded-md border border-parchment-300/80 bg-parchment-50 px-3 py-2 shadow-[0_2px_8px_rgba(46,14,29,0.08)]">
                    <p className="text-xs text-parchment-700 mb-1">
                      {time.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                    {gravity != null && (
                      <p className="font-mono text-sm text-wine-800">
                        {gravity.toFixed(3)} SG
                      </p>
                    )}
                    {temp != null && (
                      <p className="font-mono text-xs text-parchment-600">
                        {temp.toFixed(1)}°F
                      </p>
                    )}
                    {d.manualGravity != null && (
                      <p className="text-[10px] text-parchment-600 mt-0.5">manual</p>
                    )}
                  </div>
                );
              }}
            />

            {/* Phase boundary lines */}
            {phaseLines.map((pl) => (
              <ReferenceLine
                key={pl.time}
                x={pl.time}
                yAxisId="gravity"
                stroke="rgba(139, 63, 88, 0.2)"
                strokeDasharray="4 4"
                label={{
                  value: pl.name,
                  position: "top",
                  style: { fontSize: 10, fill: "#8b7a6e" },
                }}
              />
            ))}

            {/* Auto gravity line */}
            {showAuto && (
              <Line
                yAxisId="gravity"
                type="monotone"
                dataKey="autoGravity"
                stroke={lineColor}
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            )}

            {/* Manual gravity dots */}
            {showManual && (
              <Line
                yAxisId="gravity"
                type="monotone"
                dataKey="manualGravity"
                stroke={lineColorDark}
                strokeWidth={0}
                dot={{ r: 4, fill: lineColorDark, stroke: "#fdf9f3", strokeWidth: 2 }}
                connectNulls={false}
              />
            )}

            {/* Temperature area */}
            {showAuto && (
              <Area
                yAxisId="temp"
                type="monotone"
                dataKey="autoTemp"
                stroke="#b89a56"
                strokeWidth={1.5}
                fill="rgba(184, 154, 86, 0.08)"
                dot={false}
                connectNulls
              />
            )}

            {showManual && (
              <Line
                yAxisId="temp"
                type="monotone"
                dataKey="manualTemp"
                stroke="#b89a56"
                strokeWidth={0}
                dot={{ r: 3, fill: "#b89a56", stroke: "#fdf9f3", strokeWidth: 1.5 }}
                connectNulls={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
