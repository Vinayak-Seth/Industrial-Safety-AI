import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { documentsTable } from "./documents";

export const documentChunksTable = pgTable("document_chunks", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id")
    .notNull()
    .references(() => documentsTable.id, { onDelete: "cascade" }),
  chunkIndex: integer("chunk_index").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertDocumentChunkSchema = createInsertSchema(
  documentChunksTable,
).omit({ id: true, createdAt: true });
export type InsertDocumentChunk = z.infer<typeof insertDocumentChunkSchema>;
export type DocumentChunkRow = typeof documentChunksTable.$inferSelect;
