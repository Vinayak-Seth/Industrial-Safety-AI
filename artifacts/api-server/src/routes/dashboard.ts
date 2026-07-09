import { Router, type IRouter } from "express";
import { desc, eq, and } from "drizzle-orm";
import {
  db,
  documentsTable,
  entitiesTable,
  entityRelationsTable,
  complianceGapsTable,
  complianceRulesTable,
  workOrdersTable,
  rcaInsightsTable,
  copilotQueriesTable,
  documentTypeValues,
} from "@workspace/db";
import { GetDashboardSummaryResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  const [documents, entities, relations, gaps, workOrders, rcaInsights, copilotQueries] =
    await Promise.all([
      db.select().from(documentsTable),
      db.select().from(entitiesTable),
      db.select().from(entityRelationsTable),
      db.select().from(complianceGapsTable),
      db.select().from(workOrdersTable),
      db.select().from(rcaInsightsTable),
      db.select().from(copilotQueriesTable),
    ]);

  const rules = await db.select().from(complianceRulesTable);
  const ruleTitleById = new Map(rules.map((r) => [r.id, r.title]));

  const openGaps = gaps.filter((g) => g.status === "open");
  const criticalGaps = openGaps.filter((g) => g.severity === "critical");
  const openWorkOrders = workOrders.filter(
    (w) => w.status === "open" || w.status === "in_progress",
  );

  const docTypeBreakdown = documentTypeValues.map((docType) => ({
    docType,
    count: documents.filter((d) => d.docType === docType).length,
  }));

  const recentQueries = [...copilotQueries]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 5);

  const recentGaps = [...openGaps]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 5)
    .map((g) => ({ ...g, ruleTitle: ruleTitleById.get(g.ruleId) ?? "Unknown rule" }));

  res.json(
    GetDashboardSummaryResponse.parse({
      documentCount: documents.length,
      entityCount: entities.length,
      relationCount: relations.length,
      openComplianceGaps: openGaps.length,
      criticalComplianceGaps: criticalGaps.length,
      openWorkOrders: openWorkOrders.length,
      rcaInsightCount: rcaInsights.length,
      copilotQueryCount: copilotQueries.length,
      docTypeBreakdown,
      recentQueries,
      recentGaps,
    }),
  );
});

export default router;
