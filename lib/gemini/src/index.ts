import { GoogleGenAI } from "@google/genai";

if (!process.env.GEMINI_API_KEY) {
  throw new Error(
    "GEMINI_API_KEY must be set. Did you forget to provide your Gemini API key?",
  );
}

// Direct Gemini API access using the user's own API key (Replit's managed
// AI Integrations proxy is unavailable on this account).
export const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export const GEMINI_TEXT_MODEL = "gemini-2.5-flash";
export const GEMINI_VISION_MODEL = "gemini-2.5-flash";
