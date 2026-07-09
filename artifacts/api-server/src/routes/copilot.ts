import { Router, type IRouter } from "express";
import { desc } from "drizzle-orm";
import { db, documentChunksTable, documentsTable, copilotQueriesTable } from "@workspace/db";
import {
  QueryCopilotBody,
  QueryCopilotResponse,
  ListCopilotHistoryResponse,
} from "@workspace/api-zod";
import { rankChunks } from "../lib/retrieval";
import { answerCopilotQuestion } from "../lib/gemini-agents";

const router: IRouter = Router();

router.post("/copilot/query", async (req, res): Promise<void> => {
  const body = QueryCopilotBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const startedAt = Date.now();

  const chunks = await db.select().from(documentChunksTable);
  const documents = await db.select().from(documentsTable);
  const titleById = new Map(documents.map((d) => [d.id, d.title]));

  const scorable = chunks.map((c) => ({
    documentId: c.documentId,
    documentTitle: titleById.get(c.documentId) ?? "Unknown document",
    chunkIndex: c.chunkIndex,
    content: c.content,
  }));

  const topChunks = rankChunks(body.data.question, scorable, 6);

  const answer = await answerCopilotQuestion(body.data.question, topChunks);
  const responseTimeMs = Date.now() - startedAt;

  const citations = topChunks.map((c) => ({
    documentId: c.documentId,
    documentTitle: c.documentTitle,
    chunkIndex: c.chunkIndex,
    excerpt: c.content.slice(0, 300),
  }));

  const [saved] = await db
    .insert(copilotQueriesTable)
    .values({
      question: body.data.question,
      answer,
      citations,
      responseTimeMs,
    })
    .returning();

  res.json(QueryCopilotResponse.parse(saved));
});

router.get("/copilot/history", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(copilotQueriesTable)
    .orderBy(desc(copilotQueriesTable.createdAt))
    .limit(50);
  res.json(ListCopilotHistoryResponse.parse(rows));
});

export default router;
