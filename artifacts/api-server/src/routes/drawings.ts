import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import {
  db,
  pidDrawingsTable,
  pidComponentsTable,
  pidConnectionsTable,
} from "@workspace/db";
import {
  CreateDrawingBody,
  CreateDrawingResponse,
  GetDrawingParams,
  GetDrawingResponse,
  DeleteDrawingParams,
  ListDrawingsResponse,
} from "@workspace/api-zod";
import { extractDrawing } from "../lib/gemini-vision";

const router: IRouter = Router();

const ALLOWED_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "application/pdf"]);
const MAX_DECODED_BYTES = 20 * 1024 * 1024;
const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;

router.get("/drawings", async (_req, res): Promise<void> => {
  const rows = await db.select().from(pidDrawingsTable);
  res.json(ListDrawingsResponse.parse(rows));
});

router.post("/drawings", async (req, res): Promise<void> => {
  const parsed = CreateDrawingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { title, fileName, mimeType, fileBase64 } = parsed.data;

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
  const decodedBytes = Math.floor((fileBase64.length * 3) / 4);
  if (decodedBytes > MAX_DECODED_BYTES) {
    res.status(413).json({
      error: `File too large: ${decodedBytes} bytes exceeds the ${MAX_DECODED_BYTES} byte limit`,
    });
    return;
  }

  const [drawing] = await db
    .insert(pidDrawingsTable)
    .values({ title, fileName, mimeType, fileBase64, status: "processing" })
    .returning();

  if (!drawing) {
    res.status(400).json({ error: "Failed to create drawing" });
    return;
  }

  try {
    await runDrawingDigitization(drawing.id, fileBase64, mimeType, title);
    const [updated] = await db
      .select()
      .from(pidDrawingsTable)
      .where(eq(pidDrawingsTable.id, drawing.id));
    res.status(201).json(CreateDrawingResponse.parse(updated));
  } catch (err) {
    req.log.error({ err, drawingId: drawing.id }, "Drawing digitization failed");
    const [failed] = await db
      .update(pidDrawingsTable)
      .set({
        status: "failed",
        processingError: err instanceof Error ? err.message : "Unknown digitization error",
      })
      .where(eq(pidDrawingsTable.id, drawing.id))
      .returning();
    res.status(201).json(CreateDrawingResponse.parse(failed));
  }
});

router.get("/drawings/:id", async (req, res): Promise<void> => {
  const params = GetDrawingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [drawing] = await db
    .select()
    .from(pidDrawingsTable)
    .where(eq(pidDrawingsTable.id, params.data.id));

  if (!drawing) {
    res.status(404).json({ error: "Drawing not found" });
    return;
  }

  const components = await db
    .select()
    .from(pidComponentsTable)
    .where(eq(pidComponentsTable.drawingId, drawing.id));

  const connections = await db
    .select()
    .from(pidConnectionsTable)
    .where(eq(pidConnectionsTable.drawingId, drawing.id));

  res.json(GetDrawingResponse.parse({ ...drawing, components, connections }));
});

router.delete("/drawings/:id", async (req, res): Promise<void> => {
  const params = DeleteDrawingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [drawing] = await db
    .delete(pidDrawingsTable)
    .where(eq(pidDrawingsTable.id, params.data.id))
    .returning();

  if (!drawing) {
    res.status(404).json({ error: "Drawing not found" });
    return;
  }

  res.sendStatus(204);
});

async function runDrawingDigitization(
  drawingId: number,
  fileBase64: string,
  mimeType: string,
  title: string,
): Promise<void> {
  const extraction = await extractDrawing(fileBase64, mimeType, title);

  const tagToComponentId = new Map<string, number>();
  for (const component of extraction.components) {
    const [row] = await db
      .insert(pidComponentsTable)
      .values({
        drawingId,
        tag: component.tag,
        componentType: component.componentType,
        label: component.label,
        description: component.description ?? null,
      })
      .returning();
    if (row) tagToComponentId.set(component.tag.toLowerCase(), row.id);
  }

  for (const connection of extraction.connections) {
    const fromId = tagToComponentId.get(connection.fromTag.toLowerCase());
    const toId = tagToComponentId.get(connection.toTag.toLowerCase());
    if (!fromId || !toId) continue;
    await db.insert(pidConnectionsTable).values({
      drawingId,
      fromComponentId: fromId,
      toComponentId: toId,
      lineType: connection.lineType,
      description: connection.description ?? null,
    });
  }

  await db
    .update(pidDrawingsTable)
    .set({ status: "ready", summary: extraction.summary, processingError: null })
    .where(eq(pidDrawingsTable.id, drawingId));
}

export default router;
