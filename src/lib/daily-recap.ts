import { db } from "@/db";
import { timelineEntries, batches } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getReadingsForDate, getDatesWithReadings, getSetting } from "./queries";
import { daysBetween } from "./utils";
import type { DailyRecapData } from "@/types";

export async function generateDailyRecap(
  batchId: number,
  date: string
): Promise<void> {
  const readings = await getReadingsForDate(batchId, date);
  if (readings.length === 0) return;

  // Get batch creation date for day number calculation
  const [batch] = await db.select().from(batches).where(eq(batches.id, batchId)).limit(1);
  if (!batch) return;

  const dayNumber = daysBetween(batch.createdAt, date + "T23:59:59Z") + 1;

  const gravities = readings.map((r) => r.gravity);
  const temperatures = readings.filter((r) => r.temperature != null).map((r) => r.temperature!);

  const openingGravity = gravities[0];
  const closingGravity = gravities[gravities.length - 1];
  const gravityDelta = Number((openingGravity - closingGravity).toFixed(4));

  const avgTemperature =
    temperatures.length > 0
      ? Number((temperatures.reduce((a, b) => a + b, 0) / temperatures.length).toFixed(1))
      : null;

  const tempRange =
    temperatures.length > 0
      ? { min: Math.min(...temperatures), max: Math.max(...temperatures) }
      : null;

  // Determine temp unit from the first reading that has one
  const tempUnit = readings.find((r) => r.tempUnit)?.tempUnit ?? "F";

  const recapData: DailyRecapData = {
    type: "daily_recap",
    date,
    openingGravity,
    closingGravity,
    gravityDelta,
    avgTemperature,
    tempRange,
    tempUnit: tempUnit as "F" | "C",
    readingCount: readings.length,
    dayNumber,
  };

  // Backdate the entry to end of that day
  const entryTimestamp = date + "T23:59:59Z";

  await db.insert(timelineEntries).values({
    batchId,
    entryType: "daily_recap",
    source: "system",
    data: recapData as unknown as Record<string, unknown>,
    createdAt: entryTimestamp,
    createdBy: null,
  });
}

export async function generateMissingRecaps(batchId: number): Promise<number> {
  // Get all dates that have readings
  const datesWithReadings = await getDatesWithReadings(batchId);
  if (datesWithReadings.length === 0) return 0;

  // Get all dates that already have daily_recap entries
  const existingRecaps = await db
    .select({ createdAt: timelineEntries.createdAt })
    .from(timelineEntries)
    .where(
      and(
        eq(timelineEntries.batchId, batchId),
        eq(timelineEntries.entryType, "daily_recap")
      )
    );

  const existingRecapDates = new Set(
    existingRecaps.map((r) => r.createdAt.split("T")[0])
  );

  // Today's date in user's timezone — don't generate recap for today (incomplete data)
  const tz = await getSetting("user.timezone");
  const today = new Date().toLocaleDateString("en-CA", { timeZone: tz || "UTC" });

  let generated = 0;
  for (const date of datesWithReadings) {
    if (date === today) continue;
    if (existingRecapDates.has(date)) continue;

    try {
      await generateDailyRecap(batchId, date);
      generated++;
    } catch (err) {
      console.error(`Failed to generate recap for batch ${batchId} date ${date}:`, err);
    }
  }

  return generated;
}
