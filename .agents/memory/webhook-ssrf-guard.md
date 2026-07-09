---
name: Webhook/callback URL SSRF guard
description: Pattern for validating a user-supplied webhook/callback URL before a server-side fetch, to block SSRF.
---

When a feature accepts a user-supplied URL that the server will `fetch()` (webhook pushes, callback
notifications, integration syncs), validate it before the request: require `https:`, and reject
`localhost`/`*.localhost`, known metadata hostnames (`metadata.google.internal`), and literal private/
link-local IPv4 (`10.x`, `172.16-31.x`, `192.168.x`, `127.x`, `169.254.x`) and IPv6 (`::1`, `fe80:`,
`fc00::/7`) ranges.

**Why:** an unrestricted server-side `fetch` to a user-controlled URL is a classic SSRF vector —
it can be used to probe internal services or cloud metadata endpoints from inside the server's
network. A code-review pass caught this being added unguarded in a QMS webhook-sync feature.

**How to apply:** this is a literal-IP/hostname check, not DNS-rebinding-proof (a hostname could
resolve to a private IP at request time) — for genuinely high-value targets, pin/re-check the
resolved IP at fetch time. For hackathon/internal-tool scope, the literal check is enough to close
the obvious attack surface.
