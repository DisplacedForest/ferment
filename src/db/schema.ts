import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";

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
      enum: ["reading", "addition", "rack", "taste", "phase_change", "note", "alert"],
    }).notNull(),
    source: text("source", {
      enum: ["manual", "tilt", "ispindel", "rapt", "api"],
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
