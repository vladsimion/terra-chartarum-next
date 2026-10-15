# ADR 0004 — Experience contract: performance, browsers, citation, bibliography, place search, identity

**Status**: Accepted · **Date**: 2026-10-15 · **Jira**: TCX-11 · **Resolves**: constitution P-2

## 1. Performance budget (enforced in CI)
Measured with Lighthouse's mobile profile (mid-range phone, throttled network), at p75 where field data exists.

| Scope | Budget |
|---|---|
| Every page | LCP ≤ 2.5 s · CLS ≤ 0.1 · INP ≤ 200 ms · Lighthouse accessibility = 100 |
| Essay, catalogue, room, bibliography pages | ≤ 100 KB compressed JS on first load |
| Atlas page | ≤ 350 KB compressed JS; map interactive ≤ 4 s; layer data fetched only on activation; catalogue browsing fetches no layer binaries |
| Deep-zoom viewer | first sharp tile ≤ 2.5 s |

**Baseline:** before the live site is frozen (spec 008), measure its key templates once with the same profile and record the results. They are a comparison, not a gate.

These thresholds are the Core Web Vitals "good" thresholds. No prior KAN-380 figures were available.

## 2. Browser and device matrix
Last two versions of Chrome, Edge, Firefox, Safari (macOS + iOS) and Samsung Internet. Viewports ≥ 360 px. Without WebGL, the Atlas falls back to a static map plus a full text listing of layers and features.

## 3. Bibliography authoring
Canonical entries live in the repository as **CSL-JSON**. New entries arrive by one-way import from BibTeX/RIS exports (Zotero, Mendeley); site-specific fields (section type, locators, verification) are added in the repo. The reference manager is an input, never the source of truth.

## 4. Citation display and export
On-page display: **Chicago notes-bibliography**. Export for essays, map records, datasets and layers: **BibTeX, RIS, CSL-JSON**, each with stable URL and access date.

## 5. Place search
A basic version is in v1: exact and prefix match over historic and modern names from the place authority; results focus the Atlas. Fuzzy matching and concordance views come later.

## 6. Visual identity
The live site's logo, typography and core palette carry over, rebuilt as design tokens. Any redesign is a separate, later spec.

## Consequences
Resolves open questions in specs 002 (US3, FR-009, FR-010), 003 (FR-009), 005 (FR-009, SC-001), 006 (US2, FR-005). Adds a baseline-measurement task to spec 008.
