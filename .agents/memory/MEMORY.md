# Memory Index

- [Keyword-only RAG without a vector DB](rag-keyword-retrieval.md) — TF-IDF-style chunk scoring works as a no-infra RAG retrieval fallback.
- [Gemini direct API key fallback](gemini-direct-api-key.md) — use `GEMINI_API_KEY` directly via a custom lib when Replit's AI Integrations proxy is unavailable on the account.
- [Workspace TS libs from plain .mjs scripts](workspace-ts-lib-mjs-import.md) — `ERR_UNSUPPORTED_DIR_IMPORT` when importing `@workspace/*` TS-source libs from an unbundled script; use `executeSql` or a bundled entry point instead.
- [Gemini JSON-schema agent prompting](gemini-json-schema-agents.md) — generous `maxOutputTokens` and numeric-id references (not string matching or leaking ids into prose) for reliable structured extraction/scan agents.
- [Webhook/callback URL SSRF guard](webhook-ssrf-guard.md) — validate any user-supplied URL the server will `fetch()` (https-only, block private/link-local/metadata hosts) before the request.
