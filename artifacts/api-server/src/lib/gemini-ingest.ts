import { Type } from "@google/genai";
import { ai, GEMINI_TEXT_MODEL } from "@workspace/gemini";
import { logger } from "./logger";

export interface ExtractedEntity {
  name: string;
  entityType:
    | "equipment"
    | "procedure"
    | "regulation"
    | "personnel"
    | "location"
    | "hazard"
    | "parameter";
  description: string;
}

export interface ExtractedRelation {
  sourceName: string;
  targetName: string;
  relationType: string;
  description?: string;
}

export interface ExtractedComplianceRule {
  title: string;
  description: string;
  category: string;
}

export interface DocumentExtraction {
  extractedText: string;
  summary: string;
  entities: ExtractedEntity[];
  relations: ExtractedRelation[];
  complianceRules: ExtractedComplianceRule[];
}

const extractionResponseSchema = {
  type: Type.OBJECT,
  properties: {
    extractedText: { type: Type.STRING },
    summary: { type: Type.STRING },
    entities: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          entityType: {
            type: Type.STRING,
            enum: [
              "equipment",
              "procedure",
              "regulation",
              "personnel",
              "location",
              "hazard",
              "parameter",
            ],
          },
          description: { type: Type.STRING },
        },
        required: ["name", "entityType", "description"],
      },
    },
    relations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          sourceName: { type: Type.STRING },
          targetName: { type: Type.STRING },
          relationType: { type: Type.STRING },
          description: { type: Type.STRING },
        },
        required: ["sourceName", "targetName", "relationType"],
      },
    },
    complianceRules: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          category: { type: Type.STRING },
        },
        required: ["title", "description", "category"],
      },
    },
  },
  required: ["extractedText", "summary", "entities", "relations", "complianceRules"],
};

const EXTRACTION_PROMPT = `You are an industrial knowledge-intelligence engine for "Strata", a system that
unifies fragmented industrial documents (safety procedures, equipment manuals, inspection
reports, regulations, maintenance records, P&IDs) into a single queryable knowledge base.

Given the attached document, do all of the following:
1. Transcribe/extract the full readable text content (OCR if it's an image/scan/diagram).
2. Write a concise 2-3 sentence summary of the document.
3. Extract a knowledge-graph entity list: equipment, procedures, regulations, personnel/roles,
   locations, hazards, and parameters (e.g. pressure/temperature limits) mentioned in the document.
   Give each entity a short human-readable name and a one-sentence description grounded in the text.
4. Extract relationships between those entities (e.g. "Pressure Relief Valve" -[governed_by]->
   "OISD-STD-118", "Compressor Unit A" -[requires]-> "Monthly Vibration Inspection").
5. Extract any explicit compliance/regulatory requirements or safety rules stated in the document
   as discrete, checkable rules (title, description, category e.g. "Inspection Frequency",
   "PPE Requirement", "Pressure Limit", "Documentation").

Only extract what is actually supported by the document content. If a category has nothing, return
an empty array for it. Respond with JSON matching the provided schema only.`;

export async function extractDocument(
  fileBase64: string,
  mimeType: string,
  title: string,
): Promise<DocumentExtraction> {
  const response = await ai.models.generateContent({
    model: GEMINI_TEXT_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          { text: `${EXTRACTION_PROMPT}\n\nDocument title: ${title}` },
          { inlineData: { mimeType, data: fileBase64 } },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: extractionResponseSchema,
      maxOutputTokens: 8192,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini returned an empty extraction response");
  }

  try {
    return JSON.parse(text) as DocumentExtraction;
  } catch (err) {
    logger.error({ err, text }, "Failed to parse Gemini extraction JSON");
    throw new Error("Failed to parse document extraction response");
  }
}

export function chunkText(text: string, chunkSize = 900, overlap = 150): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    const end = Math.min(start + chunkSize, clean.length);
    chunks.push(clean.slice(start, end));
    if (end === clean.length) break;
    start = end - overlap;
  }
  return chunks;
}
