import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const documentTypeValues = [
  "safety_procedure",
  "equipment_manual",
  "inspection_report",
  "regulation",
  "maintenance_record",
  "other",
] as const;

export const documentStatusValues = ["processing", "ready", "failed"] as const;

export const documentsTable = pgTable("documents", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  docType: text("doc_type", { enum: documentTypeValues }).notNull(),
  status: text("status", { enum: documentStatusValues })
    .notNull()
    .default("processing"),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  fileBase64: text("file_base64").notNull(),
  extractedText: text("extracted_text"),
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

export const insertDocumentSchema = createInsertSchema(documentsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type DocumentRow = typeof documentsTable.$inferSelect;
