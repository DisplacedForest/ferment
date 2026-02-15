"use client";

import { useState, useCallback } from "react";
import { TimelineEntryCard } from "./TimelineEntry";
import type { TimelineEntry } from "@/types";

interface TimelineProps {
  entries: TimelineEntry[];
  batchUuid: string;
  total: number;
}

export function Timeline({ entries: initialEntries, batchUuid, total }: TimelineProps) {
  const [entries, setEntries] = useState(initialEntries);
  const [loading, setLoading] = useState(false);
  const hasMore = entries.length < total;

  const loadMore = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/v1/batches/${batchUuid}/timeline?limit=50&offset=${entries.length}`
      );
      if (res.ok) {
        const data = await res.json();
        setEntries((prev) => [...prev, ...data.entries]);
      }
    } finally {
      setLoading(false);
    }
  }, [batchUuid, entries.length]);

  if (entries.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-parchment-700">No entries yet. Log your first reading.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Timeline rail */}
      <div className="relative space-y-1">
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-parchment-300/60" aria-hidden="true" />
        {entries.map((entry) => (
          <TimelineEntryCard key={entry.id} entry={entry} />
        ))}
      </div>

      {/* Load more */}
      {hasMore && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={loadMore}
            disabled={loading}
            className="rounded border border-parchment-300/80 bg-parchment-50 px-4 py-1.5 text-sm text-parchment-800/70 transition-colors hover:border-parchment-400 hover:text-wine-600 disabled:opacity-50"
          >
            {loading ? "Loading..." : `Load more (${total - entries.length} remaining)`}
          </button>
        </div>
      )}
    </div>
  );
}
