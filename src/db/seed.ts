import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { batches, timelineEntries, batchPhases, phaseActions, protocolTemplates } from "./schema";
import { builtinTemplates } from "./seed-templates";
import { eq } from "drizzle-orm";

const dbPath = process.env.DATABASE_PATH || "./data/ferment.db";
const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
const db = drizzle(sqlite);

function daysAgo(days: number, hoursOffset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(d.getHours() - hoursOffset);
  return d.toISOString();
}

function seed() {
  console.log("Seeding database...");

  // Clear existing data (order matters for FK constraints)
  db.delete(phaseActions).run();
  db.delete(batchPhases).run();
  db.delete(timelineEntries).run();
  db.delete(batches).run();
  db.delete(protocolTemplates).run();

  // --- Seed protocol templates ---
  for (const tmpl of builtinTemplates) {
    db.insert(protocolTemplates)
      .values({
        name: tmpl.name,
        description: tmpl.description,
        category: tmpl.category,
        templateData: tmpl.templateData as unknown as Record<string, unknown>,
        isBuiltin: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .run();
  }
  console.log(`Seeded ${builtinTemplates.length} protocol templates.`);

  // Batch 1: Active mid-fermentation Cabernet (started ~10 days ago)
  const batch1Rows = db
    .insert(batches)
    .values({
      name: "2025 Estate Cabernet",
      style: "Cabernet Sauvignon",
      status: "active",
      targetVolume: 6,
      targetVolumeUnit: "gal",
      yeastStrain: "RC-212",
      originalGravity: 1.09,
      notes: "Grapes from east block, picked at 24.5 brix. Cold soaked 3 days before inoculation.",
      createdAt: daysAgo(10),
      updatedAt: daysAgo(0),
    })
    .returning()
    .all();
  const batch1 = batch1Rows[0];

  // Add phases to Batch 1 — currently in Primary
  const b1Phases = [
    { name: "Primary", sortOrder: 0, status: "active" as const, startedAt: daysAgo(10), expectedDurationDays: 7, targetTempLow: 68, targetTempHigh: 78, targetTempUnit: "F" as const, completionCriteria: { type: "gravity_stable", consecutiveReadings: 3, toleranceSG: 0.002, stableDurationHours: 24 } },
    { name: "Secondary", sortOrder: 1, status: "pending" as const, expectedDurationDays: 14, targetTempLow: 65, targetTempHigh: 72, targetTempUnit: "F" as const, completionCriteria: { type: "compound", criteria: [{ type: "gravity_stable", consecutiveReadings: 3, toleranceSG: 0.002 }, { type: "duration", minDays: 10 }] } },
    { name: "Clearing", sortOrder: 2, status: "pending" as const, expectedDurationDays: 14, completionCriteria: { type: "duration", minDays: 14 } },
    { name: "Stabilization", sortOrder: 3, status: "pending" as const, expectedDurationDays: 3, completionCriteria: { type: "duration", minDays: 3 } },
    { name: "Bottling", sortOrder: 4, status: "pending" as const, completionCriteria: { type: "manual" } },
  ];

  let batch1ActivePhaseId: number | null = null;
  for (const p of b1Phases) {
    const [row] = db
      .insert(batchPhases)
      .values({
        batchId: batch1.id,
        name: p.name,
        sortOrder: p.sortOrder,
        status: p.status,
        startedAt: p.startedAt ?? null,
        expectedDurationDays: p.expectedDurationDays ?? null,
        targetTempLow: p.targetTempLow ?? null,
        targetTempHigh: p.targetTempHigh ?? null,
        targetTempUnit: p.targetTempUnit ?? null,
        completionCriteria: p.completionCriteria as unknown as Record<string, unknown>,
      })
      .returning()
      .all();
    if (p.status === "active") batch1ActivePhaseId = row.id;

    // Add punch-down action to Primary phase
    if (p.name === "Primary") {
      db.insert(phaseActions)
        .values({
          phaseId: row.id,
          name: "Punch down cap",
          intervalDays: 1,
          dueAt: daysAgo(0),
          sortOrder: 0,
        })
        .run();
    }
  }

  // Set currentPhaseId
  if (batch1ActivePhaseId) {
    db.update(batches)
      .set({ currentPhaseId: batch1ActivePhaseId })
      .where(eq(batches.id, batch1.id))
      .run();
  }

  // Batch 2: Completed Sauvignon Blanc (started ~60 days ago)
  const batch2Rows = db
    .insert(batches)
    .values({
      name: "Spring Sauvignon Blanc",
      style: "Sauvignon Blanc",
      status: "completed",
      targetVolume: 5,
      targetVolumeUnit: "gal",
      yeastStrain: "QA23",
      originalGravity: 1.055,
      finalGravity: 0.998,
      notes: "Light and crisp, fermented cool. Came out nicely.",
      createdAt: daysAgo(60),
      updatedAt: daysAgo(5),
      completedAt: daysAgo(5),
    })
    .returning()
    .all();
  const batch2 = batch2Rows[0];

  // Add completed phases to Batch 2
  const b2Phases = [
    { name: "Primary", sortOrder: 0, status: "completed" as const, startedAt: daysAgo(59), completedAt: daysAgo(45), expectedDurationDays: 7 },
    { name: "Secondary", sortOrder: 1, status: "completed" as const, startedAt: daysAgo(45), completedAt: daysAgo(28), expectedDurationDays: 14 },
    { name: "Clearing", sortOrder: 2, status: "completed" as const, startedAt: daysAgo(28), completedAt: daysAgo(14), expectedDurationDays: 14 },
    { name: "Stabilization", sortOrder: 3, status: "completed" as const, startedAt: daysAgo(14), completedAt: daysAgo(10), expectedDurationDays: 3 },
    { name: "Bottling", sortOrder: 4, status: "completed" as const, startedAt: daysAgo(10), completedAt: daysAgo(5) },
  ];

  for (const p of b2Phases) {
    db.insert(batchPhases)
      .values({
        batchId: batch2.id,
        name: p.name,
        sortOrder: p.sortOrder,
        status: p.status,
        startedAt: p.startedAt ?? null,
        completedAt: p.completedAt ?? null,
        expectedDurationDays: p.expectedDurationDays ?? null,
      })
      .run();
  }

  // Batch 3: Just started yesterday
  const batch3Rows = db
    .insert(batches)
    .values({
      name: "Backyard Zinfandel",
      style: "Zinfandel",
      status: "active",
      targetVolume: 3,
      targetVolumeUnit: "gal",
      yeastStrain: "D47",
      originalGravity: 1.1,
      notes: "Small lot from backyard vines. High sugar, should be a big wine.",
      createdAt: daysAgo(1),
      updatedAt: daysAgo(0),
    })
    .returning()
    .all();
  const batch3 = batch3Rows[0];

  // Batch 3 — just started, Primary active
  const [b3Primary] = db
    .insert(batchPhases)
    .values({
      batchId: batch3.id,
      name: "Primary",
      sortOrder: 0,
      status: "active",
      startedAt: daysAgo(1),
      expectedDurationDays: 7,
      targetTempLow: 68,
      targetTempHigh: 80,
      targetTempUnit: "F",
      completionCriteria: { type: "gravity_stable", consecutiveReadings: 3, toleranceSG: 0.002, stableDurationHours: 24 } as unknown as Record<string, unknown>,
    })
    .returning()
    .all();
  db.insert(batchPhases).values({ batchId: batch3.id, name: "Secondary", sortOrder: 1, status: "pending", expectedDurationDays: 14 }).run();
  db.insert(batchPhases).values({ batchId: batch3.id, name: "Bottling", sortOrder: 2, status: "pending" }).run();
  db.update(batches).set({ currentPhaseId: b3Primary.id }).where(eq(batches.id, batch3.id)).run();

  // --- Timeline entries for Batch 1 (active Cabernet) ---

  // Initial reading
  db.insert(timelineEntries).values({
    batchId: batch1.id,
    entryType: "reading",
    data: { type: "reading", gravity: 1.09, temperature: 58, temperatureUnit: "F", notes: "Pre-inoculation reading after cold soak" },
    createdAt: daysAgo(10),
  }).run();

  // Phase change: started primary
  db.insert(timelineEntries).values({
    batchId: batch1.id,
    entryType: "phase_change",
    data: { type: "phase_change", toPhase: "Primary", notes: "Inoculated with RC212, punching down 3x daily" },
    createdAt: daysAgo(10),
  }).run();

  // Addition: yeast nutrient
  db.insert(timelineEntries).values({
    batchId: batch1.id,
    entryType: "addition",
    data: { type: "addition", name: "Fermaid-O", amount: 1.5, unit: "g", notes: "First nutrient addition at 24h" },
    createdAt: daysAgo(9),
  }).run();

  // Readings over the days (gravity dropping)
  db.insert(timelineEntries).values({
    batchId: batch1.id,
    entryType: "reading",
    data: { type: "reading", gravity: 1.078, temperature: 72, temperatureUnit: "F" },
    createdAt: daysAgo(8),
  }).run();

  db.insert(timelineEntries).values({
    batchId: batch1.id,
    entryType: "reading",
    data: { type: "reading", gravity: 1.062, temperature: 76, temperatureUnit: "F" },
    createdAt: daysAgo(6),
  }).run();

  // Note
  db.insert(timelineEntries).values({
    batchId: batch1.id,
    entryType: "note",
    data: { type: "note", content: "Cap is thick and healthy. Good color extraction. Smells like dark fruit and vanilla." },
    createdAt: daysAgo(5),
  }).run();

  db.insert(timelineEntries).values({
    batchId: batch1.id,
    entryType: "reading",
    data: { type: "reading", gravity: 1.044, temperature: 78, temperatureUnit: "F" },
    createdAt: daysAgo(4),
  }).run();

  db.insert(timelineEntries).values({
    batchId: batch1.id,
    entryType: "reading",
    data: { type: "reading", gravity: 1.028, temperature: 77, temperatureUnit: "F" },
    createdAt: daysAgo(2),
  }).run();

  // Latest reading
  db.insert(timelineEntries).values({
    batchId: batch1.id,
    entryType: "reading",
    data: { type: "reading", gravity: 1.018, temperature: 74, temperatureUnit: "F" },
    createdAt: daysAgo(0, 3),
  }).run();

  // --- Timeline entries for Batch 2 (completed Sauv Blanc) ---

  db.insert(timelineEntries).values({
    batchId: batch2.id,
    entryType: "reading",
    data: { type: "reading", gravity: 1.055, temperature: 50, temperatureUnit: "F", notes: "Juice settled overnight, clear and pale" },
    createdAt: daysAgo(60),
  }).run();

  db.insert(timelineEntries).values({
    batchId: batch2.id,
    entryType: "phase_change",
    data: { type: "phase_change", toPhase: "Primary", notes: "Inoculated with QA23, keeping it cool at 50F" },
    createdAt: daysAgo(59),
  }).run();

  db.insert(timelineEntries).values({
    batchId: batch2.id,
    entryType: "reading",
    data: { type: "reading", gravity: 1.038, temperature: 52, temperatureUnit: "F" },
    createdAt: daysAgo(50),
  }).run();

  db.insert(timelineEntries).values({
    batchId: batch2.id,
    entryType: "reading",
    data: { type: "reading", gravity: 1.012, temperature: 54, temperatureUnit: "F" },
    createdAt: daysAgo(40),
  }).run();

  db.insert(timelineEntries).values({
    batchId: batch2.id,
    entryType: "reading",
    data: { type: "reading", gravity: 0.998, temperature: 55, temperatureUnit: "F", notes: "Bone dry, tastes clean and bright" },
    createdAt: daysAgo(30),
  }).run();

  // Rack
  db.insert(timelineEntries).values({
    batchId: batch2.id,
    entryType: "rack",
    data: { type: "rack", fromVessel: "Primary fermenter", toVessel: "5 gal carboy", method: "siphon", volumeLoss: 0.3, volumeLossUnit: "gal", notes: "Racked off gross lees, clear and bright" },
    createdAt: daysAgo(28),
  }).run();

  // Taste note
  db.insert(timelineEntries).values({
    batchId: batch2.id,
    entryType: "taste",
    data: { type: "taste", appearance: "Pale straw, brilliant clarity", aroma: "Grapefruit, cut grass, hint of flint", flavor: "Crisp acidity, citrus, clean finish", overall: "Really pleased with this one" },
    createdAt: daysAgo(10),
  }).run();

  // Final reading before bottling
  db.insert(timelineEntries).values({
    batchId: batch2.id,
    entryType: "reading",
    data: { type: "reading", gravity: 0.998, temperature: 60, temperatureUnit: "F" },
    createdAt: daysAgo(5),
  }).run();

  // --- Timeline entries for Batch 3 (just started Zin) ---

  db.insert(timelineEntries).values({
    batchId: batch3.id,
    entryType: "reading",
    data: { type: "reading", gravity: 1.1, temperature: 65, temperatureUnit: "F", notes: "Initial OG reading. Really high sugar on these grapes." },
    createdAt: daysAgo(1),
  }).run();

  db.insert(timelineEntries).values({
    batchId: batch3.id,
    entryType: "note",
    data: { type: "note", content: "Crushed and destemmed. Added 30ppm SO2. Will cold soak for a couple days before pitching yeast." },
    createdAt: daysAgo(1),
  }).run();

  console.log("Seeded 3 batches with phases and 18 timeline entries.");
  sqlite.close();
}

try {
  seed();
} catch (err) {
  console.error("Seed failed:", err);
  process.exit(1);
}
