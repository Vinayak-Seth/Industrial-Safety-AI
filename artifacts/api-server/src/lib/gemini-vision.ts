import { Type } from "@google/genai";
import { ai, GEMINI_VISION_MODEL } from "@workspace/gemini";
import { logger } from "./logger";

// Computer-vision-assisted digitization of P&IDs and other engineering
// drawings: given a scanned/photographed drawing, extract the tagged
// components (equipment, valves, instruments) and the piping/signal
// connections between them into a structured graph, plus OCR the visible
// tag text and a plain-language summary of the process flow.

export interface ExtractedPidComponent {
  tag: string;
  componentType:
    | "valve"
    | "pump"
    | "vessel"
    | "compressor"
    | "instrument"
    | "sensor"
    | "pipe_segment"
    | "other";
  label: string;
  description?: string;
}

export interface ExtractedPidConnection {
  fromTag: string;
  toTag: string;
  lineType: string;
  description?: string;
}

export interface DrawingExtraction {
  summary: string;
  components: ExtractedPidComponent[];
  connections: ExtractedPidConnection[];
}

const drawingResponseSchema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    components: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          tag: { type: Type.STRING },
          componentType: {
            type: Type.STRING,
            enum: [
              "valve",
              "pump",
              "vessel",
              "compressor",
              "instrument",
              "sensor",
              "pipe_segment",
              "other",
            ],
          },
          label: { type: Type.STRING },
          description: { type: Type.STRING },
        },
        required: ["tag", "componentType", "label"],
      },
    },
    connections: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          fromTag: { type: Type.STRING },
          toTag: { type: Type.STRING },
          lineType: { type: Type.STRING },
          description: { type: Type.STRING },
        },
        required: ["fromTag", "toTag", "lineType"],
      },
    },
  },
  required: ["summary", "components", "connections"],
};

const DRAWING_PROMPT = `You are a computer-vision drawing-digitization engine for "Strata", an
industrial knowledge intelligence system. You are given a Piping & Instrumentation Diagram
(P&ID) or similar engineering drawing (may be a scan, photo, or exported diagram image).

Do all of the following:
1. Read every visible equipment/instrument tag (e.g. "PRV-101", "P-204A", "PT-07") using OCR on
   the drawing's labels and symbols.
2. Classify each tagged item by its symbol into one of: valve, pump, vessel, compressor,
   instrument, sensor, pipe_segment, other. Give it a short human-readable label (e.g.
   "Pressure Relief Valve 101") based on the tag and drawing context.
3. Trace the piping/signal lines connecting tagged items and report each connection as a
   fromTag -> toTag pair with a line type (e.g. "process piping", "signal line", "utility line").
4. Write a 2-3 sentence plain-language summary of what the drawing depicts (the process flow it
   represents).

Only report tags and connections you can actually see evidence for in the image. If a line's
endpoints are ambiguous, use your best engineering judgment but do not invent tags that aren't
visible. Respond with JSON matching the schema only.`;

export async function extractDrawing(
  fileBase64: string,
  mimeType: string,
  title: string,
): Promise<DrawingExtraction> {
  const response = await ai.models.generateContent({
    model: GEMINI_VISION_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          { text: `${DRAWING_PROMPT}\n\nDrawing title: ${title}` },
          { inlineData: { mimeType, data: fileBase64 } },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: drawingResponseSchema,
      maxOutputTokens: 16384,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini returned an empty drawing digitization response");
  }

  try {
    return JSON.parse(text) as DrawingExtraction;
  } catch (err) {
    logger.error({ err, text }, "Failed to parse Gemini drawing digitization JSON");
    throw new Error("Failed to parse drawing digitization response");
  }
}
