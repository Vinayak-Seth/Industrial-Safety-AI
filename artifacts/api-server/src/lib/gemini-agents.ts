import { Type } from "@google/genai";
import { ai, GEMINI_TEXT_MODEL } from "@workspace/gemini";
import { logger } from "./logger";

export interface ComplianceGapFinding {
  ruleId: number;
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  recommendation: string;
  documentId?: number;
}

const complianceScanSchema = {
  type: Type.OBJECT,
  properties: {
    gaps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          ruleId: { type: Type.NUMBER },
          severity: {
            type: Type.STRING,
            enum: ["critical", "high", "medium", "low"],
          },
          description: { type: Type.STRING },
          recommendation: { type: Type.STRING },
          documentId: { type: Type.NUMBER },
        },
        required: ["ruleId", "severity", "description", "recommendation"],
      },
    },
  },
  required: ["gaps"],
};

export async function runComplianceGapAgent(input: {
  rules: { id: number; title: string; description: string; category: string }[];
  documents: { id: number; title: string; docType: string; extractedText: string }[];
}): Promise<ComplianceGapFinding[]> {
  if (input.rules.length === 0 || input.documents.length === 0) return [];

  const prompt = `You are a compliance auditor agent for "Strata", an industrial knowledge
intelligence system. You are given a set of compliance/safety rules extracted from regulatory
and safety documents, and the full set of ingested operational documents (equipment manuals,
inspection reports, maintenance records).

Cross-reference the rules against the operational documents. For each rule that is NOT clearly
satisfied, evidenced, or explicitly addressed by the operational documents (e.g. a required
inspection frequency that is never confirmed as performed, a PPE requirement never referenced
in a related manual, a pressure limit not confirmed in an inspection report), report it as a
compliance gap with a severity, a description of the gap, and a concrete recommendation to close it.
Do not invent rules or documents that aren't provided. Only flag genuine, specific gaps grounded
in what's missing or contradicted in the text below. If a rule is clearly satisfied, do not report it.
Use the numeric ids given in brackets below ONLY to populate the "ruleId" and "documentId" JSON
fields. Never write bracket tokens like "[ruleId=3]" or "[documentId=2]" inside the "description"
or "recommendation" text -- those fields must read as plain natural-language prose referring to
rules and documents by their name/title, not by id.

COMPLIANCE RULES:
${input.rules.map((r) => `[ruleId=${r.id}] [${r.category}] ${r.title}: ${r.description}`).join("\n")}

OPERATIONAL DOCUMENTS:
${input.documents
  .map(
    (d) =>
      `--- [documentId=${d.id}] "${d.title}" (${d.docType}) ---\n${d.extractedText.slice(0, 3000)}`,
  )
  .join("\n\n")}

Respond with JSON matching the schema only.`;

  const response = await ai.models.generateContent({
    model: GEMINI_TEXT_MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: complianceScanSchema,
      maxOutputTokens: 32768,
    },
  });

  const text = response.text;
  if (!text) return [];

  try {
    const parsed = JSON.parse(text) as { gaps: ComplianceGapFinding[] };
    return parsed.gaps ?? [];
  } catch (err) {
    logger.error({ err, text }, "Failed to parse compliance scan JSON — response may have been truncated by the token limit");
    return [];
  }
}

export interface RcaResult {
  title: string;
  rootCause: string;
  contributingFactors: string[];
  recommendations: string[];
}

const rcaSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    rootCause: { type: Type.STRING },
    contributingFactors: { type: Type.ARRAY, items: { type: Type.STRING } },
    recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ["title", "rootCause", "contributingFactors", "recommendations"],
};

export async function runRcaAgent(input: {
  equipmentName: string;
  description: string;
  relatedEntities: { name: string; entityType: string; description: string | null }[];
  relatedExcerpts: string[];
}): Promise<RcaResult | null> {
  const prompt = `You are a maintenance root-cause-analysis (RCA) agent for "Strata", an industrial
knowledge intelligence system. Given a maintenance work order and related knowledge-graph context
(equipment, procedures, hazards, parameters) and excerpts from ingested manuals/inspection reports,
produce a grounded root-cause analysis.

WORK ORDER:
Equipment: ${input.equipmentName}
Issue description: ${input.description}

RELATED KNOWLEDGE GRAPH ENTITIES:
${input.relatedEntities.map((e) => `- [${e.entityType}] ${e.name}: ${e.description ?? ""}`).join("\n") || "(none found)"}

RELATED DOCUMENT EXCERPTS:
${input.relatedExcerpts.map((e, i) => `Excerpt ${i + 1}: ${e}`).join("\n\n") || "(none found)"}

Produce: a short title for the analysis, the most likely root cause, a list of contributing
factors, and a list of concrete recommendations to prevent recurrence. Ground your reasoning in
the provided context where possible, but you may draw on general industrial maintenance
knowledge to fill reasonable gaps. Respond with JSON matching the schema only.`;

  const response = await ai.models.generateContent({
    model: GEMINI_TEXT_MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: rcaSchema,
      maxOutputTokens: 8192,
    },
  });

  const text = response.text;
  if (!text) return null;

  try {
    return JSON.parse(text) as RcaResult;
  } catch (err) {
    logger.error({ err, text }, "Failed to parse RCA JSON");
    return null;
  }
}

export async function answerCopilotQuestion(
  question: string,
  contextChunks: { documentTitle: string; chunkIndex: number; content: string }[],
): Promise<string> {
  const context = contextChunks
    .map(
      (c, i) =>
        `[Source ${i + 1}: "${c.documentTitle}", chunk ${c.chunkIndex}]\n${c.content}`,
    )
    .join("\n\n");

  const prompt = `You are Strata's copilot, a retrieval-augmented assistant answering questions
about an organization's industrial documents (safety procedures, equipment manuals, inspection
reports, regulations, maintenance records).

Answer the user's question using ONLY the context excerpts below. When you use a fact, cite it
inline like [Source N]. If the context does not contain enough information to answer, say so
plainly rather than guessing.

CONTEXT:
${context || "(no relevant context found)"}

QUESTION: ${question}

Answer concisely and precisely, in plain text (no markdown headers).`;

  const response = await ai.models.generateContent({
    model: GEMINI_TEXT_MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { maxOutputTokens: 8192 },
  });

  return response.text ?? "I couldn't generate an answer for that question.";
}
