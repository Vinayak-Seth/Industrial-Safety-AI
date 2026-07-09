---
name: Gemini direct API key fallback
description: Use GEMINI_API_KEY directly (custom lib) when Replit's managed AI Integrations proxy for Gemini isn't available on the account.
---

Replit's managed AI Integrations proxy (which avoids needing the user's own API key) is not available on every account. When it's unavailable for Gemini specifically, fall back to a custom lib that calls the Gemini API directly using a user-provided `GEMINI_API_KEY` secret via `@google/genai`.

**Why:** The managed proxy path is preferred (no key management, unified billing) but isn't guaranteed to be provisioned; don't block on it if setup fails — direct key usage is a legitimate fallback.

**How to apply:** If `@google/genai` is imported directly (not just re-exported) in an app package, it must be added as a direct dependency of that package too — re-exporting from a shared lib alone isn't sufficient for TS project-reference typecheck/build to succeed.
