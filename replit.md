# Strata

Strata is a unified "asset & operations brain" for industrial teams: it ingests plant documents (SOPs, manuals, inspection reports, regulations, maintenance logs) and turns them into a searchable knowledge graph, a grounded Q&A copilot, automated compliance gap scans, and AI-assisted root-cause analysis for maintenance.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, workflow: `artifacts/api-server: API Server`)
- `pnpm --filter @workspace/strata run dev` — run the web frontend (workflow: `artifacts/strata: web`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` (Postgres), `GEMINI_API_KEY` (Gemini API access)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- LLM: Google Gemini via `@google/genai`, called directly with `GEMINI_API_KEY` (no vector DB — retrieval is TF-IDF-style keyword chunk scoring)
- Frontend: React + Vite, dark "control room" theme (deep slate background, safety-orange primary, Inter + Space Mono fonts)

## Where things live

- `artifacts/api-server/src/lib/gemini-ingest.ts` — document extraction (text, summary, entities, relations, compliance rules) on upload
- `artifacts/api-server/src/lib/gemini-agents.ts` — compliance gap-finding and maintenance RCA agents
- `artifacts/api-server/src/lib/retrieval.ts` — keyword-based chunk ranking for the copilot RAG flow
- `artifacts/api-server/src/lib/gemini-vision.ts` — P&ID/drawing digitization (CV: OCR tag reading + symbol classification + line tracing) via Gemini vision
- `artifacts/api-server/src/routes/` — one router per domain: documents, compliance, maintenance, copilot, knowledgeGraph, dashboard, drawings, qms
- `lib/db/src/schema/` — Drizzle schema, source of truth for the data model
- `artifacts/strata/src/pages/` — one page per route: overview, documents (list/detail), copilot, knowledge-graph, compliance, maintenance, drawings (list/detail), qms

## Architecture decisions

- No embeddings/vector DB: RAG retrieval uses a custom keyword/TF-IDF-style scorer (`rankChunks`) over document chunks — sufficient for hackathon-scale document counts.
- Document uploads are JSON body base64 (25mb limit), no object storage/auth — kept intentionally simple for the hackathon scope. Server validates mimeType allowlist, base64 format, and a 20MB decoded-size cap before persisting.
- Compliance/RCA agents use numeric `ruleId`/`documentId` references (not string title-matching) tagged in the prompt, with generous `maxOutputTokens` (32768) to avoid truncated-JSON failures on large rule/document sets.
- Global Express error-handling middleware returns JSON (not HTML) for unhandled route errors.
- `/qms/sync` validates any user-supplied webhook `targetUrl` (https-only, blocks localhost/private/link-local IPs and hostnames) before the server-side `fetch`, to close off SSRF via that input.

## Product

- **Documents/Library**: upload plant documents; each is auto-summarized, chunked, and entity/relation/compliance-rule extracted via Gemini.
- **Copilot**: natural-language Q&A grounded in ingested documents, with citations back to source chunks.
- **Graph Explorer**: interactive knowledge graph of extracted entities (equipment, procedures, hazards, regulations) and their relations.
- **Compliance**: automated scan that finds gaps between regulatory/safety rules and what's actually documented/covered.
- **Maintenance**: work order tracking plus AI-generated root-cause-analysis insights.
- **Drawings**: upload a P&ID / engineering drawing image (or PDF); Gemini vision OCRs tags, classifies symbols (valve/pump/vessel/etc.), traces connections, and renders a digitized component diagram.
- **QMS Sync**: exports open compliance gaps + work orders as nonconformance/CAPA-style records and can push them to an external QMS webhook (or simulate the sync); logs sync history. No real QMS vendor is wired up — this is the integration boundary a real connector would sit behind.

## User preferences

_None recorded yet._

## Gotchas

- `@google/genai` must be a direct dependency of any package that imports it directly (not just re-exported from `@workspace/gemini`), or composite TS project-reference typecheck fails.
- Don't import `@workspace/db` (or other TS-source workspace libs) from a plain unbundled `.mjs` script — use `executeSql` or a bundled entry point instead (`ERR_UNSUPPORTED_DIR_IMPORT`).

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
