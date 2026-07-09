import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import {
  db,
  documentsTable,
  documentChunksTable,
  entitiesTable,
  entityRelationsTable,
  complianceRulesTable,
} from "@workspace/db";
import {
  CreateDocumentBody,
  CreateDocumentResponse,
  GetDocumentParams,
  GetDocumentResponse,
  DeleteDocumentParams,
  ListDocumentsQueryParams,
  ListDocumentsResponse,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";
import { chunkText, extractDocument } from "../lib/gemini-ingest";

const router: IRouter = Router();

const ALLOWED_MIME_TYPES = new Set([
  "text/plain",
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
]);
// Base64 inflates size by ~4/3; 20MB decoded caps the JSON body comfortably
// under the 25mb express.json() limit while giving a clear validation error
// instead of an opaque body-parser rejection.
const MAX_DECODED_BYTES = 20 * 1024 * 1024;
const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;

router.get("/documents", async (req, res): Promise<void> => {
  const query = ListDocumentsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const rows = await db
    .select()
    .from(documentsTable)
    .orderBy(desc(documentsTable.createdAt));

  const filtered = rows.filter((doc) => {
    if (query.data.docType && doc.docType !== query.data.docType) return false;
    if (query.data.status && doc.status !== query.data.status) return false;
    return true;
  });

  res.json(ListDocumentsResponse.parse(filtered));
});

router.post("/documents", async (req, res): Promise<void> => {
  const parsed = CreateDocumentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { title, docType, fileName, mimeType, fileBase64 } = parsed.data;

  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    res.status(400).json({
      error: `Unsupported mimeType "${mimeType}". Allowed: ${Array.from(ALLOWED_MIME_TYPES).join(", ")}`,
    });
    return;
  }
  if (!BASE64_PATTERN.test(fileBase64)) {
    res.status(400).json({ error: "fileBase64 is not valid base64 content" });
    return;
  }
  // Decoded byte length without materializing the buffer: 3 bytes per 4 base64 chars.
  const decodedBytes = Math.floor((fileBase64.length * 3) / 4);
  if (decodedBytes > MAX_DECODED_BYTES) {
    res.status(413).json({
      error: `File too large: ${decodedBytes} bytes exceeds the ${MAX_DECODED_BYTES} byte limit`,
    });
    return;
  }

  const [doc] = await db
    .insert(documentsTable)
    .values({ title, docType, fileName, mimeType, fileBase64, status: "processing" })
    .returning();

  if (!doc) {
    res.status(400).json({ error: "Failed to create document" });
    return;
  }

  try {
    await runIngestionPipeline(doc.id, fileBase64, mimeType, title);
    const [updated] = await db
      .select()
      .from(documentsTable)
      .where(eq(documentsTable.id, doc.id));
    res.status(201).json(CreateDocumentResponse.parse(updated));
  } catch (err) {
    req.log.error({ err, documentId: doc.id }, "Document ingestion failed");
    const [failed] = await db
      .update(documentsTable)
      .set({
        status: "failed",
        processingError:
          err instanceof Error ? err.message : "Unknown ingestion error",
      })
      .where(eq(documentsTable.id, doc.id))
      .returning();
    res.status(201).json(CreateDocumentResponse.parse(failed));
  }
});

router.get("/documents/:id", async (req, res): Promise<void> => {
  const params = GetDocumentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [doc] = await db
    .select()
    .from(documentsTable)
    .where(eq(documentsTable.id, params.data.id));

  if (!doc) {
    res.status(404).json({ error: "Document not found" });
    return;
  }

  const chunks = await db
    .select()
    .from(documentChunksTable)
    .where(eq(documentChunksTable.documentId, doc.id))
    .orderBy(documentChunksTable.chunkIndex);

  const entities = await db
    .select()
    .from(entitiesTable)
    .where(eq(entitiesTable.documentId, doc.id));

  res.json(GetDocumentResponse.parse({ ...doc, chunks, entities }));
});

router.delete("/documents/:id", async (req, res): Promise<void> => {
  const params = DeleteDocumentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [doc] = await db
    .delete(documentsTable)
    .where(eq(documentsTable.id, params.data.id))
    .returning();

  if (!doc) {
    res.status(404).json({ error: "Document not found" });
    return;
  }

  res.sendStatus(204);
});

export async function runIngestionPipeline(
  documentId: number,
  fileBase64: string,
  mimeType: string,
  title: string,
): Promise<void> {
  const extraction = await extractDocument(fileBase64, mimeType, title);

  const chunks = chunkText(extraction.extractedText);
  if (chunks.length > 0) {
    await db.insert(documentChunksTable).values(
      chunks.map((content, chunkIndex) => ({
        documentId,
        chunkIndex,
        content,
      })),
    );
  }

  const entityIdByName = new Map<string, number>();
  for (const entity of extraction.entities) {
    const [row] = await db
      .insert(entitiesTable)
      .values({
        entityType: entity.entityType,
        name: entity.name,
        description: entity.description,
        documentId,
      })
      .returning();
    if (row) entityIdByName.set(entity.name.toLowerCase(), row.id);
  }

  for (const relation of extraction.relations) {
    const sourceId = entityIdByName.get(relation.sourceName.toLowerCase());
    const targetId = entityIdByName.get(relation.targetName.toLowerCase());
    if (!sourceId || !targetId) {
      logger.warn(
        { relation },
        "Skipping relation with unresolved entity name",
      );
      continue;
    }
    await db.insert(entityRelationsTable).values({
      sourceEntityId: sourceId,
      targetEntityId: targetId,
      relationType: relation.relationType,
      description: relation.description ?? null,
    });
  }

  for (const rule of extraction.complianceRules) {
    await db.insert(complianceRulesTable).values({
      title: rule.title,
      description: rule.description,
      category: rule.category,
      sourceDocumentId: documentId,
    });
  }

  await db
    .update(documentsTable)
    .set({
      status: "ready",
      extractedText: extraction.extractedText,
      summary: extraction.summary,
      processingError: null,
    })
    .where(eq(documentsTable.id, documentId));
}

export default router;
