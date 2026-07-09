export interface ScorableChunk {
  documentId: number;
  documentTitle: string;
  chunkIndex: number;
  content: string;
}

const STOPWORDS = new Set([
  "the", "a", "an", "of", "to", "in", "on", "for", "and", "or", "is", "are",
  "was", "were", "be", "been", "being", "with", "at", "by", "from", "as",
  "that", "this", "it", "its", "into", "shall", "must", "should", "will",
  "what", "which", "who", "when", "where", "how", "why", "do", "does", "did",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((tok) => tok.length > 2 && !STOPWORDS.has(tok));
}

/**
 * Lightweight keyword/TF-style retrieval over document chunks. Replit's AI
 * integrations do not expose an embeddings API, so this scores chunks by
 * term overlap with the query (a simplified TF-IDF-style scoring) to
 * shortlist candidates for grounded generation instead of using a vector DB.
 */
export function rankChunks(
  query: string,
  chunks: ScorableChunk[],
  topK = 6,
): ScorableChunk[] {
  const queryTerms = tokenize(query);
  if (queryTerms.length === 0 || chunks.length === 0) return chunks.slice(0, topK);

  const docCount = chunks.length;
  const termDocFreq = new Map<string, number>();
  const chunkTermCounts = chunks.map((chunk) => {
    const terms = tokenize(chunk.content);
    const counts = new Map<string, number>();
    for (const term of terms) {
      counts.set(term, (counts.get(term) ?? 0) + 1);
    }
    for (const term of counts.keys()) {
      termDocFreq.set(term, (termDocFreq.get(term) ?? 0) + 1);
    }
    return counts;
  });

  const scores = chunks.map((chunk, idx) => {
    const counts = chunkTermCounts[idx];
    let score = 0;
    for (const term of queryTerms) {
      const tf = counts?.get(term) ?? 0;
      if (tf === 0) continue;
      const df = termDocFreq.get(term) ?? 1;
      const idf = Math.log((docCount + 1) / df) + 1;
      score += tf * idf;
    }
    return { chunk, score };
  });

  return scores
    .sort((a, b) => b.score - a.score)
    .filter((s) => s.score > 0)
    .slice(0, topK)
    .map((s) => s.chunk)
    .concat(scores.every((s) => s.score === 0) ? chunks.slice(0, topK) : []);
}
