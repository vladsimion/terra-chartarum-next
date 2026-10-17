# Implementation Plan: Map Collection & Cartographers Catalogue

**Branch**: `004-collection-catalogue` | **Date**: 2026-10-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-collection-catalogue/spec.md`, clarified on 2026-10-17 after the grill (ADR 0011).

## Summary

The catalogue of map objects and their makers, built so that nothing unestablished looks established. Two halves. **Registry side** (framework-free, in `src/registry/`): the map and cartographer schemas grow the clarified FR-001 fields (an amendment to spec 001's data model, FR-009), ten new rules check field status, basis, verification, images, attribution, dealer-only support, held makers and private-field names, and an editor-only report ranks an enrichment queue. **Site side** (Astro, on spec 002's shell): a collection list with a build-time filter index, a map record page with a lazily loaded deep-zoom viewer, cartographer profiles, a derived "where used" list, and citation through spec 003's shared generator. Spec 004 is accepted on fixtures; the 59 legacy records arrive through spec 008.

## Technical Context

**Language/Version**: TypeScript strict, Node 24; Astro 7 for the site side.

**Primary Dependencies**: existing `yaml`, `zod`; new: `openseadragon` (viewer, loaded on activation only; exact version pinned at the task, at least two weeks old). Citation uses spec 003's `src/essays/citations.ts`. No other runtime library reaches the browser.

**Storage**: Files. Maps at `content/map/<id>.yaml`, cartographers at `content/cartographer/<id>.yaml` with an optional `<id>.md` biography beside the record, as essays have an `.mdx` body.

**Testing**: Vitest for the schema, the ten rules, the pure view-model, filter, index, where-used and enrichment modules (valid and invalid fixtures, a named mutation per rule); Playwright and axe for the pages and the viewer through spec 002's setup; build-output tests with `node-html-parser` as in spec 002.

**Target Platform**: Build time and CI for the registry side; static HTML plus one small JSON index for Cloudflare Pages on the site side.

**Project Type**: Library and CLI (registry side) plus site pages (site side), in the existing single project.

**Performance Goals**: ADR 0004 for catalogue pages: ≤ 100 KB compressed JavaScript on first load (the viewer is not in it), LCP ≤ 2.5 s, CLS ≤ 0.1, INP ≤ 200 ms, accessibility 100; first sharp tile ≤ 2.5 s; filters under 200 ms on 500 records (SC-004).

**Constraints**: Deterministic and offline (no network at build); the gate stays pure; held essays, held makers and private acquisition data leak nothing; catalogue browsing fetches no layer binaries (ADR 0004); no dynamic infrastructure.

**Scale/Scope**: 60 and 500 generated records plus about six hand-authored fixtures; the real 59 arrive in spec 008; 10 new rules (see [contracts/map-rule-ids.md](./contracts/map-rule-ids.md)); 1 new command.

## Constitution Check

*GATE: passes before Phase 0 and again after Phase 1 design.*

- [x] **Historical question (I)**: "What exactly is this map — which maker, edition and state, from which atlas — and how do we know?" (spec header).
- [x] **No duplicated canonical records or private geometry (II, V)**: one record per witness; essays refer to maps by ID and the page reads everything from the record (SC-002); "where used" is derived, never stored.
- [x] **Uncertainty and provenance as fields (III, VI)**: every displayed field has a status, held provenance carries observed or inferred, attribution shows its evidence basis, dealer or auction support is never alone, rights and attribution ride on every image.
- [x] **Bespoke interactions (IV)**: the viewer is a declared, single-purpose component with keyboard, touch, reduced-motion and no-JS variants.
- [x] **No dynamic infrastructure (VII)**: static HTML, one build-time JSON index, institutional IIIF endpoints for images.
- [x] **Accessibility and performance impact (IX)**: viewer loaded on activation keeps first load inside 100 KB; authored `alt` is required at `publishable`; collection and record page types join the CI template list.
- [x] **Test strategy (X)**: every acceptance scenario maps to a named test (table below), written first under the `tdd` skill.

**Result**: no violations; Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/004-collection-catalogue/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── map-rule-ids.md        # the ten rules, thresholds, spec links
│   ├── collection-pages.md    # list, record, cartographer pages, the JSON index, query-string state
│   └── cli-additions.md       # registry completeness
└── tasks.md                   # /speckit-tasks
```

### Source code (repository root)

```text
src/registry/
├── schemas/families.ts        # MapSchema, CartographerSchema extended; ImageSource and Physical value objects
├── schemas/map-values.ts      # field-status, basis, verification, witness, georeferencing and image-type values
├── rules/map.ts               # the ten rules
├── enrichment.ts              # completeness per record and the ranked enrichment queue (pure)
├── project.ts                 # public allowlist grows (map and cartographer fields; never physical or private)
└── cli.ts                     # + completeness
src/collection/                # site side
├── record-view.ts             # pure view-model: displayed fields, statuses, witness label, image decision
├── index-data.ts              # pure: public map records → the filter index
├── filter.ts                  # pure: index + query → ordered ids (facets, EDTF overlap, sort)
├── where-used.ts              # pure: reverse references, public referrers only
├── components/                # MapRecord, FieldRow, ImageViewer, CollectionList, FilterBar, WhereUsed, CartographerCard
├── viewer.client.ts           # OpenSeadragon on activation
└── filters.client.ts          # progressive enhancement of the list
src/pages/collection/{index,[slug]}.astro
src/pages/cartographers/{index,[slug]}.astro
src/pages/data/collection-index.json.ts
content/map/ content/cartographer/    # empty in v1 until spec 008 imports the 59
tests/registry/{unit,integration}/     # new schema, rule, enrichment tests
tests/collection/{unit,build,e2e,fixtures}/
```

**Structure Decision**: the registry half stays framework-free so the rules and the report run in CI and from R pipelines without Astro. The filter, index, where-used and view-model modules are pure and live beside the pages that use them, so they are tested without a browser and the pages stay thin. The record schema is the single source for both halves.

## Acceptance-scenario → test map

| Story | Scenarios | Test |
|---|---|---|
| US1 inspect | 1 (pan and zoom by mouse, touch, keyboard) | `tests/collection/e2e/viewer.spec.ts` |
| | 2 (explicit `not yet verified` / `unknown`) | `unit/record-view.test.ts`, `build/map-page.test.ts` |
| | 3 (attribution shows evidence basis) | `unit/record-view.test.ts`, `build/map-page.test.ts` |
| | 4 (observed vs inferred for a held object) | `unit/record-view.test.ts`, `build/map-page.test.ts` |
| | 5 (rights not cleared: image withheld, metadata shown, reason stated) | `unit/record-view.test.ts`, `build/map-page.test.ts` |
| | 6 (unresolved workshop attribution stated) | `unit/record-view.test.ts` |
| | independent test (viewer, and fallback when the image source is unavailable) | `e2e/viewer.spec.ts` |
| US2 browse | 1 (date range overlap) | `unit/filter.test.ts` |
| | 2 (shared address reopens the view) | `e2e/collection.spec.ts` |
| | 3 (sort by date, title, maker; undated last) | `unit/filter.test.ts` |
| | independent test (each facet, combined, JavaScript off) | `unit/filter.test.ts`, `e2e/collection.spec.ts`, `build/collection-list.test.ts` |
| US3 cartographers | profile, maps, essays | `build/cartographer-page.test.ts` |
| US4 where used | list of public referrers | `unit/where-used.test.ts`, `build/map-page.test.ts` |
| | scenario (held essay never appears) | `build/leak.test.ts` |
| US5 enrichment | ranked queue and per-record completeness | `tests/registry/unit/enrichment.test.ts`, `integration/completeness.test.ts` |
| FR-001, FR-009 schema | | `tests/registry/unit/map-schema.test.ts` |
| FR-002 field status, basis | | `rules/map-field-status.test.ts` |
| FR-004, FR-017 viewer, alt | | `e2e/viewer.spec.ts`, `rules/map-image.test.ts`, axe in `e2e/a11y.spec.ts` |
| FR-005 attribution on every image | | `build/map-page.test.ts` |
| FR-006 citation | | `build/map-page.test.ts` (uses spec 003's generator) |
| FR-010 private fields | | `rules/map-private-field.test.ts` |
| FR-011 workshop | | `rules/map-attribution.test.ts` |
| FR-012 held maker | | `rules/map-maker-held.test.ts` |
| FR-013 list, index, query string | | `unit/index-data.test.ts`, `unit/filter.test.ts` |
| FR-015 verification | | `rules/map-verification.test.ts` |
| FR-016 dealer or auction only | | `rules/map-dealer-only.test.ts` |
| FR-019 room facet derived | | `unit/index-data.test.ts` |
| SC-001 attribution on every image | | `build/map-page.test.ts` |
| SC-003 first sharp tile | | `e2e/viewer.spec.ts` (timed, CI) |
| SC-004 filters under 200 ms | | `unit/filter.perf.test.ts` (500 records) |
| SC-005 no leak | | `build/leak.test.ts`, `tests/registry/mutations.test.ts` |

## Complexity Tracking

Empty: no constitution violations.
