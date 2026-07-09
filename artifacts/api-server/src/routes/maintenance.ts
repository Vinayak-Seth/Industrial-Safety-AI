import { Router, type IRouter } from "express";
import { eq, desc, or, ilike } from "drizzle-orm";
import {
  db,
  workOrdersTable,
  rcaInsightsTable,
  entitiesTable,
  documentChunksTable,
} from "@workspace/db";
import {
  ListWorkOrdersQueryParams,
  ListWorkOrdersResponse,
  ListRcaInsightsResponse,
  GenerateRcaInsightsBody,
  GenerateRcaInsightsResponse,
} from "@workspace/api-zod";
import { runRcaAgent } from "../lib/gemini-agents";
import { rankChunks } from "../lib/retrieval";

const router: IRouter = Router();

router.get("/maintenance/work-orders", async (req, res): Promise<void> => {
  const query = ListWorkOrdersQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const rows = await db
    .select()
    .from(workOrdersTable)
    .orderBy(desc(workOrdersTable.createdAt));

  const filtered = query.data.status
    ? rows.filter((w) => w.status === query.data.status)
    : rows;

  res.json(ListWorkOrdersResponse.parse(filtered));
});

router.get("/maintenance/rca", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(rcaInsightsTable)
    .orderBy(desc(rcaInsightsTable.createdAt));
  res.json(ListRcaInsightsResponse.parse(rows));
});

router.post("/maintenance/rca/generate", async (req, res): Promise<void> => {
  const body = GenerateRcaInsightsBody.safeParse(req.body ?? {});
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const targetWorkOrders = body.data.workOrderId
    ? await db
        .select()
        .from(workOrdersTable)
        .where(eq(workOrdersTable.id, body.data.workOrderId))
    : await db
        .select()
        .from(workOrdersTable)
        .where(or(eq(workOrdersTable.status, "open"), eq(workOrdersTable.status, "in_progress")));

  const allChunks = await db.select().from(documentChunksTable);

  const created = [];
  for (const workOrder of targetWorkOrders) {
    const relatedEntities = await db
      .select()
      .from(entitiesTable)
      .where(ilike(entitiesTable.name, `%${workOrder.equipmentName}%`));

    const scored = rankChunks(
      `${workOrder.equipmentName} ${workOrder.description}`,
      allChunks.map((c) => ({
        documentId: c.documentId,
        documentTitle: "",
        chunkIndex: c.chunkIndex,
        content: c.content,
      })),
      4,
    );

    const result = await runRcaAgent({
      equipmentName: workOrder.equipmentName,
      description: workOrder.description,
      relatedEntities: relatedEntities.map((e) => ({
        name: e.name,
        entityType: e.entityType,
        description: e.description,
      })),
      relatedExcerpts: scored.map((c) => c.content),
    });

    if (!result) continue;

    const [insight] = await db
      .insert(rcaInsightsTable)
      .values({
        workOrderId: workOrder.id,
        equipmentName: workOrder.equipmentName,
        title: result.title,
        rootCause: result.rootCause,
        contributingFactors: result.contributingFactors,
        recommendations: result.recommendations,
      })
      .returning();

    if (insight) created.push(insight);
  }

  res.json(GenerateRcaInsightsResponse.parse(created));
});

export default router;
