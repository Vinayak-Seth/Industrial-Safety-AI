import {
  pgTable,
  text,
  serial,
  integer,
  date,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { documentsTable } from "./documents";

export const workOrderStatusValues = [
  "open",
  "in_progress",
  "completed",
] as const;
export const workOrderPriorityValues = [
  "low",
  "medium",
  "high",
  "critical",
] as const;

export const workOrdersTable = pgTable("work_orders", {
  id: serial("id").primaryKey(),
  equipmentName: text("equipment_name").notNull(),
  description: text("description").notNull(),
  status: text("status", { enum: workOrderStatusValues })
    .notNull()
    .default("open"),
  priority: text("priority", { enum: workOrderPriorityValues })
    .notNull()
    .default("medium"),
  reportedDate: date("reported_date", { mode: "string" }).notNull(),
  resolvedDate: date("resolved_date", { mode: "string" }),
  documentId: integer("document_id").references(() => documentsTable.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const rcaInsightsTable = pgTable("rca_insights", {
  id: serial("id").primaryKey(),
  workOrderId: integer("work_order_id").references(() => workOrdersTable.id, {
    onDelete: "set null",
  }),
  equipmentName: text("equipment_name").notNull(),
  title: text("title").notNull(),
  rootCause: text("root_cause").notNull(),
  contributingFactors: jsonb("contributing_factors")
    .$type<string[]>()
    .notNull()
    .default([]),
  recommendations: jsonb("recommendations")
    .$type<string[]>()
    .notNull()
    .default([]),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertWorkOrderSchema = createInsertSchema(workOrdersTable).omit({
  id: true,
  createdAt: true,
});
export type InsertWorkOrder = z.infer<typeof insertWorkOrderSchema>;
export type WorkOrderRow = typeof workOrdersTable.$inferSelect;

export const insertRcaInsightSchema = createInsertSchema(
  rcaInsightsTable,
).omit({ id: true, createdAt: true });
export type InsertRcaInsight = z.infer<typeof insertRcaInsightSchema>;
export type RcaInsightRow = typeof rcaInsightsTable.$inferSelect;
