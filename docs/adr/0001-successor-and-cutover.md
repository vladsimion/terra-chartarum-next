# ADR 0001 — Successor build, data migration and archive cutover

**Status**: Accepted · **Date**: 2026-10-15 · **Jira**: TCX-9 · **Resolves**: constitution P-1

## Decision
1. The fresh build is the **successor** to Terra Chartarum: same name, built in parallel, and it replaces terra-chartarum.pages.dev at cutover.
2. **Canonical data migrates; essays are rebuilt.** Catalogue records (59), datasets/layers, places, sources and bibliography are imported through validated adapters that **preserve every stable ID** (qualified at the boundary as `tc:{authority}:{family}:{local-id}`). Essays are re-authored natively one at a time; no legacy-embed isolation layer is built.
3. **Cutover happens at v1.** The old site is frozen at an archive address. Old essay URLs not yet rebuilt redirect there until their native version ships.

## Alternatives considered
Separate new site; sandbox-first; wrapping legacy essays in an isolated route; migrating nothing; waiting for full essay parity before cutover; placeholder pages.

## Consequences
- New spec **008 — Migration & cutover** (adapters, ID preservation, redirect map, frozen archive).
- Spec 001: importing live-site records is in scope; legacy IDs are preserved, never renamed.
- Spec 003: no legacy-essay isolation route.
- Every redirect is tracked; the redirect for an essay is removed when its rebuild is published.
