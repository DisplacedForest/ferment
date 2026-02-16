import { db } from "@/db";
import { timelineEntries } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getDatesWithReadings, getReadingsForDate } from "./queries";
import type { TimelineEntry, HourlySummaryData, ReadingData, HydrometerReading } from "@/types";

/**
 * Consolidates unrecapped hydrometer readings into synthetic timeline entries.
 *
 * Finds all reading dates that don't have a daily_recap yet, then:
 * - Last 4 readings (across all unrecapped dates): shown individually
 * - Older readings: bucketed by hour as summaries
 *
 * This avoids any timezone-dependent "today" calculation — it just fills
 * the gap between daily recaps and the present.
 */
export async function consolidateUnrecappedReadings(
  batchId: number
): Promise<TimelineEntry[]> {
  const datesWithReadings = await getDatesWithReadings(batchId);
  if (datesWithReadings.length === 0) return [];

  // Find which dates already have daily recaps
  const existingRecaps = await db
    .select({ createdAt: timelineEntries.createdAt })
    .from(timelineEntries)
    .where(
      and(
        eq(timelineEntries.batchId, batchId),
        eq(timelineEntries.entryType, "daily_recap")
      )
    );

  const recapDates = new Set(existingRecaps.map((r) => r.createdAt.split("T")[0]));
  const unrecappedDates = datesWithReadings.filter((d) => !recapDates.has(d));
  if (unrecappedDates.length === 0) return [];

  // Gather all readings from unrecapped dates
  const allReadings: HydrometerReading[] = [];
  for (const date of unrecappedDates) {
    const readings = await getReadingsForDate(batchId, date);
    allReadings.push(...readings);
  }

  if (allReadings.length === 0) return [];

  // Sort ascending by timestamp
  allReadings.sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));

  return consolidateReadings(allReadings, batchId);
}

/**
 * Takes a sorted (ASC) list of readings and produces synthetic timeline entries:
 * - Last 4 readings: individual entries
 * - Older readings: bucketed by hour
 */
function consolidateReadings(
  readings: HydrometerReading[],
  batchId: number
): TimelineEntry[] {
  const syntheticEntries: TimelineEntry[] = [];
  let syntheticId = -1;

  const rawCount = Math.min(4, readings.length);
  const olderReadings = readings.slice(0, readings.length - rawCount);
  const recentReadings = readings.slice(readings.length - rawCount);

  // Recent readings → individual timeline entries
  for (const reading of recentReadings) {
    syntheticEntries.push(readingToTimelineEntry(reading, batchId, syntheticId--));
  }

  // Older readings → bucket by hour
  const hourBuckets = new Map<string, HydrometerReading[]>();
  for (const reading of olderReadings) {
    const hourKey = reading.recordedAt.slice(0, 13); // "2026-02-15T23"
    if (!hourBuckets.has(hourKey)) hourBuckets.set(hourKey, []);
    hourBuckets.get(hourKey)!.push(reading);
  }

  for (const [hourKey, bucket] of hourBuckets) {
    const sorted = bucket.sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
    const startGravity = sorted[0].gravity;
    const endGravity = sorted[sorted.length - 1].gravity;
    const temps = sorted
      .filter((r) => r.temperature != null)
      .map((r) => r.temperature!);
    const avgTemp =
      temps.length > 0
        ? Number((temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1))
        : null;

    const hour = parseInt(hourKey.slice(11, 13), 10);
    const data: HourlySummaryData = {
      type: "hourly_summary",
      hourLabel: `${formatHour(hour)} – ${formatHour((hour + 1) % 24)}`,
      startGravity,
      endGravity,
      avgTemperature: avgTemp,
      tempUnit: (sorted[0].tempUnit as "F" | "C") ?? "F",
      readingCount: sorted.length,
    };

    syntheticEntries.push({
      id: syntheticId--,
      batchId,
      entryType: "hourly_summary",
      source: "hydrometer-auto",
      data,
      createdAt: sorted[sorted.length - 1].recordedAt,
      createdBy: null,
    });
  }

  // Sort descending by timestamp (most recent first)
  syntheticEntries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return syntheticEntries;
}

function readingToTimelineEntry(
  reading: HydrometerReading,
  batchId: number,
  id: number
): TimelineEntry {
  const data: ReadingData = {
    type: "reading",
    gravity: reading.gravity,
    temperature: reading.temperature ?? undefined,
    temperatureUnit: (reading.tempUnit as "F" | "C") ?? "F",
  };

  return {
    id,
    batchId,
    entryType: "reading",
    source: "hydrometer-auto",
    data,
    createdAt: reading.recordedAt,
    createdBy: null,
  };
}

function formatHour(h: number): string {
  if (h === 0) return "12am";
  if (h < 12) return `${h}am`;
  if (h === 12) return "12pm";
  return `${h - 12}pm`;
}
