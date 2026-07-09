---
name: Gemini JSON-schema agent prompting
description: Practical constraints for reliable structured-output Gemini agents doing multi-item comparison/extraction (e.g. compliance gap scans).
---

For Gemini agents that return structured JSON (e.g. `responseSchema`) over a non-trivial number of input items (dozens of rules/documents), two failure modes recur:

1. **Truncated output → JSON parse failure.** Default `maxOutputTokens` (e.g. 8192) is too low once you're asking the model to reason over ~30+ items with rich fields. Raise the cap generously (worked at 32768) and trim per-item excerpt length in the prompt to leave room.

2. **String-matching correlation is fragile.** Don't ask the model to echo back a human-readable title/name string for you to match against DB rows via case-insensitive string comparison — it drifts. Instead, tag each candidate item in the prompt with an explicit numeric id (e.g. `[ruleId=12]`), have the schema require that id back, and validate against the known id set server-side.

3. **Bracket-id leakage into prose.** If you use inline `[fieldId=N]` markup in the prompt to label items, the model can leak that literal bracket syntax into free-text output fields (description/recommendation). Add an explicit prompt instruction that bracket ids are only for populating the numeric id JSON fields, never for human-readable prose.

**Why:** These were the concrete root causes of a compliance-gap-scan agent going from 0 real results (parse failures) to leaking `[documentId=3]`-style tokens into user-facing text, before converging on clean numeric-id-based output.

**How to apply:** Apply all three when building any Gemini structured-extraction/comparison agent that spans many reference items (rules, documents, entities, etc.).
