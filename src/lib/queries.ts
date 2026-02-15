import { db } from "@/db";
import { batches, timelineEntries } from "@/db/schema";
import { eq, desc, sql, and, count } from "drizzle-orm";
import { calculateAbv, daysBetween } from "./utils";
import type {
  Batch,
  BatchStatus,
  BatchWithComputed,
  TimelineEntry,
  TimelineEntryType,
  TimelineEntryData,
  ReadingData,
} from "@/types";

// ---------------------------------------------------------------------------
// Batches
// ---------------------------------------------------------------------------

export async function getBatches(status?: BatchStatus): Promise<BatchWithComputed[]> {
  const conditions = status ? eq(batches.status, status) : undefined;

  const rows = await db
    .select()
    .from(batches)
    .where(conditions)
    .orderBy(desc(batches.updatedAt));

  if (rows.length === 0) return [];

  // Batch-query latest reading + entry count for each batch
  const batchIds = rows.map((r) => r.id);

  const entryCounts = await db
    .select({
      batchId: timelineEntries.batchId,
      count: count(),
    })
    .from(timelineEntries)
    .where(sql`${timelineEntries.batchId} IN (${sql.join(batchIds.map((id) => sql`${id}`), sql`, `)})`)
    .groupBy(timelineEntries.batchId);

  const entryCountMap = new Map(entryCounts.map((e) => [e.batchId, e.count]));

  // Get latest reading per batch using a correlated subquery approach
  const latestReadings = await db
    .select()
    .from(timelineEntries)
    .where(
      and(
        sql`${timelineEntries.batchId} IN (${sql.join(batchIds.map((id) => sql`${id}`), sql`, `)})`,
        eq(timelineEntries.entryType, "reading")
      )
    )
    .orderBy(desc(timelineEntries.createdAt));

  // Group by batchId, take first (latest) for each
  const latestReadingMap = new Map<number, ReadingData>();
  for (const entry of latestReadings) {
    if (!latestReadingMap.has(entry.batchId)) {
      latestReadingMap.set(entry.batchId, entry.data as unknown as ReadingData);
    }
  }

  return rows.map((row) => {
    const batch = row as unknown as Batch;
    const reading = latestReadingMap.get(row.id);
    const computed: BatchWithComputed = {
      ...batch,
      latestGravity: reading?.gravity,
      latestTemperature: reading?.temperature,
      daysSinceStart: daysBetween(batch.createdAt),
      entryCount: entryCountMap.get(row.id) ?? 0,
    };

    if (batch.originalGravity && batch.finalGravity) {
      computed.abv = calculateAbv(batch.originalGravity, batch.finalGravity);
    } else if (batch.originalGravity && reading?.gravity) {
      computed.abv = calculateAbv(batch.originalGravity, reading.gravity);
    }

    return computed;
  });
}

export async function getBatchById(id: number): Promise<BatchWithComputed | null> {
  const row = await db.select().from(batches).where(eq(batches.id, id)).limit(1);
  if (row.length === 0) return null;
  return enrichBatch(row[0] as unknown as Batch);
}

export async function getBatchByUuid(uuid: string): Promise<BatchWithComputed | null> {
  const row = await db.select().from(batches).where(eq(batches.uuid, uuid)).limit(1);
  if (row.length === 0) return null;
  return enrichBatch(row[0] as unknown as Batch);
}

async function enrichBatch(batch: Batch): Promise<BatchWithComputed> {
  const [entryCountResult] = await db
    .select({ count: count() })
    .from(timelineEntries)
    .where(eq(timelineEntries.batchId, batch.id));

  const latestReadingRows = await db
    .select()
    .from(timelineEntries)
    .where(
      and(
        eq(timelineEntries.batchId, batch.id),
        eq(timelineEntries.entryType, "reading")
      )
    )
    .orderBy(desc(timelineEntries.createdAt))
    .limit(1);

  const reading = latestReadingRows.length > 0
    ? (latestReadingRows[0].data as unknown as ReadingData)
    : undefined;

  const computed: BatchWithComputed = {
    ...batch,
    latestGravity: reading?.gravity,
    latestTemperature: reading?.temperature,
    daysSinceStart: daysBetween(batch.createdAt),
    entryCount: entryCountResult?.count ?? 0,
  };

  if (batch.originalGravity && batch.finalGravity) {
    computed.abv = calculateAbv(batch.originalGravity, batch.finalGravity);
  } else if (batch.originalGravity && reading?.gravity) {
    computed.abv = calculateAbv(batch.originalGravity, reading.gravity);
  }

  return computed;
}

export interface CreateBatchInput {
  name: string;
  style?: string;
  status?: BatchStatus;
  targetVolume?: number;
  targetVolumeUnit?: "gal" | "L";
  yeastStrain?: string;
  originalGravity?: number;
  notes?: string;
}

export async function createBatch(data: CreateBatchInput): Promise<Batch> {
  const now = new Date().toISOString();
  const [row] = await db
    .insert(batches)
    .values({
      name: data.name,
      style: data.style ?? null,
      status: data.status ?? "active",
      targetVolume: data.targetVolume ?? null,
      targetVolumeUnit: data.targetVolumeUnit ?? "gal",
      yeastStrain: data.yeastStrain ?? null,
      originalGravity: data.originalGravity ?? null,
      notes: data.notes ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return row as unknown as Batch;
}

export interface UpdateBatchInput {
  name?: string;
  style?: string;
  status?: BatchStatus;
  targetVolume?: number;
  targetVolumeUnit?: "gal" | "L";
  yeastStrain?: string;
  originalGravity?: number;
  finalGravity?: number;
  notes?: string;
}

export async function updateBatch(id: number, data: UpdateBatchInput): Promise<Batch | null> {
  const now = new Date().toISOString();
  const updateData: Record<string, unknown> = { updatedAt: now };

  if (data.name !== undefined) updateData.name = data.name;
  if (data.style !== undefined) updateData.style = data.style;
  if (data.status !== undefined) {
    updateData.status = data.status;
    if (data.status === "completed") updateData.completedAt = now;
  }
  if (data.targetVolume !== undefined) updateData.targetVolume = data.targetVolume;
  if (data.targetVolumeUnit !== undefined) updateData.targetVolumeUnit = data.targetVolumeUnit;
  if (data.yeastStrain !== undefined) updateData.yeastStrain = data.yeastStrain;
  if (data.originalGravity !== undefined) updateData.originalGravity = data.originalGravity;
  if (data.finalGravity !== undefined) updateData.finalGravity = data.finalGravity;
  if (data.notes !== undefined) updateData.notes = data.notes;

  const rows = await db
    .update(batches)
    .set(updateData)
    .where(eq(batches.id, id))
    .returning();

  return rows.length > 0 ? (rows[0] as unknown as Batch) : null;
}

export async function archiveBatch(id: number): Promise<void> {
  await db
    .update(batches)
    .set({ status: "archived", updatedAt: new Date().toISOString() })
    .where(eq(batches.id, id));
}

// ---------------------------------------------------------------------------
// Timeline Entries
// ---------------------------------------------------------------------------

export interface GetTimelineOptions {
  type?: TimelineEntryType;
  limit?: number;
  offset?: number;
}

export async function getTimelineEntries(
  batchId: number,
  options: GetTimelineOptions = {}
): Promise<{ entries: TimelineEntry[]; total: number }> {
  const { type, limit = 50, offset = 0 } = options;

  const conditions = type
    ? and(eq(timelineEntries.batchId, batchId), eq(timelineEntries.entryType, type))
    : eq(timelineEntries.batchId, batchId);

  const [totalResult] = await db
    .select({ count: count() })
    .from(timelineEntries)
    .where(conditions);

  const rows = await db
    .select()
    .from(timelineEntries)
    .where(conditions)
    .orderBy(desc(timelineEntries.createdAt))
    .limit(limit)
    .offset(offset);

  return {
    entries: rows as unknown as TimelineEntry[],
    total: totalResult?.count ?? 0,
  };
}

export interface CreateTimelineInput {
  entryType: TimelineEntryType;
  source?: string;
  data: TimelineEntryData;
  createdBy?: string;
}

export async function createTimelineEntry(
  batchId: number,
  input: CreateTimelineInput
): Promise<TimelineEntry> {
  const now = new Date().toISOString();

  const [row] = await db
    .insert(timelineEntries)
    .values({
      batchId,
      entryType: input.entryType,
      source: (input.source ?? "manual") as "manual" | "tilt" | "ispindel" | "rapt" | "api",
      data: input.data as unknown as Record<string, unknown>,
      createdAt: now,
      createdBy: input.createdBy ?? null,
    })
    .returning();

  // Update batch.updatedAt
  await db
    .update(batches)
    .set({ updatedAt: now })
    .where(eq(batches.id, batchId));

  // If it's a reading with gravity, update finalGravity on the batch
  if (input.entryType === "reading" && input.data.type === "reading") {
    const readingData = input.data as ReadingData;
    if (readingData.gravity) {
      await db
        .update(batches)
        .set({ finalGravity: readingData.gravity })
        .where(eq(batches.id, batchId));
    }
  }

  return row as unknown as TimelineEntry;
}
