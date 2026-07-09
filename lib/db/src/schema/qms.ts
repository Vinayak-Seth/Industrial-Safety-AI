import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const qmsSyncTypeValues = ["compliance_gaps", "work_orders"] as const;
export const qmsSyncStatusValues = ["success", "failed"] as const;

// Log of attempts to push Strata records out to an external Quality
// Management System (QMS) as nonconformance / CAPA-style records. No real
// QMS vendor is wired up -- this simulates the integration boundary (export
// format + webhook push + audit log) so a real QMS connector can be dropped
// in behind `syncToQms()` without changing the data model.
export const qmsSyncLogTable = pgTable("qms_sync_log", {
  id: serial("id").primaryKey(),
  syncType: text("sync_type", { enum: qmsSyncTypeValues }).notNull(),
  targetUrl: text("target_url"),
  recordCount: integer("record_count").notNull(),
  status: text("status", { enum: qmsSyncStatusValues }).notNull(),
  responseSnippet: text("response_snippet"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertQmsSyncLogSchema = createInsertSchema(qmsSyncLogTable).omit({
  id: true,
  createdAt: true,
});
export type InsertQmsSyncLog = z.infer<typeof insertQmsSyncLogSchema>;
export type QmsSyncLogRow = typeof qmsSyncLogTable.$inferSelect;
