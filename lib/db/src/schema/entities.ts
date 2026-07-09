import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { documentsTable } from "./documents";

export const entityTypeValues = [
  "equipment",
  "procedure",
  "regulation",
  "personnel",
  "location",
  "hazard",
  "parameter",
] as const;

export const entitiesTable = pgTable("entities", {
  id: serial("id").primaryKey(),
  entityType: text("entity_type", { enum: entityTypeValues }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  documentId: integer("document_id").references(() => documentsTable.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertEntitySchema = createInsertSchema(entitiesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertEntity = z.infer<typeof insertEntitySchema>;
export type EntityRow = typeof entitiesTable.$inferSelect;
