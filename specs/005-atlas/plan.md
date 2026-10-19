# Implementation Plan: Historical Atlas

**Branch**: `005-atlas` | **Date**: 2026-10-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-atlas/spec.md`, clarified on 2026-10-17 after the grill (ADR 0013, amendments to ADR 0002).

## Summary

The instrument for building a historical argument on shared layers. Three halves. **Registry side** (framework-free, in `src/registry/`): the layer, place and overlay schemas grow the fields of the clarified FR-001, FR-009 and FR-019 (an amendment to spec 001's data model, FR-023), and seven new rules check themes, time, facets, georeferencing, asset size, place names and place locations. **Pure Atlas modules** (in `src/atlas/`, no framework, no DOM): feature validity at a year, the typed view state and its address, the catalogue index and ranker, facets, place search, provenance styling. **Site side** (Astro on spec 002's shell): the Atlas page with catalogue, active-layers and inspector drawers, a MapLibre map that loads only there, a build step that turns repository sources into static assets and indexes, a no-WebGL fallback, the Handbook, and the georeferenced overlay. Spec 005 is accepted on fixtures; the real Roman Dacia layers arrive through spec 008.

## Technical Context

**Language/Version**: TypeScript strict, Node 24; Astro 7 for the site side.

**Primary Dependencies**: existing `yaml`, `zod`, `edtf`; new (exact versions pinned at the task, each at least two weeks old): `maplibre-gl`, `pmtiles`, `flatgeobuf`, `@allmaps/maplibre` (overlay story only). No UI framework (FR-020). Natural Earth data is public domain and vendored as a prebuilt basemap PMTiles with its source and licence recorded.

**Storage**: Files. Layers at `content/layer/<id>.yaml` whose `asset` names a source under `data/layers/` (GeoJSON, or a pre-tiled `.pmtiles`); collections at `content/collection/`; Handbook entries at `src/content/handbook/*.md`.

**Testing**: Vitest for the schema, the seven rules, the pure modules, the build step and the built-output leak scan (valid and invalid fixtures, a named mutation per rule); Playwright and axe for the Atlas page, keyboard operation, the no-WebGL fallback and the performance timings; Lighthouse CI for the script budget.

**Target Platform**: Build time and CI for the registry and build step; static files for Cloudflare Workers static assets (ADR 0012) on the site side.

**Project Type**: Library and CLI (registry side), build step (Astro integration), and site pages (site side), in the existing single project.

**Performance Goals**: ADR 0004 for the Atlas page: ≤ 350 KB compressed JavaScript on first load, map interactive ≤ 4.5 s on the reference mobile profile, INP ≤ 200 ms for lens switch, search and year change on a 200-layer catalogue, LCP ≤ 2.5 s, CLS ≤ 0.1, accessibility 100; layer data fetched only on activation; catalogue browsing fetches no layer binaries.

**Constraints**: Deterministic and offline (no network at build or runtime except the site's own files); the gate stays pure; held layers, essays and ids leak nothing; no dynamic infrastructure, no third-party tile service, no `localStorage`.

**Scale/Scope**: 200 generated layers and a small hand-authored set; the real anchor collection (a handful of layers) via spec 008; 7 new rules (see [contracts/atlas-rule-ids.md](./contracts/atlas-rule-ids.md)); one build integration; 7 user stories.

## Constitution Check

*GATE: passes before Phase 0 and again after Phase 1 design.*

- [x] **Historical question (I)**: "How did places, networks, territories and names change over time — and how sure can we be about each line on the map?" (spec header).
- [x] **No duplicated canonical records or private geometry (II, V)**: a layer's collections, rooms and related essays are derived; one asset per layer serves every collection, room and essay; essays link by view address, never by copying geometry.
- [x] **Uncertainty and provenance as fields (III, VI)**: geometry provenance shows by pattern and text, uncertain dates are flagged, present-day reference is labelled and never evidence, overlay quality fields are shown, licences come from the registry.
- [x] **Bespoke interactions (IV)**: the Atlas is a declared instrument with a stated question; its keyboard, no-WebGL and reduced-motion variants are specified.
- [x] **No dynamic infrastructure (VII)**: static files only; assets built from sources; no bucket, no tile server, no `localStorage`.
- [x] **Accessibility and performance impact (IX)**: the 350 KB budget is measured first (T004) with a split-load fallback; the Atlas page type joins the CI template list; non-colour cues are tested.
- [x] **Test strategy (X)**: every acceptance scenario maps to a named test (table below), written first under the `tdd` skill.

**Result**: no violations; Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/005-atlas/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── atlas-rule-ids.md      # the seven rules and the build-time asset checks
│   ├── view-address.md        # the query-string grammar, slug resolution, round-trip rules
│   ├── build-outputs.md       # what the Atlas build writes, and the feature property conventions
│   └── atlas-page.md          # regions, drawers, keyboard map, fallback, provenance styling
└── tasks.md                   # /speckit-tasks
```

### Source code (repository root)

```text
src/registry/
├── schemas/atlas-values.ts    # themes, time modes, facet kinds, name kinds, transformations
├── schemas/families.ts        # LayerSchema, PlaceSchema extended; Facet, Georef, PlaceName values
├── rules/atlas.ts             # the seven rules
├── project.ts                 # allowlist grows (layer, place); never the source path of a held layer
└── synthetic.ts               # + layers, collections, places for the 200-layer fixture
src/atlas/                     # pure modules (no DOM, no framework)
├── time.ts                    # EDTF → [fromMin, fromMax, toMin, toMax]; featureState(year)
├── view-state.ts              # the typed state, defaults, reducers (the store's logic)
├── view-url.ts                # parse and serialise the address; slug resolution (shared with essays)
├── index-data.ts              # public layers → atlas-index.json; derived collections; rooms via spec 007's roomsOf
├── rank.ts                    # search ranking (US2 order)
├── facets.ts                  # facet values from features; applying and resetting
├── place-index.ts             # normalised names → prefix and exact lookup
├── provenance-style.ts        # geometry provenance → pattern, legend text (non-colour cues)
├── overview-svg.ts            # collection default layers → SVG (pure projection)
└── build/                     # convert-assets.ts, write-outputs.ts (used by the integration)
src/integrations/atlas.ts      # astro:build:done: convert sources, write indexes, fail on size or missing asset
src/atlas-client/              # browser code: store.ts, map.ts, catalogue.ts, inspector.ts, drawers.ts, keyboard.ts, search.ts
src/pages/atlas/index.astro    # the Atlas page
src/pages/atlas/handbook/{index,[slug]}.astro
src/content/handbook/*.md      # Handbook entries (draft skeleton copy)
data/layers/                   # layer sources (empty in v1 until spec 008 imports the Dacia layers)
data/basemap/                  # Natural Earth country outlines (FlatGeobuf) with its source and licence note (research R11)
tests/registry/{unit,integration}/   # new schema, rule, synthetic tests
tests/atlas/{unit,build,e2e,fixtures}/
```

**Structure Decision**: pure modules in `src/atlas/` are the seam: they take records and return plain data, so the time rule, the address round trip, the index, the ranker, facets and place search are tested without a browser, and the browser code is a thin shell over them. The registry half stays framework-free so the new rules run in CI and from R pipelines. The view-address module is imported by the Atlas and by essays' "Open in Atlas" link component (ADR 0013).

## Acceptance-scenario → test map

| Story | Scenarios | Test |
|---|---|---|
| US1 compose | 1 (interval, uncertain flag) | `tests/atlas/unit/time.test.ts` |
| | 2 (present-day reference labelled and styled distinctly) | `unit/provenance-style.test.ts`, `e2e/legend.spec.ts` |
| | 3 (reconstruction by pattern and text) | `unit/provenance-style.test.ts`, `e2e/legend.spec.ts` |
| | 4 (out of range stays active) | `unit/view-state.test.ts`, `e2e/year.spec.ts` |
| | independent test (two fixture layers at 1400) | `e2e/year.spec.ts` |
| US2 discover | 1 (activate defaults) | `unit/view-state.test.ts`, `e2e/collections.spec.ts` |
| | 2 (year relevance narrows, active stays) | `unit/index-data.test.ts`, `unit/view-state.test.ts` |
| | 3 (ranking order) | `unit/rank.test.ts` |
| | 4 (rooms derived) | `unit/index-data.test.ts` |
| | independent test (lens switch leaves Active Layers) | `unit/view-state.test.ts`, `e2e/lens.spec.ts` |
| US3 inspect | all fields; facets apply and reset | `unit/facets.test.ts`, `e2e/inspector.spec.ts` |
| US4 share | round trip; retired slug | `unit/view-url.test.ts`, `e2e/share.spec.ts` |
| US5 handbook | links from landing, controls, inspector, home, footer | `build/handbook.test.ts`, `e2e/handbook-links.spec.ts` |
| US6 overlays | opacity; quality fields | `unit/georef.test.ts`, `e2e/overlay.spec.ts` |
| US7 place search | prefix; marker; Active Layers unchanged | `unit/place-index.test.ts`, `e2e/place-search.spec.ts` |
| FR-001, FR-023 schema | | `tests/registry/unit/atlas-schema.test.ts` |
| FR-006 size gate | | `tests/registry/unit/layer-asset-size.test.ts`, `tests/atlas/build/convert.test.ts` |
| FR-008 keyboard | | `e2e/keyboard.spec.ts` |
| FR-011 public only | | `build/leak.test.ts` |
| FR-016 no WebGL | | `build/overview.test.ts`, `e2e/no-webgl.spec.ts` |
| FR-017 no external tiles | | `e2e/no-external-requests.spec.ts` |
| FR-020 budget | | `lighthouserc.json` (script size on `/atlas/`), `e2e/performance.spec.ts` |
| FR-021 index | | `unit/index-data.test.ts`, `unit/index-data.size.test.ts` |
| FR-022 rooms and essays derived | | `unit/index-data.test.ts` |
| SC-001 timings | | `e2e/performance.spec.ts` (200 layers) |
| SC-005 no leak | | `build/leak.test.ts`, `tests/registry/mutations.test.ts` |
| SC-006 not colour alone | | `unit/provenance-style.test.ts`, axe in `e2e/a11y.spec.ts` |

## Complexity Tracking

Empty: no constitution violations.
