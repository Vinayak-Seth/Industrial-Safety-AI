import { Router, type IRouter } from "express";
import { eq, or } from "drizzle-orm";
import { db, entitiesTable, entityRelationsTable } from "@workspace/db";
import {
  GetKnowledgeGraphQueryParams,
  GetKnowledgeGraphResponse,
  GetEntityParams,
  GetEntityResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/knowledge-graph", async (req, res): Promise<void> => {
  const query = GetKnowledgeGraphQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const nodes = query.data.entityType
    ? await db
        .select()
        .from(entitiesTable)
        .where(eq(entitiesTable.entityType, query.data.entityType))
    : await db.select().from(entitiesTable);

  const nodeIds = new Set(nodes.map((n) => n.id));
  const allEdges = await db.select().from(entityRelationsTable);
  const edges = allEdges.filter(
    (e) => nodeIds.has(e.sourceEntityId) && nodeIds.has(e.targetEntityId),
  );

  res.json(GetKnowledgeGraphResponse.parse({ nodes, edges }));
});

router.get("/entities/:id", async (req, res): Promise<void> => {
  const params = GetEntityParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [entity] = await db
    .select()
    .from(entitiesTable)
    .where(eq(entitiesTable.id, params.data.id));

  if (!entity) {
    res.status(404).json({ error: "Entity not found" });
    return;
  }

  const relations = await db
    .select()
    .from(entityRelationsTable)
    .where(
      or(
        eq(entityRelationsTable.sourceEntityId, entity.id),
        eq(entityRelationsTable.targetEntityId, entity.id),
      ),
    );

  const outgoingRelations = relations.filter((r) => r.sourceEntityId === entity.id);
  const incomingRelations = relations.filter((r) => r.targetEntityId === entity.id);

  res.json(
    GetEntityResponse.parse({ ...entity, outgoingRelations, incomingRelations }),
  );
});

export default router;
