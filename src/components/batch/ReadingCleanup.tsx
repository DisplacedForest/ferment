"use client";

import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatGravity, timeAgo } from "@/lib/utils";
import type { HydrometerReading } from "@/types";
import type { OutlierDetectionResult, OutlierFlag } from "@/lib/hydrometer/outlier-detection";

interface ReadingCleanupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batchUuid: string;
  onCleanupApplied: () => void;
}

interface CleanupData {
  readings: HydrometerReading[];
  detection: OutlierDetectionResult;
  trimStart: string | null;
  trimEnd: string | null;
}

export function ReadingCleanup({
  open,
  onOpenChange,
  batchUuid,
  onCleanupApplied,
}: ReadingCleanupProps) {
  const [data, setData] = useState<CleanupData | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/v1/batches/${batchUuid}/cleanup`)
      .then((r) => r.json())
      .then((d: CleanupData) => {
        setData(d);
        // Pre-select auto-detected outliers
        const autoIds = new Set<number>();
        for (const o of d.detection.headOutliers) autoIds.add(o.id);
        for (const o of d.detection.tailOutliers) autoIds.add(o.id);
        for (const o of d.detection.midLogOutliers) autoIds.add(o.id);
        // Also include already-excluded readings
        for (const r of d.readings) {
          if (r.isExcluded) autoIds.add(r.id);
        }
        setSelectedIds(autoIds);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [open, batchUuid]);

  function toggleReading(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleApply() {
    if (!data) return;
    setApplying(true);

    // Determine which readings to exclude vs include
    const currentlyExcluded = new Set(data.readings.filter((r) => r.isExcluded).map((r) => r.id));
    const excludeIds: number[] = [];
    const includeIds: number[] = [];

    for (const r of data.readings) {
      const shouldExclude = selectedIds.has(r.id);
      if (shouldExclude && !currentlyExcluded.has(r.id)) {
        excludeIds.push(r.id);
      } else if (!shouldExclude && currentlyExcluded.has(r.id)) {
        includeIds.push(r.id);
      }
    }

    try {
      const res = await fetch(`/api/v1/batches/${batchUuid}/cleanup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          excludeIds,
          includeIds,
          excludeReason: "outlier_auto",
          trimStart: data.detection.cleanRangeStart,
          trimEnd: data.detection.cleanRangeEnd,
        }),
      });

      if (res.ok) {
        onCleanupApplied();
        onOpenChange(false);
      }
    } catch (err) {
      console.error("Cleanup apply error:", err);
    } finally {
      setApplying(false);
    }
  }

  const outlierMap = useMemo(() => {
    if (!data) return new Map<number, OutlierFlag>();
    const m = new Map<number, OutlierFlag>();
    for (const o of data.detection.headOutliers) m.set(o.id, o);
    for (const o of data.detection.tailOutliers) m.set(o.id, o);
    for (const o of data.detection.midLogOutliers) m.set(o.id, o);
    return m;
  }, [data]);

  const stats = useMemo(() => {
    if (!data) return { total: 0, excluded: 0, clean: 0 };
    return {
      total: data.readings.length,
      excluded: selectedIds.size,
      clean: data.readings.length - selectedIds.size,
    };
  }, [data, selectedIds]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display text-lg text-wine-800">
            Clean up readings
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="py-12 text-center text-sm text-parchment-700">
            Analyzing readings...
          </div>
        )}

        {data && !loading && (
          <div className="flex-1 overflow-hidden flex flex-col gap-4">
            {/* Summary */}
            <div className="flex gap-4 text-sm">
              <span className="text-parchment-700">
                <span className="font-mono text-wine-800">{stats.total}</span> total
              </span>
              <span className="text-parchment-700">
                <span className="font-mono text-[#a04040]">{stats.excluded}</span> flagged
              </span>
              <span className="text-parchment-700">
                <span className="font-mono text-[#5a8a5e]">{stats.clean}</span> clean
              </span>
            </div>

            {data.detection.totalFlagged === 0 && (
              <div className="rounded-md bg-[#e8f0e8] border border-[#c8ddc9] px-4 py-3">
                <p className="text-sm text-[#3d6b40]">
                  Readings look clean — no outliers detected.
                </p>
              </div>
            )}

            {/* Grouped outlier lists */}
            <div className="flex-1 overflow-y-auto space-y-4">
              {data.detection.headOutliers.length > 0 && (
                <OutlierGroup
                  label="Head (settling)"
                  outliers={data.detection.headOutliers}
                  selectedIds={selectedIds}
                  onToggle={toggleReading}
                />
              )}

              {data.detection.midLogOutliers.length > 0 && (
                <OutlierGroup
                  label="Mid-log spikes"
                  outliers={data.detection.midLogOutliers}
                  selectedIds={selectedIds}
                  onToggle={toggleReading}
                />
              )}

              {data.detection.tailOutliers.length > 0 && (
                <OutlierGroup
                  label="Tail (transfer)"
                  outliers={data.detection.tailOutliers}
                  selectedIds={selectedIds}
                  onToggle={toggleReading}
                />
              )}

              {/* All readings list for manual review */}
              <div>
                <p className="text-xs font-medium text-parchment-700 uppercase tracking-wide mb-2">
                  All readings
                </p>
                <div className="space-y-0.5 max-h-48 overflow-y-auto">
                  {data.readings.map((r) => {
                    const isOutlier = outlierMap.has(r.id);
                    const isSelected = selectedIds.has(r.id);

                    return (
                      <label
                        key={r.id}
                        className="flex items-center gap-3 px-2 py-1 rounded hover:bg-parchment-100 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleReading(r.id)}
                          className="accent-wine-500"
                        />
                        <span className="font-mono text-sm text-wine-800 w-20">
                          {formatGravity(r.gravity)}
                        </span>
                        <span className="text-xs text-parchment-600 flex-1">
                          {timeAgo(r.recordedAt)}
                        </span>
                        {isOutlier && (
                          <span className="text-[10px] text-[#a04040] font-medium">
                            {outlierMap.get(r.id)!.reason.replace("_", " ")}
                          </span>
                        )}
                        {r.isExcluded && !isOutlier && (
                          <span className="text-[10px] text-parchment-500">
                            excluded
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2 border-t border-parchment-300/60">
              <button
                type="button"
                onClick={handleApply}
                disabled={applying}
                className="rounded bg-wine-500 px-4 py-2 text-sm font-medium text-parchment-100 shadow-[0_1px_2px_rgba(46,14,29,0.12)] transition-colors hover:bg-wine-600 disabled:opacity-50"
              >
                {applying ? "Applying..." : `Exclude ${stats.excluded} readings`}
              </button>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded border border-parchment-300/80 px-4 py-2 text-sm font-medium text-parchment-700 transition-colors hover:border-parchment-400"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function OutlierGroup({
  label,
  outliers,
  selectedIds,
  onToggle,
}: {
  label: string;
  outliers: OutlierFlag[];
  selectedIds: Set<number>;
  onToggle: (id: number) => void;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-parchment-700 uppercase tracking-wide mb-1">
        {label} ({outliers.length})
      </p>
      <div className="space-y-0.5">
        {outliers.map((o) => (
          <label
            key={o.id}
            className="flex items-center gap-3 px-2 py-1 rounded hover:bg-parchment-100 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selectedIds.has(o.id)}
              onChange={() => onToggle(o.id)}
              className="accent-wine-500"
            />
            <span className="font-mono text-sm text-[#a04040] w-20">
              {formatGravity(o.gravity)}
            </span>
            <span className="text-xs text-parchment-600 flex-1">
              {timeAgo(o.recordedAt)}
            </span>
            <span className="font-mono text-xs text-parchment-500">
              {o.deviation > 0 ? `+${o.deviation.toFixed(3)}` : o.deviation.toFixed(3)} dev
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
