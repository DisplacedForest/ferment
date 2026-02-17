import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";

export const hydrometers = sqliteTable("hydrometers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  type: text("type", { enum: ["tilt", "ispindel", "rapt", "other"] }).notNull(),
  identifier: text("identifier").notNull(),
  calibrationOffset: real("calibration_offset").notNull().default(0),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  lastSeenAt: text("last_seen_at"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const batches = sqliteTable("batches", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  uuid: text("uuid").notNull().unique().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  style: text("style"),
  status: text("status", { enum: ["planning", "active", "completed", "archived"] }).notNull().default("planning"),
  targetVolume: real("target_volume"),
  targetVolumeUnit: text("target_volume_unit", { enum: ["gal", "L"] }).default("gal"),
  yeastStrain: text("yeast_strain"),
  originalGravity: real("original_gravity"),
  finalGravity: real("final_gravity"),
  parentBatchIds: text("parent_batch_ids", { mode: "json" }).$type<string[]>(),
  notes: text("notes"),
  // Logical FK to batch_phases.id — no .references() to avoid circular ref with SQLite
  currentPhaseId: integer("current_phase_id"),
  hydrometerId: integer("hydrometer_id").references(() => hydrometers.id, { onDelete: "set null" }),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
  completedAt: text("completed_at"),
});

export const timelineEntries = sqliteTable(
  "timeline_entries",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    batchId: integer("batch_id")
      .notNull()
      .references(() => batches.id, { onDelete: "cascade" }),
    entryType: text("entry_type", {
      enum: ["reading", "addition", "rack", "taste", "phase_change", "note", "alert", "daily_recap"],
    }).notNull(),
    source: text("source", {
      enum: ["manual", "hydrometer-auto", "hydrometer-confirmed", "system", "api"],
    }).notNull().default("manual"),
    data: text("data", { mode: "json" }).notNull().$type<Record<string, unknown>>(),
    createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
    createdBy: text("created_by"),
  },
  (table) => [
    index("idx_timeline_batch_id").on(table.batchId),
    index("idx_timeline_entry_type").on(table.entryType),
    index("idx_timeline_created_at").on(table.createdAt),
  ]
);

export const batchPhases = sqliteTable(
  "batch_phases",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    batchId: integer("batch_id")
      .notNull()
      .references(() => batches.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    status: text("status", {
      enum: ["pending", "active", "completed", "skipped"],
    })
      .notNull()
      .default("pending"),
    startedAt: text("started_at"),
    completedAt: text("completed_at"),
    expectedDurationDays: integer("expected_duration_days"),
    targetTempLow: real("target_temp_low"),
    targetTempHigh: real("target_temp_high"),
    targetTempUnit: text("target_temp_unit", { enum: ["F", "C"] }).default("F"),
    completionCriteria: text("completion_criteria", { mode: "json" }).$type<Record<string, unknown>>(),
    notes: text("notes"),
  },
  (table) => [
    index("idx_batch_phases_batch_id").on(table.batchId),
    index("idx_batch_phases_status").on(table.status),
  ]
);

export const phaseActions = sqliteTable(
  "phase_actions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    phaseId: integer("phase_id")
      .notNull()
      .references(() => batchPhases.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    intervalDays: integer("interval_days"),
    dueAt: text("due_at"),
    lastCompletedAt: text("last_completed_at"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    index("idx_phase_actions_phase_id").on(table.phaseId),
    index("idx_phase_actions_due_at").on(table.dueAt),
  ]
);

export const hydrometerReadings = sqliteTable(
  "hydrometer_readings",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    batchId: integer("batch_id")
      .references(() => batches.id, { onDelete: "cascade" }),
    hydrometerId: integer("hydrometer_id")
      .notNull()
      .references(() => hydrometers.id, { onDelete: "cascade" }),
    gravity: real("gravity").notNull(),
    temperature: real("temperature"),
    tempUnit: text("temp_unit", { enum: ["F", "C"] }).default("F"),
    rawData: text("raw_data", { mode: "json" }).$type<Record<string, unknown>>(),
    recordedAt: text("recorded_at").notNull(),
    createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  },
  (table) => [
    index("idx_readings_batch_id").on(table.batchId),
    index("idx_readings_recorded_at").on(table.recordedAt),
    index("idx_readings_hydrometer_id").on(table.hydrometerId),
  ]
);

export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const protocolTemplates = sqliteTable(
  "protocol_templates",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    description: text("description"),
    category: text("category", {
      enum: ["wine", "beer", "mead", "cider", "other"],
    })
      .notNull()
      .default("other"),
    templateData: text("template_data", { mode: "json" })
      .notNull()
      .$type<Record<string, unknown>>(),
    isBuiltin: integer("is_builtin", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
  },
  (table) => [index("idx_protocol_templates_category").on(table.category)]
);
