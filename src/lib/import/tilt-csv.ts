import { createHydrometerReading } from "@/lib/queries";
import { generateMissingRecaps } from "@/lib/daily-recap";
import { db } from "@/db";
import { batches } from "@/db/schema";
import { eq } from "drizzle-orm";

// Re-export pure parsing functions for use in both client and server code
export { parseTiltCSV, parseCSVLine, parseTimestamp } from "./parse-tilt-csv";
export type { TiltCSVRow } from "./parse-tilt-csv";

import type { TiltCSVRow } from "./parse-tilt-csv";

export async function importTiltData(
  rows: TiltCSVRow[],
  batchId: number,
  hydrometerId: number | null
): Promise<{ importedReadings: number; generatedRecaps: number }> {
  if (rows.length === 0) {
    const generatedRecaps = await generateMissingRecaps(batchId);
    return { importedReadings: 0, generatedRecaps };
  }

  // Sort chronologically — needed for stratification detection and import order
  const sorted = [...rows].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Stratification detection: look for a rising gravity in the first 24h window.
  // Wine/mead/cider often reads low when the Tilt first drops in, then rises to the
  // true OG as liquid mixes. Only flag when the rise is > 0.002 SG.
  const firstMs = new Date(sorted[0].timestamp).getTime();
  const cutoffMs = firstMs + 24 * 60 * 60 * 1000;
  const window24h = sorted.filter((r) => new Date(r.timestamp).getTime() <= cutoffMs);
  const peakRow = window24h.reduce((best, r) => (r.gravity > best.gravity ? r : best), window24h[0]);
  const isStratified = peakRow.gravity - sorted[0].gravity > 0.002;
  const trueOG = isStratified ? peakRow.gravity : sorted[0].gravity;
  const peakMs = isStratified ? new Date(peakRow.timestamp).getTime() : -Infinity;

  let importedReadings = 0;

  for (const row of sorted) {
    const isPrePeak = isStratified && new Date(row.timestamp).getTime() < peakMs;
    await createHydrometerReading({
      batchId,
      hydrometerId,
      gravity: row.gravity,
      temperature: row.temperature || undefined,
      tempUnit: "F",
      recordedAt: row.timestamp,
      isExcluded: isPrePeak,
      excludeReason: isPrePeak ? "stratification" : null,
    });
    importedReadings++;
  }

  // Set batch originalGravity. Always override if stratification was detected so we
  // correct any client-side guess based on the first (stratified) reading.
  const [batch] = await db.select().from(batches).where(eq(batches.id, batchId)).limit(1);
  if (batch && (!batch.originalGravity || isStratified)) {
    await db
      .update(batches)
      .set({ originalGravity: trueOG })
      .where(eq(batches.id, batchId));
  }

  // Generate daily recaps for all imported dates
  const generatedRecaps = await generateMissingRecaps(batchId);

  return { importedReadings, generatedRecaps };
}
