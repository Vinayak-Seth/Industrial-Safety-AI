import {
  pgTable,
  text,
  serial,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const drawingStatusValues = ["processing", "ready", "failed"] as const;

export const pidComponentTypeValues = [
  "valve",
  "pump",
  "vessel",
  "compressor",
  "instrument",
  "sensor",
  "pipe_segment",
  "other",
] as const;

// P&ID / engineering drawing uploads, digitized via Gemini vision into a
// structured component/connection graph (computer-vision-assisted drawing
// digitization).
export const pidDrawingsTable = pgTable("pid_drawings", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  status: text("status", { enum: drawingStatusValues })
    .notNull()
    .default("processing"),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  fileBase64: text("file_base64").notNull(),
  summary: text("summary"),
  processingError: text("processing_error"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const pidComponentsTable = pgTable("pid_components", {
  id: serial("id").primaryKey(),
  drawingId: integer("drawing_id")
    .notNull()
    .references(() => pidDrawingsTable.id, { onDelete: "cascade" }),
  tag: text("tag").notNull(),
  componentType: text("component_type", { enum: pidComponentTypeValues }).notNull(),
  label: text("label").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const pidConnectionsTable = pgTable("pid_connections", {
  id: serial("id").primaryKey(),
  drawingId: integer("drawing_id")
    .notNull()
    .references(() => pidDrawingsTable.id, { onDelete: "cascade" }),
  fromComponentId: integer("from_component_id")
    .notNull()
    .references(() => pidComponentsTable.id, { onDelete: "cascade" }),
  toComponentId: integer("to_component_id")
    .notNull()
    .references(() => pidComponentsTable.id, { onDelete: "cascade" }),
  lineType: text("line_type").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertPidDrawingSchema = createInsertSchema(pidDrawingsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPidDrawing = z.infer<typeof insertPidDrawingSchema>;
export type PidDrawingRow = typeof pidDrawingsTable.$inferSelect;

export const insertPidComponentSchema = createInsertSchema(pidComponentsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertPidComponent = z.infer<typeof insertPidComponentSchema>;
export type PidComponentRow = typeof pidComponentsTable.$inferSelect;

export const insertPidConnectionSchema = createInsertSchema(pidConnectionsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertPidConnection = z.infer<typeof insertPidConnectionSchema>;
export type PidConnectionRow = typeof pidConnectionsTable.$inferSelect;
