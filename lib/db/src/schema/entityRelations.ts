import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { entitiesTable } from "./entities";

export const entityRelationsTable = pgTable("entity_relations", {
  id: serial("id").primaryKey(),
  sourceEntityId: integer("source_entity_id")
    .notNull()
    .references(() => entitiesTable.id, { onDelete: "cascade" }),
  targetEntityId: integer("target_entity_id")
    .notNull()
    .references(() => entitiesTable.id, { onDelete: "cascade" }),
  relationType: text("relation_type").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertEntityRelationSchema = createInsertSchema(
  entityRelationsTable,
).omit({ id: true, createdAt: true });
export type InsertEntityRelation = z.infer<typeof insertEntityRelationSchema>;
export type EntityRelationRow = typeof entityRelationsTable.$inferSelect;
