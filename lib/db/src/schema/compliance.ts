import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { documentsTable } from "./documents";

export const complianceSeverityValues = [
  "critical",
  "high",
  "medium",
  "low",
] as const;

export const complianceGapStatusValues = ["open", "resolved"] as const;

export const complianceRulesTable = pgTable("compliance_rules", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  sourceDocumentId: integer("source_document_id").references(
    () => documentsTable.id,
    { onDelete: "set null" },
  ),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const complianceGapsTable = pgTable("compliance_gaps", {
  id: serial("id").primaryKey(),
  ruleId: integer("rule_id")
    .notNull()
    .references(() => complianceRulesTable.id, { onDelete: "cascade" }),
  documentId: integer("document_id").references(() => documentsTable.id, {
    onDelete: "set null",
  }),
  severity: text("severity", { enum: complianceSeverityValues }).notNull(),
  status: text("status", { enum: complianceGapStatusValues })
    .notNull()
    .default("open"),
  description: text("description").notNull(),
  recommendation: text("recommendation").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertComplianceRuleSchema = createInsertSchema(
  complianceRulesTable,
).omit({ id: true, createdAt: true });
export type InsertComplianceRule = z.infer<typeof insertComplianceRuleSchema>;
export type ComplianceRuleRow = typeof complianceRulesTable.$inferSelect;

export const insertComplianceGapSchema = createInsertSchema(
  complianceGapsTable,
).omit({ id: true, createdAt: true });
export type InsertComplianceGap = z.infer<typeof insertComplianceGapSchema>;
export type ComplianceGapRow = typeof complianceGapsTable.$inferSelect;
