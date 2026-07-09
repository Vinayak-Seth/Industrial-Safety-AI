---
name: Keyword-only RAG without a vector DB
description: How to build RAG retrieval when there's no embeddings model/vector DB available, using TF-IDF-style keyword scoring over chunks.
---

When a project has no embeddings provider or vector database configured, a custom keyword/TF-IDF-style scoring function over document chunks (rank chunks by term overlap/frequency against the query) is a viable RAG retrieval substitute for small-to-medium document sets.

**Why:** Avoids adding a vector DB dependency or embeddings API call when neither is available/desired, while still producing citation-grounded answers.

**How to apply:** Chunk documents at ingestion time, store chunks in the relational DB, and at query time score all chunks for the current question with a simple keyword-overlap ranker, then pass the top-N chunks to the LLM as context with citations. Works well up to a few hundred chunks; would need real embeddings/vector search past that scale.
