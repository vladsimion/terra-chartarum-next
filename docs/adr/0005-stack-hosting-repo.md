# ADR 0005 — Stack, data-prep language, hosting, domain and repository

**Status**: Accepted · **Date**: 2026-10-15 · **Jira**: TCX-12 · **Amends**: ADR 0001 (archive mechanism) · **Amended by**: ADR 0012 (§3 hosting: Workers static assets)

## 1. Stack (for every plan.md)
Rebuilt fresh, no fork, but on TC's proven choices:
- Astro, TypeScript strict, content collections with Zod schemas, static output, selective islands.
- MapLibre GL (Atlas); GeoJSON, FlatGeobuf, PMTiles, COG (data); IIIF + OpenSeadragon (deep zoom); Allmaps (georeferencing).
- Tests: Vitest (units, data utilities, integrity gate), Playwright (navigation and interaction), axe (accessibility), Lighthouse CI (ADR 0004 budgets).

## 2. Data preparation in R
Data-prep pipelines (cleaning, imports, georeferencing outputs, tiling) MAY be written in R (e.g. `sf`, `targets`). They write canonical files into the repository; the TypeScript build validates them through the integrity gate. The site runtime is TypeScript only.
- R code follows Principle X too: `testthat` tests written first, valid and invalid fixtures.
- Tiling may shell out to standard CLIs (e.g. tippecanoe / pmtiles), pinned and recorded.

## 3. Hosting and domain
- Cloudflare Pages, new project connected to the new repository.
- Production domain: **terra-chartarum.org** (custom domain, registered).

## 4. Archive (amends ADR 0001 §3)
The existing **terra-chartarum.pages.dev** project becomes the frozen archive: no further content changes, plus an "archived edition" banner, `noindex`, and a link to terra-chartarum.org. Each time an essay rebuild ships, a redirect rule is added to the **archive project's** redirects file, sending that old essay URL (and its migrated records) to its new terra-chartarum.org URL.

## 5. Repository
New GitHub repository **vladsimion/terra-chartarum-next**: fresh history, Spec Kit initialised for Claude Code, `grill-with-docs` and `tdd` skills installed.

## Alternatives considered
Orphan branch in the existing repo (recommended in session; keeps the pages.dev name); new repo with a new pages.dev name; TypeScript-only or Python data prep.

## Consequences
- Spec 008 FR-004 resolved: archive = the frozen pages.dev site; redirects live in the archive project.
- Cutover = DNS/custom domain live on the new project + archive banner and noindex deployed to the old one.
- Domain registered 2026-10-15; DNS is attached to the new Pages project at cutover.
