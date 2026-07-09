import { pgTable, text, serial, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export interface CopilotCitationJson {
  documentId: number;
  documentTitle: string;
  chunkIndex: number;
  excerpt: string;
}

export const copilotQueriesTable = pgTable("copilot_queries", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  citations: jsonb("citations").$type<CopilotCitationJson[]>().notNull().default([]),
  responseTimeMs: integer("response_time_ms").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertCopilotQuerySchema = createInsertSchema(
  copilotQueriesTable,
).omit({ id: true, createdAt: true });
export type InsertCopilotQuery = z.infer<typeof insertCopilotQuerySchema>;
export type CopilotQueryRow = typeof copilotQueriesTable.$inferSelect;
