import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import {
  db,
  complianceRulesTable,
  complianceGapsTable,
  documentsTable,
} from "@workspace/db";
import {
  ListComplianceRulesResponse,
  ListComplianceGapsQueryParams,
  ListComplianceGapsResponse,
  UpdateComplianceGapParams,
  UpdateComplianceGapBody,
  UpdateComplianceGapResponse,
  RunComplianceScanResponse,
} from "@workspace/api-zod";
import { runComplianceGapAgent } from "../lib/gemini-agents";

const router: IRouter = Router();

async function gapWithRuleTitle(gap: typeof complianceGapsTable.$inferSelect) {
  const [rule] = await db
    .select()
    .from(complianceRulesTable)
    .where(eq(complianceRulesTable.id, gap.ruleId));
  return { ...gap, ruleTitle: rule?.title ?? "Unknown rule" };
}

router.get("/compliance/rules", async (_req, res): Promise<void> => {
  const rules = await db
    .select()
    .from(complianceRulesTable)
    .orderBy(desc(complianceRulesTable.createdAt));
  res.json(ListComplianceRulesResponse.parse(rules));
});

router.get("/compliance/gaps", async (req, res): Promise<void> => {
  const query = ListComplianceGapsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const rows = await db
    .select()
    .from(complianceGapsTable)
    .orderBy(desc(complianceGapsTable.createdAt));

  const filtered = rows.filter((g) => {
    if (query.data.status && g.status !== query.data.status) return false;
    if (query.data.severity && g.severity !== query.data.severity) return false;
    return true;
  });

  const withTitles = await Promise.all(filtered.map(gapWithRuleTitle));
  res.json(ListComplianceGapsResponse.parse(withTitles));
});

router.patch("/compliance/gaps/:id", async (req, res): Promise<void> => {
  const params = UpdateComplianceGapParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = UpdateComplianceGapBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [gap] = await db
    .update(complianceGapsTable)
    .set({ status: body.data.status })
    .where(eq(complianceGapsTable.id, params.data.id))
    .returning();

  if (!gap) {
    res.status(404).json({ error: "Compliance gap not found" });
    return;
  }

  res.json(UpdateComplianceGapResponse.parse(await gapWithRuleTitle(gap)));
});

router.post("/compliance/scan", async (req, res): Promise<void> => {
  const rules = await db.select().from(complianceRulesTable);
  const readyDocuments = await db
    .select()
    .from(documentsTable)
    .where(eq(documentsTable.status, "ready"));

  const documentsWithText = readyDocuments.filter((d) => d.extractedText);

  req.log.info(
    { ruleCount: rules.length, documentCount: documentsWithText.length },
    "Running compliance scan",
  );

  const findings = await runComplianceGapAgent({
    rules: rules.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      category: r.category,
    })),
    documents: documentsWithText.map((d) => ({
      id: d.id,
      title: d.title,
      docType: d.docType,
      extractedText: d.extractedText ?? "",
    })),
  });

  const ruleIds = new Set(rules.map((r) => r.id));
  const documentIds = new Set(documentsWithText.map((d) => d.id));

  const createdGaps = [];
  for (const finding of findings) {
    if (!ruleIds.has(finding.ruleId)) {
      req.log.warn({ finding }, "Compliance agent returned unknown ruleId");
      continue;
    }
    const documentId =
      finding.documentId && documentIds.has(finding.documentId)
        ? finding.documentId
        : null;

    const [gap] = await db
      .insert(complianceGapsTable)
      .values({
        ruleId: finding.ruleId,
        documentId,
        severity: finding.severity,
        status: "open",
        description: finding.description,
        recommendation: finding.recommendation,
      })
      .returning();
    if (gap) createdGaps.push(await gapWithRuleTitle(gap));
  }

  res.json(
    RunComplianceScanResponse.parse({
      rulesEvaluated: rules.length,
      documentsScanned: documentsWithText.length,
      gapsFound: createdGaps.length,
      gaps: createdGaps,
    }),
  );
});

export default router;
