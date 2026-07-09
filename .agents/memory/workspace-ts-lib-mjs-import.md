---
name: Workspace TS libs from plain .mjs scripts
description: ERR_UNSUPPORTED_DIR_IMPORT when a standalone .mjs script imports a @workspace/* library whose package entry points at a TS source directory.
---

A plain unbundled `.mjs` script (run directly with `node script.mjs`, not through a bundler/ts-node) cannot import `@workspace/<lib>` packages whose `main`/exports point at TS source directories — Node ESM resolution fails with `ERR_UNSUPPORTED_DIR_IMPORT`.

**Why:** These workspace libs are designed to be consumed through the monorepo's build/bundle pipeline (tsc project references, esbuild, etc.), which resolves directory imports; raw Node ESM does not do this resolution.

**How to apply:** For one-off seeding/maintenance scripts that need DB or other workspace-lib access outside the bundled app, either (a) run raw SQL directly (e.g. via an `executeSql` callback or a DB client), or (b) add a proper bundled entry point/script within the package itself rather than a loose top-level `.mjs` file.
