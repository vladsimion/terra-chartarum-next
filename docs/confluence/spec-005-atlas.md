DRAFT, not published to Confluence. Drafted 2026-10-19 against `main` at `01d8034` plus the open pull requests #59 (cross-cutting checks), #60 (performance check, stacked on #59) and the polish pull request; the Atlassian connector cannot write Confluence pages, so publishing needs a signed-in browser. When published, the page id and version go in this line and in the README table. Reconcile the status and counts after those merge.

Programme dossier for spec 005, written against the fourteen-point contract in [Programme Dossier Contract & Reconciliation Register](https://vladsimion.atlassian.net/wiki/spaces/~7012186ee7d7085f34fff9bc2bf8fbe8de309/pages/18481169), as the dossiers for specs 001 to 004 are.

## 1. Programme metadata

| | |
|---|---|
| Programme type | Instrument: a time-aware map for composing a historical argument from shared layers |
| Status | **Stories merged; cross-cutting checks and polish open.** Setup and Foundation (#50), User Stories 1 to 7 (#51 to #53, #55 to #58), and the basemap (#54) are merged. Open: the cross-cutting checks (#59), the performance check (#60) and polish. One budget is failing and awaits a decision (section 14). The Definitions of Done stay open until this page is published. |
| Jira | **TCX-6** epic (In Progress); stories **TCX-33** (US1 compose a map at a year; also holds the cross-cutting checks), **TCX-34** (US2 discover by theme, collection, room), **TCX-35** (US3 inspect and facets), **TCX-36** (US4 share a view), **TCX-37** (US5 Handbook), **TCX-38** (US6 overlays), **TCX-49** (US7 place search). The merged stories are In Review, not Done. |
| Canonical parent | A standalone page at the root of the space, as for specs 001 to 004 |
| Repository | https://github.com/vladsimion/terra-chartarum-next (public). Spec `specs/005-atlas/`; code `src/atlas/` (pure modules and the build), `src/atlas-client/` (browser), `src/registry/rules/atlas.ts`, `src/integrations/atlas.ts`, `src/pages/atlas/`, `src/content/handbook/`; decision `docs/adr/0013` |
| Successor relationship | Replaces the live site's map viewer at cutover; spec 008 imports the real Roman Dacia layers |
| Last reconciliation | 2026-10-19 (82 registry rules and 102 named mutations; 1877 Vitest tests in 149 files, all passing, on the polish branch; Chromium Playwright: Atlas 175 across light, dark, phone and no-JavaScript) |

## 2. Purpose / thesis

A map that says how sure it is. The falsifiable claim: **a reader can pick a year and see only the features valid then, every line shows how it is known (documentary, reconstruction, generalised, present-day reference) by more than colour, an uncertain date is drawn paler, and nothing that is not published and released appears in any page, file or address.**

## 3. Scope and non-goals

### In scope
- Layer and place records extended for the Atlas (theme, tags, synonyms, temporal envelope, time mode, facets, georeferencing; place names and location); seven registry rules.
- The Atlas page: year control, catalogue by theme, collection or room with search, collection defaults, active layers, the inspector with per-layer facets, the legend, a shareable address, place search, the Handbook, georeferenced overlays with an opacity control, and a no-WebGL fallback.
- The Atlas build: FlatGeobuf per public layer with year bounds, indexes, an SVG overview per collection, MapLibre and the basemap served from the site.

### Non-goals
- Importing the real Roman Dacia layers (spec 008); Corpus Chartarum Daciae stays held and unlisted.
- Writing the Handbook text (draft skeleton copy until the author releases it); relief, labels and a vector-tile basemap (PMTiles needs a tiling step the build does not have).
- Saved views or accounts: the address is the only state.

## 4. Outputs / deliverables

`src/registry/rules/atlas.ts` (seven rules, a named mutation each), `schemas/atlas-values.ts`, the layer and place schema additions; `src/atlas/` (time, provenance style, view state, view URL, index, rank, facets, inspector data, place index, feature table, overview SVG, labels, handbook links) and `src/atlas/build/` (asset conversion with eight `ATLAS-*` checks, FlatGeobuf writer, the vendored MapLibre, the Allmaps import repair); `src/atlas-client/` (entry, map, store, inspector, search, fallback, features); `src/pages/atlas/` and the Handbook pages; the `registry synth --atlas` generator; `data/basemap/countries.fgb`; build outputs `data/layers/`, `data/overlays/`, `data/overview/`, `data/atlas-index.json`, `data/atlas-slugs.json`, `data/place-index.json`, `data/basemap.fgb`, `vendor/maplibre/`.

## 5. Research, sources and rights framework

Layers carry their dataset and rights; the inspector prints the licence line made from the rights and never typed text. The basemap is Natural Earth 50 m country outlines (public domain), self-hosted and labelled as present-day reference; no third-party tile service is called at runtime (FR-017, tested). The Allmaps plugin renders an overlay from an annotation held in the repository and the image the map record names.

## 6. Evidence and data architecture

The Atlas reads the registry only through the public projection (ADR 0013): a layer is listed only if published and released, and the source path `asset` is not projected. Year bounds are computed at build time from EDTF into integer columns on each feature, with a flag for an uncertain endpoint; an uncertain endpoint is only possibly valid on its boundary year. A layer's rooms are derived from the public essays that use it (`roomsOf`). Slug history resolves a retired slug in an address.

## 7. Essay and editorial architecture

The inspector links a layer to the public essays that use it. The Handbook is five topics (reading the time control, provenance and reconstruction, themes and collections, sharing a view, keyboard and accessibility), every page marked draft, so `shell:check --cutover` fails until the author releases them.

## 8. Interaction and technical implementation

### 8.1 Seams (where tests live)
1. The registry through `validateRegistry` and the CLI (schemas, seven rules, `synth --atlas`).
2. Pure modules in `src/atlas/` (time, view state, view URL, index, rank, facets, place index, feature table, overview SVG).
3. The Atlas build through the files it writes (`buildAtlas`), the built fixture page through `node-html-parser` (a third Vitest global setup), and Playwright with axe on the Atlas fixture registry (its own config and port).

### 8.2 Rules that tests enforce
- The page script is under 100 KB (about 91 KB) before a layer is added; MapLibre (served unbundled beside its worker), the FlatGeobuf reader and, for an overlay, the Allmaps chunk (156 KB gzip) load only when needed.
- Provenance is drawn by line and fill pattern, an uncertain date by opacity; the legend lists only the classes present.
- No request leaves the site's origin; no held id, slug, retired slug, title or name and no private value is in any Atlas page, file or address (six named leak mutations, `tests/atlas/build/leak.test.ts`).
- The whole keyboard scenario works without a pointer; axe finds nothing on the Atlas, with an overlay inspected, and without WebGL.
- Without WebGL MapLibre is never loaded; the page shows the collection's SVG overview and a table of features at the year for each active layer.

### 8.3 CI and repository
The Atlas page, the Handbook index and a topic page are in the CI template list and the Lighthouse URLs. `npm run test:e2e:atlas` is a CI step; `test:e2e:atlas-perf` (a seeded 200-layer catalogue on an emulated phone) is added by #60.

## 9. Implementation phases and dependency model

Setup and Foundation (registry), US1, US2, US3, the basemap, US4, US7, US5, US6, cross-cutting checks, Polish. The registry half needs no Astro; the page half needs spec 002's shell and spec 003's essay lists. Stacked pull requests were retargeted to `main` when the one below merged.

## 10. Jira hierarchy and reconciliation history

TCX-6 holds TCX-33 to TCX-38 and TCX-49, each with its Spec Kit checklist; TCX-33 also holds Setup and Foundation and the cross-cutting checks (T059 to T064). Departures from the plan, recorded in `tasks.md`: T028 (the basemap) shipped after US3 as its own pull request once the author chose FlatGeobuf over PMTiles; the leak mutations live in `tests/atlas/build/leak.test.ts` because PRIV-LEAK is an output scan, not a registry rule; place search (TCX-49) was added as a seventh story.

## 11. Programme acceptance criteria

- Every acceptance scenario of US1 to US7 has a passing automated test written first (exceptions are listed in the pull requests: several specs passed at first run because the behaviour held).
- `gate` is green on `main`: accessibility 100 and the ADR 0004 budgets on every listed template, including the Atlas and Handbook page types; SC-001 (below) is the open exception.
- No `[NEEDS CLARIFICATION]` remains in the spec.

## 12. Verification ledger

| Claim | Evidence |
|---|---|
| Seven rules with thresholds and a mutation each | `tests/registry/unit/layer-*.test.ts`, `place-names-location.test.ts`, `mutations.ts`, `rule-coverage.test.ts` |
| Public allowlist; held layers, places, collections never projected | `tests/registry/unit/atlas-project.test.ts` |
| Valid-at-year rule, uncertain endpoints | `tests/atlas/unit/time.test.ts`, `visible.test.ts`, `dates-minified.test.ts` (the date reader survives minification) |
| Provenance patterns and legend | `unit/provenance-style.test.ts`, `e2e/legend.spec.ts` |
| Discovery, search, ranking, lenses | `unit/rank.test.ts`, `catalogue-view.test.ts`, `e2e/lens.spec.ts` |
| Inspector and facets | `unit/inspector-data.test.ts`, `facets.test.ts`, `e2e/inspector.spec.ts` |
| Address round-trip, retired and held slugs | `unit/view-url.test.ts`, `e2e/share.spec.ts` |
| Place search | `unit/place-index.test.ts`, `e2e/place-search.spec.ts` |
| Handbook and its links | `build/handbook.test.ts`, `e2e/handbook-links.spec.ts` |
| Overlay: quality fields, opacity, lazy plugin | `unit/georef.test.ts`, `build/allmaps-vite.test.ts`, `e2e/overlay.spec.ts` |
| Build outputs, size gate, eight `ATLAS-*` checks | `build/convert.test.ts` |
| No WebGL | `unit/overview-svg.test.ts`, `feature-table.test.ts`, `build/overview.test.ts`, `e2e/no-webgl.spec.ts` |
| Keyboard, no outside requests, leak | `e2e/keyboard.spec.ts`, `e2e/no-external-requests.spec.ts`, `build/leak.test.ts` |
| Performance on 200 layers | `tests/atlas/perf/performance.spec.ts` (#60): interactions 96 to 192 ms against 200 ms; **the map is interactive at 4.6 to 4.7 s against 4 s** |
| Not verified | Firefox, WebKit and Lighthouse (CI runs them); the overlay against a real annotation and IIIF image (the fixture annotation has no items); the performance numbers were taken on an older Mac with software WebGL |

## 13. Canonical ownership and propagation

Owned here: the Atlas fields of layer and place, the seven rules, the Atlas build and page, the view address contract, the Handbook entries. Spec 001 owns the registry, its rule table (seven rows added there) and `registry scan` (extended here for held names and retired slugs); spec 002 owns the shell, the CI template list and the static-output rule (extended for the Atlas scripts); spec 004 owns the map record an overlay points to; spec 008 imports the real layers and must supply the new fields; spec 003 or 008 owns an essay's "Open in Atlas" link, which uses this spec's `viewUrl`.

## 14. Current checkpoint and delivery authority

All seven stories are merged. Open pull requests: #59 (cross-cutting checks: no-WebGL, keyboard, outside requests, leak), #60 (performance check) and the polish pull request. **Decision for Vlad (ADR 0004 is his):** the map is interactive at about 4.6 s on the emulated phone against the 4 s budget; options are to loosen the budget to 5 s, draw the layers before the basemap arrives, or shrink the 488 KB basemap. Left for the author after the code review: the contract's per-layer visibility toggle and `Escape` returning focus to the last control are not built; the collection links on the landing page are built by hand rather than with `viewUrl`; no essay "Open in Atlas" link exists yet; no test asserts that browsing the catalogue fetches no layer file. The Handbook text is for the author to write. Delivery authority: Vlad merges; no story is marked Done until this page is published.
