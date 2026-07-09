import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import {
  db,
  complianceGapsTable,
  complianceRulesTable,
  workOrdersTable,
  qmsSyncLogTable,
} from "@workspace/db";
import {
  GetQmsExportResponse,
  SyncToQmsBody,
  SyncToQmsResponse,
  ListQmsSyncLogResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

// Builds a vendor-neutral QMS export payload shaped like a standard
// nonconformance/CAPA (Corrective and Preventive Action) record set --
// the common interchange shape most Quality Management Systems (e.g.
// MasterControl, ETQ, TrackWise) ingest for findings raised outside the QMS
// itself. This is the integration boundary a real QMS connector would sit
// behind; today it's populated from Strata's own compliance gaps + open
// work orders and either returned for inspection or POSTed to a target URL.
async function buildQmsExport() {
  const [gaps, rules, workOrders] = await Promise.all([
    db.select().from(complianceGapsTable).where(eq(complianceGapsTable.status, "open")),
    db.select().from(complianceRulesTable),
    db
      .select()
      .from(workOrdersTable)
      .where(eq(workOrdersTable.status, "open")),
  ]);

  const ruleTitleById = new Map(rules.map((r) => [r.id, r.title]));

  const nonconformances = gaps.map((g) => ({
    externalId: `STRATA-GAP-${g.id}`,
    source: "strata_compliance_agent",
    findingType: "nonconformance" as const,
    title: ruleTitleById.get(g.ruleId) ?? "Untitled rule",
    severity: g.severity,
    description: g.description,
    correctiveAction: g.recommendation,
    detectedAt: g.createdAt.toISOString(),
  }));

  const capaItems = workOrders.map((w) => ({
    externalId: `STRATA-WO-${w.id}`,
    source: "strata_maintenance",
    findingType: "corrective_action" as const,
    title: `${w.equipmentName} maintenance issue`,
    severity: w.priority,
    description: w.description,
    correctiveAction: null,
    detectedAt: w.createdAt.toISOString(),
  }));

  return {
    exportedAt: new Date().toISOString(),
    schemaVersion: "strata-qms-export-v1",
    records: [...nonconformances, ...capaItems],
  };
}

router.get("/qms/export", async (_req, res): Promise<void> => {
  res.json(GetQmsExportResponse.parse(await buildQmsExport()));
});

// Blocks SSRF: only plain https:// URLs to a public hostname are allowed as
// QMS webhook targets. Rejects loopback/link-local/private-network literal
// IPs and non-http(s) schemes (file:, gopher:, etc.) outright. This is a
// best-effort literal-IP check, not DNS-rebinding-proof, but it closes off
// the obvious internal-service and metadata-endpoint probing vector for a
// server-side fetch driven by user input.
function assertSafeWebhookUrl(rawUrl: string): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("targetUrl must be a valid URL");
  }
  if (url.protocol !== "https:") {
    throw new Error("targetUrl must use https://");
  }
  const hostname = url.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname === "metadata.google.internal"
  ) {
    throw new Error("targetUrl may not point to a local or metadata hostname");
  }
  const ipv4 = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = ipv4.slice(1).map(Number);
    const isPrivate =
      a === 127 || // loopback
      a === 10 || // private
      (a === 172 && b >= 16 && b <= 31) || // private
      (a === 192 && b === 168) || // private
      (a === 169 && b === 254) || // link-local / metadata
      a === 0;
    if (isPrivate) {
      throw new Error("targetUrl may not point to a private or link-local IP address");
    }
  }
  if (hostname === "::1" || hostname.startsWith("fe80:") || hostname.startsWith("fc") || hostname.startsWith("fd")) {
    throw new Error("targetUrl may not point to a private or link-local IPv6 address");
  }
  return url;
}

router.post("/qms/sync", async (req, res): Promise<void> => {
  const body = SyncToQmsBody.safeParse(req.body ?? {});
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const exportPayload = await buildQmsExport();
  const rawTargetUrl = body.data.targetUrl?.trim() || null;

  let targetUrl: string | null = null;
  let status: "success" | "failed" = "success";
  let responseSnippet = "Simulated sync: no targetUrl provided, payload validated locally.";

  if (rawTargetUrl) {
    try {
      const safeUrl = assertSafeWebhookUrl(rawTargetUrl);
      targetUrl = safeUrl.toString();
      const response = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(exportPayload),
        signal: AbortSignal.timeout(8000),
      });
      const text = await response.text();
      status = response.ok ? "success" : "failed";
      responseSnippet = `HTTP ${response.status}: ${text.slice(0, 300)}`;
    } catch (err) {
      targetUrl = rawTargetUrl;
      status = "failed";
      responseSnippet = err instanceof Error ? err.message : "Unknown webhook error";
      req.log.warn({ err, targetUrl: rawTargetUrl }, "QMS webhook push failed");
    }
  }

  const hasGaps = exportPayload.records.some((r) => r.source === "strata_compliance_agent");
  const hasWorkOrders = exportPayload.records.some((r) => r.source === "strata_maintenance");
  const syncType = hasWorkOrders && !hasGaps ? "work_orders" : "compliance_gaps";

  const [log] = await db
    .insert(qmsSyncLogTable)
    .values({
      syncType,
      targetUrl,
      recordCount: exportPayload.records.length,
      status,
      responseSnippet,
    })
    .returning();

  res.json(SyncToQmsResponse.parse({ ...log, export: exportPayload }));
});

router.get("/qms/logs", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(qmsSyncLogTable)
    .orderBy(desc(qmsSyncLogTable.createdAt))
    .limit(50);
  res.json(ListQmsSyncLogResponse.parse(rows));
});

export default router;
