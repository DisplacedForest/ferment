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
  hydrometerId: number
): Promise<{ importedReadings: number; generatedRecaps: number }> {
  let importedReadings = 0;

  for (const row of rows) {
    await createHydrometerReading({
      batchId,
      hydrometerId,
      gravity: row.gravity,
      temperature: row.temperature || undefined,
      tempUnit: "F",
      recordedAt: row.timestamp,
    });
    importedReadings++;
  }

  // Set batch originalGravity from first reading if not already set
  if (rows.length > 0) {
    const [batch] = await db.select().from(batches).where(eq(batches.id, batchId)).limit(1);
    if (batch && !batch.originalGravity) {
      const sorted = [...rows].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      await db
        .update(batches)
        .set({ originalGravity: sorted[0].gravity })
        .where(eq(batches.id, batchId));
    }
  }

  // Generate daily recaps for all imported dates
  const generatedRecaps = await generateMissingRecaps(batchId);

  return { importedReadings, generatedRecaps };
}
