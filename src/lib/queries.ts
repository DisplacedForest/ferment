import { db } from "@/db";
import { batches, timelineEntries, batchPhases, phaseActions, protocolTemplates } from "@/db/schema";
import { eq, desc, asc, sql, and, count } from "drizzle-orm";
import { calculateAbv, daysBetween } from "./utils";
import { evaluatePhase } from "./phase-engine";
import type {
  Batch,
  BatchStatus,
  BatchWithComputed,
  BatchPhase,
  PhaseAction,
  ProtocolTemplate,
  ProtocolCategory,
  ProtocolTemplateData,
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

  // Fetch phases for all batches
  const allPhases = await db
    .select()
    .from(batchPhases)
    .where(sql`${batchPhases.batchId} IN (${sql.join(batchIds.map((id) => sql`${id}`), sql`, `)})`)
    .orderBy(asc(batchPhases.sortOrder));

  const phasesMap = new Map<number, BatchPhase[]>();
  for (const phase of allPhases) {
    const p = phase as unknown as BatchPhase;
    if (!phasesMap.has(p.batchId)) phasesMap.set(p.batchId, []);
    phasesMap.get(p.batchId)!.push(p);
  }

  // Fetch phase actions for all active phases
  const activePhaseIds = allPhases
    .filter((p) => (p as unknown as BatchPhase).status === "active")
    .map((p) => p.id);

  const allActions = activePhaseIds.length > 0
    ? await db
        .select()
        .from(phaseActions)
        .where(sql`${phaseActions.phaseId} IN (${sql.join(activePhaseIds.map((id) => sql`${id}`), sql`, `)})`)
        .orderBy(asc(phaseActions.sortOrder))
    : [];

  const actionsMap = new Map<number, PhaseAction[]>();
  for (const action of allActions) {
    const a = action as unknown as PhaseAction;
    if (!actionsMap.has(a.phaseId)) actionsMap.set(a.phaseId, []);
    actionsMap.get(a.phaseId)!.push(a);
  }

  // Fetch alert counts per batch
  const alertEntries = await db
    .select()
    .from(timelineEntries)
    .where(
      and(
        sql`${timelineEntries.batchId} IN (${sql.join(batchIds.map((id) => sql`${id}`), sql`, `)})`,
        eq(timelineEntries.entryType, "alert")
      )
    );

  const unresolvedAlertMap = new Map<number, number>();
  for (const entry of alertEntries) {
    const data = entry.data as Record<string, unknown>;
    if (!data.resolved) {
      unresolvedAlertMap.set(entry.batchId, (unresolvedAlertMap.get(entry.batchId) ?? 0) + 1);
    }
  }

  // Fetch recent entries per batch for phase evaluation
  const recentEntries = await db
    .select()
    .from(timelineEntries)
    .where(sql`${timelineEntries.batchId} IN (${sql.join(batchIds.map((id) => sql`${id}`), sql`, `)})`)
    .orderBy(desc(timelineEntries.createdAt))
    .limit(200);

  const entriesByBatch = new Map<number, TimelineEntry[]>();
  for (const entry of recentEntries) {
    const e = entry as unknown as TimelineEntry;
    if (!entriesByBatch.has(e.batchId)) entriesByBatch.set(e.batchId, []);
    entriesByBatch.get(e.batchId)!.push(e);
  }

  return rows.map((row) => {
    const batch = row as unknown as Batch;
    const reading = latestReadingMap.get(row.id);
    const phases = phasesMap.get(row.id) ?? [];
    const currentPhase = phases.find((p) => p.id === batch.currentPhaseId) ?? null;

    const computed: BatchWithComputed = {
      ...batch,
      latestGravity: reading?.gravity,
      latestTemperature: reading?.temperature,
      daysSinceStart: daysBetween(batch.createdAt),
      entryCount: entryCountMap.get(row.id) ?? 0,
      phases,
      currentPhase,
      unresolvedAlertCount: unresolvedAlertMap.get(row.id) ?? 0,
    };

    if (batch.originalGravity && batch.finalGravity) {
      computed.abv = calculateAbv(batch.originalGravity, batch.finalGravity);
    } else if (batch.originalGravity && reading?.gravity) {
      computed.abv = calculateAbv(batch.originalGravity, reading.gravity);
    }

    // Compute attention indicators for active batches with phases
    if (currentPhase && batch.status === "active") {
      const actions = actionsMap.get(currentPhase.id) ?? [];
      const batchEntries = entriesByBatch.get(row.id) ?? [];
      const evaluation = evaluatePhase(currentPhase, actions, batchEntries);

      computed.readyToAdvance = evaluation.criteriaMet;
      computed.overdueActionCount = evaluation.overdueActions.length;

      if (evaluation.nextActions.length > 0) {
        computed.nextActionName = evaluation.nextActions[0].name;
        computed.nextActionDueAt = evaluation.nextActions[0].dueAt ?? undefined;
      }
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
  parentBatchIds?: string[];
  phases?: CreateBatchPhasesInput[];
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
      parentBatchIds: data.parentBatchIds ?? null,
      notes: data.notes ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  const batch = row as unknown as Batch;

  // Create phases if provided
  if (data.phases && data.phases.length > 0) {
    await createBatchPhases(batch.id, data.phases);
    // Refetch to get currentPhaseId
    const [updated] = await db.select().from(batches).where(eq(batches.id, batch.id));
    return updated as unknown as Batch;
  }

  return batch;
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

// ---------------------------------------------------------------------------
// Phases
// ---------------------------------------------------------------------------

export async function getPhasesByBatchId(batchId: number): Promise<BatchPhase[]> {
  const rows = await db
    .select()
    .from(batchPhases)
    .where(eq(batchPhases.batchId, batchId))
    .orderBy(asc(batchPhases.sortOrder));
  return rows as unknown as BatchPhase[];
}

export async function getActionsByPhaseId(phaseId: number): Promise<PhaseAction[]> {
  const rows = await db
    .select()
    .from(phaseActions)
    .where(eq(phaseActions.phaseId, phaseId))
    .orderBy(asc(phaseActions.sortOrder));
  return rows as unknown as PhaseAction[];
}

export async function advancePhase(batchId: number): Promise<{ batch: Batch; phases: BatchPhase[] }> {
  const now = new Date().toISOString();
  const phases = await getPhasesByBatchId(batchId);
  const activePhase = phases.find((p) => p.status === "active");

  if (activePhase) {
    // Complete the active phase
    await db
      .update(batchPhases)
      .set({ status: "completed", completedAt: now })
      .where(eq(batchPhases.id, activePhase.id));
  }

  // Find next pending phase
  const nextPhase = phases.find(
    (p) => p.status === "pending" && (!activePhase || p.sortOrder > activePhase.sortOrder)
  );

  if (nextPhase) {
    await db
      .update(batchPhases)
      .set({ status: "active", startedAt: now })
      .where(eq(batchPhases.id, nextPhase.id));

    await db
      .update(batches)
      .set({ currentPhaseId: nextPhase.id, updatedAt: now })
      .where(eq(batches.id, batchId));

    // Create phase_change timeline entry
    await createTimelineEntry(batchId, {
      entryType: "phase_change",
      data: {
        type: "phase_change",
        fromPhase: activePhase?.name,
        toPhase: nextPhase.name,
      },
    });
  } else {
    // No more phases — mark batch as completed
    await db
      .update(batches)
      .set({ status: "completed", currentPhaseId: null, completedAt: now, updatedAt: now })
      .where(eq(batches.id, batchId));
  }

  const updatedPhases = await getPhasesByBatchId(batchId);
  const [updatedBatch] = await db.select().from(batches).where(eq(batches.id, batchId));
  return { batch: updatedBatch as unknown as Batch, phases: updatedPhases };
}

export async function skipPhase(
  batchId: number,
  phaseId: number
): Promise<{ batch: Batch; phases: BatchPhase[] }> {
  const now = new Date().toISOString();

  await db
    .update(batchPhases)
    .set({ status: "skipped", completedAt: now })
    .where(eq(batchPhases.id, phaseId));

  // If the skipped phase was active, advance to next
  const phases = await getPhasesByBatchId(batchId);
  const skippedPhase = phases.find((p) => p.id === phaseId);
  const batch = await db.select().from(batches).where(eq(batches.id, batchId));

  if (batch[0].currentPhaseId === phaseId) {
    // Find next pending phase after the skipped one
    const nextPhase = phases.find(
      (p) => p.status === "pending" && p.sortOrder > (skippedPhase?.sortOrder ?? -1)
    );

    if (nextPhase) {
      await db
        .update(batchPhases)
        .set({ status: "active", startedAt: now })
        .where(eq(batchPhases.id, nextPhase.id));

      await db
        .update(batches)
        .set({ currentPhaseId: nextPhase.id, updatedAt: now })
        .where(eq(batches.id, batchId));
    } else {
      await db
        .update(batches)
        .set({ status: "completed", currentPhaseId: null, completedAt: now, updatedAt: now })
        .where(eq(batches.id, batchId));
    }
  }

  const updatedPhases = await getPhasesByBatchId(batchId);
  const [updatedBatch] = await db.select().from(batches).where(eq(batches.id, batchId));
  return { batch: updatedBatch as unknown as Batch, phases: updatedPhases };
}

export interface CreateBatchPhasesInput {
  name: string;
  sortOrder: number;
  expectedDurationDays?: number;
  targetTempLow?: number;
  targetTempHigh?: number;
  targetTempUnit?: "F" | "C";
  completionCriteria?: Record<string, unknown>;
  actions?: { name: string; intervalDays?: number; sortOrder: number }[];
}

export async function createBatchPhases(
  batchId: number,
  phasesInput: CreateBatchPhasesInput[]
): Promise<BatchPhase[]> {
  const now = new Date().toISOString();
  const createdPhases: BatchPhase[] = [];

  for (let i = 0; i < phasesInput.length; i++) {
    const p = phasesInput[i];
    const isFirst = i === 0;

    const [row] = await db
      .insert(batchPhases)
      .values({
        batchId,
        name: p.name,
        sortOrder: p.sortOrder,
        status: isFirst ? "active" : "pending",
        startedAt: isFirst ? now : null,
        expectedDurationDays: p.expectedDurationDays ?? null,
        targetTempLow: p.targetTempLow ?? null,
        targetTempHigh: p.targetTempHigh ?? null,
        targetTempUnit: p.targetTempUnit ?? null,
        completionCriteria: p.completionCriteria ?? null,
      })
      .returning();

    const phase = row as unknown as BatchPhase;
    createdPhases.push(phase);

    // Create actions for this phase
    if (p.actions && p.actions.length > 0) {
      for (const action of p.actions) {
        await db.insert(phaseActions).values({
          phaseId: phase.id,
          name: action.name,
          intervalDays: action.intervalDays ?? null,
          sortOrder: action.sortOrder,
        });
      }
    }

    // Set first phase as current on the batch
    if (isFirst) {
      await db
        .update(batches)
        .set({ currentPhaseId: phase.id })
        .where(eq(batches.id, batchId));
    }
  }

  return createdPhases;
}

// ---------------------------------------------------------------------------
// Protocol Templates
// ---------------------------------------------------------------------------

export async function getTemplates(category?: ProtocolCategory): Promise<ProtocolTemplate[]> {
  const conditions = category ? eq(protocolTemplates.category, category) : undefined;

  const rows = await db
    .select()
    .from(protocolTemplates)
    .where(conditions)
    .orderBy(desc(protocolTemplates.isBuiltin), asc(protocolTemplates.name));

  return rows as unknown as ProtocolTemplate[];
}

export async function getTemplateById(id: number): Promise<ProtocolTemplate | null> {
  const rows = await db
    .select()
    .from(protocolTemplates)
    .where(eq(protocolTemplates.id, id))
    .limit(1);
  return rows.length > 0 ? (rows[0] as unknown as ProtocolTemplate) : null;
}

export async function createTemplate(data: {
  name: string;
  description?: string;
  category: ProtocolCategory;
  templateData: ProtocolTemplateData;
}): Promise<ProtocolTemplate> {
  const now = new Date().toISOString();
  const [row] = await db
    .insert(protocolTemplates)
    .values({
      name: data.name,
      description: data.description ?? null,
      category: data.category,
      templateData: data.templateData as unknown as Record<string, unknown>,
      isBuiltin: false,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  return row as unknown as ProtocolTemplate;
}

export async function updateTemplate(
  id: number,
  data: Partial<{ name: string; description: string; category: ProtocolCategory; templateData: ProtocolTemplateData }>
): Promise<ProtocolTemplate | null> {
  const now = new Date().toISOString();
  const updateData: Record<string, unknown> = { updatedAt: now };

  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.templateData !== undefined) updateData.templateData = data.templateData;

  const rows = await db
    .update(protocolTemplates)
    .set(updateData)
    .where(eq(protocolTemplates.id, id))
    .returning();

  return rows.length > 0 ? (rows[0] as unknown as ProtocolTemplate) : null;
}

export async function deleteTemplate(id: number): Promise<void> {
  const template = await getTemplateById(id);
  if (!template) throw new Error("Template not found");
  if (template.isBuiltin) throw new Error("Cannot delete built-in templates");

  await db.delete(protocolTemplates).where(eq(protocolTemplates.id, id));
}
