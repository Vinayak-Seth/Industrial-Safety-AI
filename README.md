# Strata — Industrial Safety AI

Strata is a unified **asset & operations brain** for industrial teams. It ingests plant documents (SOPs, manuals, inspection reports, regulations, maintenance logs) and turns them into a searchable knowledge graph, a grounded Q&A copilot, automated compliance gap scans, and AI-assisted root-cause analysis for maintenance.

## Features

- **Documents / Library** — Upload plant documents; each is auto-summarized, chunked, and has entities, relations, and compliance rules extracted via Gemini.
- **Copilot** — Natural-language Q&A grounded in ingested documents, with citations back to source chunks.
- **Graph Explorer** — Interactive knowledge graph of extracted entities (equipment, procedures, hazards, regulations) and their relations.
- **Compliance** — Automated scan that finds gaps between regulatory/safety rules and what's actually documented or covered.
- **Maintenance** — Work order tracking plus AI-generated root-cause-analysis (RCA) insights.
- **Drawings** — Upload a P&ID / engineering drawing (image or PDF); Gemini vision OCRs tags, classifies symbols (valve, pump, vessel, etc.), traces connections, and renders a digitized component diagram.
- **QMS Sync** — Exports open compliance gaps and work orders as nonconformance/CAPA-style records, can push them to an external QMS webhook (or simulate the sync), and logs sync history.

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 24, TypeScript 5.9, pnpm workspaces |
| API | Express 5 |
| Database | PostgreSQL + Drizzle ORM |
| Validation | Zod (`zod/v4`), `drizzle-zod` |
| API codegen | Orval (generates client hooks & Zod schemas from OpenAPI spec) |
| Build | esbuild (CJS bundle) |
| LLM | Google Gemini via `@google/genai` — no vector DB; retrieval uses a custom TF-IDF-style keyword chunk scorer |
| Frontend | React + Vite, dark "control room" theme (deep slate background, safety-orange primary, Inter + Space Mono fonts) |

## Project Structure

```
.
├── artifacts/
│   ├── api-server/        # Express API (routes, Gemini integration, retrieval logic)
│   │   └── src/
│   │       ├── lib/       # gemini-ingest, gemini-agents, gemini-vision, retrieval
│   │       └── routes/    # documents, compliance, maintenance, copilot,
│   │                      # knowledgeGraph, dashboard, drawings, qms, health
│   ├── strata/            # React + Vite frontend
│   │   └── src/pages/     # dashboard, documents, copilot, knowledge-graph,
│   │                      # compliance, maintenance, drawings, qms
│   └── mockup-sandbox/    # UI sandbox/prototyping workspace
├── lib/
│   ├── db/                # Drizzle schema — source of truth for the data model
│   ├── gemini/            # Shared Gemini client wrapper
│   ├── api-spec/          # OpenAPI spec + Orval codegen config
│   ├── api-zod/           # Generated Zod schemas/types
│   └── api-client-react/  # Generated React Query API hooks
├── scripts/                # Misc workspace scripts
└── attached_assets/        # Static reference assets
```

## Prerequisites

- Node.js 24
- pnpm
- PostgreSQL database
- A Google Gemini API key

## Environment Variables

Set the following before running the API server:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `GEMINI_API_KEY` | Google Gemini API access key |

## Getting Started

Install dependencies:

```bash
pnpm install
```

Push the database schema (dev only):

```bash
pnpm --filter @workspace/db run push
```

Run the API server (port `8080`):

```bash
pnpm --filter @workspace/api-server run dev
```

Run the web frontend:

```bash
pnpm --filter @workspace/strata run dev
```

## Common Scripts

| Command | Description |
|---|---|
| `pnpm run typecheck` | Full typecheck across all packages |
| `pnpm run build` | Typecheck + build all packages |
| `pnpm --filter @workspace/api-spec run codegen` | Regenerate API hooks and Zod schemas from the OpenAPI spec |
| `pnpm --filter @workspace/db run push` | Push DB schema changes (dev only) |

## Architecture Notes

- **No embeddings / vector DB** — RAG retrieval uses a custom keyword/TF-IDF-style scorer (`rankChunks`) over document chunks, sufficient for hackathon-scale document counts.
- **Simple uploads** — Document uploads are sent as a JSON body with base64 content (25 MB request limit, 20 MB decoded-size cap), with mimeType allowlist validation. No object storage or auth layer — kept intentionally simple for the current project scope.
- **Compliance/RCA agents** use numeric `ruleId`/`documentId` references (not string title-matching) and a generous `maxOutputTokens` (32768) to avoid truncated-JSON failures on large rule/document sets.
- **Error handling** — Global Express error-handling middleware returns JSON (not HTML) for unhandled route errors.
- **SSRF protection** — `/qms/sync` validates any user-supplied webhook `targetUrl` (HTTPS-only, blocks localhost/private/link-local IPs and hostnames) before the server-side `fetch` call.

## License

MIT
