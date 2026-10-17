# Implementation Plan: Bibliography & Citation

**Branch**: `006-bibliography` | **Date**: 2026-10-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-bibliography/spec.md`, clarified on 2026-10-17 after the grill (ADR 0014).

## Summary

The site-wide bibliography as an evidence index. Three halves. **Registry side** (framework-free, in `src/registry/`): Sources gain a required link to their entry, datasets and layers gain `bibliography[]`, entries gain edition links and an optional external copy, and four rules check the link, the CSL file, the editions and held listings; `registry import-bib` brings entries in from BibTeX, RIS and CSL-JSON. **Pure bibliography modules** (in `src/bibliography/`, no framework, no DOM): the derivation of citations by both routes, the public-entry rule, the search index, duplicate matching, and the CSL items for datasets, layers and the site. **Site side** (Astro on spec 002's shell): the Bibliography index, an entry page with the Chicago form, other editions, "Cited in" and exports, and the export files for datasets and layers. Rendering and the three export formats come from spec 003's shared generator. Spec 006 is accepted on fixtures; the live bibliography arrives through spec 008.

## Technical Context

**Language/Version**: TypeScript strict, Node 24; Astro 7 for the site side.

**Primary Dependencies**: existing `yaml`, `zod`; the citation libraries spec 003 adds (`@citation-js/core` with the CSL, BibTeX and RIS plugins), also used here to parse imports. If spec 003's Foundation has not landed, this spec's first task adds them at exact pinned versions, each at least two weeks old. No UI framework and no library reaches the browser except the small filter script.

**Storage**: Files. Entries at `content/bibliography_entry/<id>.yaml` with `<id>.csl.json` beside them; Sources at `content/source/`.

**Testing**: Vitest for the schema, the four rules, the pure modules, the import command and the built-output leak scan (valid and invalid fixtures, a named mutation per rule); Playwright and axe for the Bibliography pages and filters through spec 002's setup.

**Target Platform**: Build time and CI for the registry side; static HTML plus small JSON files for Workers static assets (ADR 0012).

**Project Type**: Library and CLI (registry side) plus site pages (site side), in the existing single project.

**Performance Goals**: ADR 0004 for bibliography pages: ≤ 100 KB compressed JavaScript on first load, LCP ≤ 2.5 s, CLS ≤ 0.1, INP ≤ 200 ms, accessibility 100; filters and search under 200 ms on 1,000 entries (SC-005).

**Constraints**: Deterministic and offline (no network at build); the access date comes from `BUILD_DATE`; the gate stays pure; held entries, essays and records leak nothing; no dynamic infrastructure.

**Scale/Scope**: a 1,000-entry generated fixture and a small hand-authored set; the live bibliography via spec 008; 4 new rules (see [contracts/bib-rule-ids.md](./contracts/bib-rule-ids.md)); 1 new command.

## Constitution Check

*GATE: passes before Phase 0 and again after Phase 1 design.*

- [x] **Historical question (I)**: "What does this publication rest on, and where is each work used?" (spec header).
- [x] **No duplicated canonical records or private geometry (II, V)**: one canonical entry per work; every citation is derived, never stored; identifiers live once, in the CSL-JSON.
- [x] **Uncertainty and provenance as fields (III, VI)**: the evidence route shows the locator and its verification state, a pending locator is marked, and finding aids are never evidence; rights stay where something is reproduced.
- [x] **Bespoke interactions (IV)**: none; the filters are a progressive enhancement of a static list.
- [x] **No dynamic infrastructure (VII)**: static HTML and JSON only; the import is an editor command.
- [x] **Accessibility and performance impact (IX)**: the index and entry page types join the CI template list; first load stays inside 100 KB.
- [x] **Test strategy (X)**: every acceptance scenario maps to a named test (table below), written first under the `tdd` skill.

**Result**: no violations; Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/006-bibliography/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── bib-rule-ids.md          # the four rules
│   ├── bibliography-pages.md    # index, entry page, filters, query string, search index
│   ├── import-bib-cli.md        # registry import-bib
│   └── cite-inputs.md           # CSL items for an entry, a dataset, a layer, the site; URLs and access date
└── tasks.md                     # /speckit-tasks
```

### Source code (repository root)

```text
src/registry/
├── schemas/families.ts          # BibliographyEntrySchema, SourceSchema, DatasetSchema, LayerSchema extended
├── rules/bibliography.ts        # SRC-ENTRY, BIB-EDITION, BIB-CSL, BIB-LISTED-HELD
├── import-bib.ts                # registry import-bib (parse, match, write)
├── project.ts                   # allowlist grows (entry, source)
├── synthetic.ts                 # + entries, sources, citing records (1,000-entry fixture)
└── cli.ts                       # + import-bib
src/bibliography/                # pure modules
├── cited-in.ts                  # citations by both routes, public records only
├── entry-public.ts              # the public-entry rule
├── index-data.ts                # bibliography-index.json
├── match.ts                     # duplicate matching and normalisation
└── cite-inputs.ts               # CSL items for dataset, layer, site
src/pages/bibliography/{index,[slug]}.astro
src/bibliography-client/filters.ts
src/integrations/bibliography.ts # astro:build:done: index and export files
tests/registry/{unit,integration}/   # schema, rule, import tests
tests/bibliography/{unit,build,e2e,fixtures}/
```

**Structure Decision**: derivation and the public rule are pure modules over public records, so the same functions serve the page, the index, the exports and the leak scan, and are tested without a browser. The registry half stays framework-free so the new rules and the import run in CI and from the editor's shell. Chicago rendering and the three formats are not rebuilt here; spec 003's generator is the only implementation.

## Acceptance-scenario → test map

| Story | Scenarios | Test |
|---|---|---|
| US1 browse | 1 (Cited in, both routes labelled) | `tests/bibliography/unit/cited-in.test.ts`, `build/entry-page.test.ts` |
| | 2 (held-only hidden) | `unit/entry-public.test.ts`, `build/leak.test.ts` |
| | 3 (search on author, title, year, keywords) | `unit/index-data.test.ts`, `e2e/filters.spec.ts` |
| | 4 (locator and verification shown, pending marked) | `unit/cited-in.test.ts`, `build/entry-page.test.ts` |
| | 5 (editions and translations, public only) | `unit/cited-in.test.ts`, `build/entry-page.test.ts` |
| | independent test | `build/entry-page.test.ts` |
| US2 cite | exports parse; canonical URL; injected access date | `unit/cite-inputs.test.ts`, `build/exports.test.ts` |
| US3 sections and finding aids | badge; never evidence | `build/entry-page.test.ts`, `unit/cited-in.test.ts` |
| US4 import | one sample per format; re-import creates nothing | `tests/registry/integration/import-bib.test.ts` |
| FR-001, FR-016 schema | | `tests/registry/unit/bibliography-schema.test.ts` |
| FR-006 SRC-ENTRY | | `rules/src-entry.test.ts` |
| FR-007 public rule | | `unit/entry-public.test.ts` |
| FR-008 pages, no JS | | `build/index-page.test.ts`, `e2e/filters.spec.ts` (with and without JavaScript) |
| FR-010 BIB-EDITION | | `rules/bib-edition.test.ts` |
| FR-013 BIB-LISTED-HELD | | `rules/bib-listed-held.test.ts` |
| FR-014 BIB-CSL | | `rules/bib-csl.test.ts` |
| FR-015 finding aid | | `build/entry-page.test.ts` |
| SC-001 citations resolve | | `build/citations-resolve.test.ts` |
| SC-003 no held reference | | `build/leak.test.ts`, `tests/registry/mutations.test.ts` |
| SC-005 filter speed | | `unit/index-data.perf.test.ts` (1,000 entries) |

## Complexity Tracking

Empty: no constitution violations.
