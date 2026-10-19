Programme dossier for spec 004, written against the fourteen-point contract in [Programme Dossier Contract & Reconciliation Register](https://vladsimion.atlassian.net/wiki/spaces/~7012186ee7d7085f34fff9bc2bf8fbe8de309/pages/18481169), as the dossiers for specs 001 to 003 are.

## 1. Programme metadata

| | |
|---|---|
| Programme type | Catalogue: the map and cartographer records, the collection pages, the viewer and the editor's completeness report |
| Status | **Code complete and polished.** Foundation (PR #42), User Stories 1 to 5 (#43, #44, #46, #45, #48), the gate fix (#47) and polish (#49) are merged; `gate` is green on the #49 merge commit `7977b49`. `main` was red from the merge of #44 until #47. The stories stay In Review until Vlad moves them to Done. |
| Jira | **TCX-5** epic (In Progress); stories **TCX-28** (US1 inspect a record), **TCX-29** (US2 browse and filter), **TCX-30** (US3 cartographer profiles), **TCX-31** (US4 where used), **TCX-32** (US5 completeness and enrichment). TCX-28 and TCX-29 are In Review, not Done. |
| Canonical parent | A standalone page at the root of the space, as for specs 001 to 003 |
| Repository | https://github.com/vladsimion/terra-chartarum-next (public). Spec `specs/004-collection-catalogue/`; code `src/registry/` (map rules, enrichment), `src/collection/`, `src/rooms/membership.ts`, `src/pages/collection/`, `src/pages/cartographers/`; decisions `docs/adr/0011` and `0016` |
| Successor relationship | Replaces the live site's map records and pages at cutover; spec 008 owns importing and releasing the 59 legacy records |
| Last reconciliation | 2026-10-19 (at #49: 1520 Vitest tests in 116 files, all passing; Chromium Playwright: collection 65, essays 58, shell 90; `gate` green on `7977b49`. On today's `main`, with spec 005 merged: 1888 tests in 149 files, 82 registry rules, 102 named mutations) |

## 2. Purpose / thesis

A map record states what is established and what is not, and nothing unestablished looks established. The falsifiable claim: **every field a record page shows has a value or a stated status, no image the project may not reproduce is ever shown, and nothing about a held record or an acquisition appears anywhere in the output.**

## 3. Scope and non-goals

### In scope
- One record per map witness (held by this project, held by an institution, unlocated), and records for a work or a concept that are not a single object (ADR 0016); `field_status` and `basis` per displayed field; embedded image sources.
- Ten registry rules for maps and cartographers, a public allowlist, and `generateMapRegistry` for the 60 and 500 record sets.
- The record page (fields with statuses, witness, attribution with its evidence, image block, where used, bibliography, citation and exports), a deep-zoom viewer that loads only on activation, the filterable list, cartographer list and profiles.
- `registry completeness`: a per-record completeness report and a ranked enrichment queue, never published.

### Non-goals
- Importing and releasing the 59 legacy records (spec 008); the Atlas and georeferenced overlays (spec 005); physical-object fields beyond validation (`physical` is schema-only in v1).
- Place pages and Atlas layer pages: layers and places are plain titles in "where used" until they exist.

## 4. Outputs / deliverables

`src/registry/rules/map.ts` (ten rules, one named mutation each), `schemas/map-values.ts`, `enrichment.ts`, `values.ts`, `routes.ts`; `src/collection/` (record view, index, filter, order, where-used, cartographer view, list view, citation, the viewer and filters scripts, components); `src/rooms/membership.ts` (`roomsOf`); the pages under `src/pages/collection/`, `src/pages/cartographers/` and `/data/collection-index.json`; the fixture registry `tests/collection/fixtures/registry`; OpenSeadragon 6.1.1, pinned.

## 5. Research, sources and rights framework

Image attribution and licence ride with every image instance, thumbnail and full (FR-005, ADR 0009). A record whose reproduction is not cleared is public, but its page withholds the image and says why; the address never reaches the page. A dealer or auction source never supports an attribution on its own (`MAP-DEALER-ONLY`). Acquisition details never enter the repository (`MAP-PRIVATE-FIELD`, at any depth, in any family, and the value is never repeated in a report). Locators and the Chicago citation reuse spec 003's generator.

## 6. Evidence and data architecture

The pages read the registry only through the public projection. `where used` and a room are derived, never stored: essays through `maps[]`, layers and places through `relations[]`, rooms through the public essays (`roomsOf`, ADR 0015). An unresolved attribution to a workshop is not an exact maker in any list, the filter index included (FR-011). The held-cartographer rule: a held maker has no page and no map links to it (`MAP-MAKER-HELD`).

## 7. Essay and editorial architecture

None here beyond the link from a record to the essays that cite it, and the essays that use a cartographer's exactly-attributed maps.

## 8. Interaction and technical implementation

### 8.1 Seams (where tests live)
1. The registry through `validateRegistry` and the CLI `main` (schemas, ten rules, `completeness`).
2. Pure site modules: record view, index, filter, order, where-used, cartographer view, list view, citation, enrichment, `roomsOf`.
3. The built fixture site through `node-html-parser` (a second Vitest global setup builds the collection fixtures in a child process) and Playwright with axe.

### 8.2 Rules that tests enforce
- Every displayed field has a value or a status; a held witness marks provenance and atlas context observed or inferred.
- A shown image has its credit and licence beside it; a withheld image leaves no address in the page.
- The viewer library is not requested before activation (first-load script 1.9 KB gzip; library 86.8 KB gzip on demand); keyboard, wheel, drag and pinch work; no animation under reduced motion; the still image stays if the source fails.
- The filter index holds only the contract's fields; a held essay, cartographer, map, layer, place, a biography or a private word appears in no built file; an editor report in the output fails `registry scan`.

### 8.3 CI and repository
The page types `collection-list`, `collection-record`, `cartographer-list` and `cartographer-profile` are in the CI template list and the Lighthouse URLs. `npm run test:e2e:collection` is a CI step since PR #47; before it, the collection browser specs did not run in CI. The completeness reports are a CI artefact once the repository has a `content/` directory.

## 9. Implementation phases and dependency model

Setup and Foundation (registry), US1, US2, US4, US3, US5, Polish. The registry half needs no Astro; the site half needs spec 002's shell and spec 003's citation generator. US3 reuses US4's referrer type, so #46 is stacked on #45.

## 10. Jira hierarchy and reconciliation history

TCX-5 holds TCX-28 to TCX-32, each with its Spec Kit checklist. Foundation and Setup sit in TCX-28. Departures from the plan, recorded in `tasks.md`: T002's fixtures moved to US1 where they are first used; the Collection destination stayed a stub until US2 built the list; the T041 mutation lives beside the leak test rather than in `tests/registry/mutations.test.ts`; without scripts the filter form submits and the list stays complete, because a static host cannot filter on the server.

## 11. Programme acceptance criteria

- Every acceptance scenario of US1 to US5 has a passing automated test written first (exceptions are listed in the pull requests: the viewer and where-used page assertions, `cells`-style small extractions).
- `gate` is green on `main`: accessibility 100 and the ADR 0004 budgets on every listed template, including the four new page types.
- No `[NEEDS CLARIFICATION]` remains in the spec.

## 12. Verification ledger

| Claim | Evidence |
|---|---|
| Ten rules with thresholds and a mutation each | `tests/registry/unit/map-*.test.ts`, `mutations.ts`, `rule-coverage.test.ts` |
| Public allowlist | `tests/registry/unit/map-project.test.ts` |
| Fields show a value or a status; withheld image | `tests/collection/unit/record-view.test.ts`, `build/map-page.test.ts` |
| Viewer lazy, keyboard, touch, reduced motion, fallback | `tests/collection/e2e/viewer.spec.ts` (CI since #47) |
| Filters, sort, shared address | `unit/filter.test.ts`, `filter.perf.test.ts` (500 records under 200 ms), `e2e/collection.spec.ts` |
| Nothing held or private in the output | `build/leak.test.ts`, `registry scan` |
| Cartographer pages | `build/cartographer-page.test.ts`, `unit/cartographer-view.test.ts` |
| Completeness and enrichment | `tests/registry/unit/enrichment.test.ts`, `integration/completeness.test.ts` |
| Not verified locally | Firefox, WebKit, the phone project and Lighthouse (CI runs them); the 2.5 s first-tile budget was measured against a local stand-in for an IIIF server |

## 13. Canonical ownership and propagation

Owned here: the map and cartographer schemas and rules, the collection and cartographer pages, the filter index, the completeness report. Spec 001 owns the registry, its rule table (the ten rows are added there) and `registry scan`; spec 002 owns the shell, the CI template list and the static-output rule (narrowed for the collection scripts); spec 003 owns the citation generator; spec 007 will add `membership` to `src/rooms/membership.ts`, which holds `roomsOf`; spec 008 imports the 59 records. The Build Log carries the shipped work; the Decision Log carries two entries from this programme: TC-D035 (maps and `RIGHTS-CLEARED`) and TC-D036 (the collection scripts and the shell's no-script rule).

## 14. Current checkpoint and delivery authority

Foundation, all five user stories and polish are merged (PRs #42 to #46, #48 and #49); #47 fixed the red gate and added the collection browser specs to CI. T053 (these Confluence records) closes with this page. Decisions taken by Vlad on 2026-10-18 (accepted as built): the no-JavaScript link to "the institution's viewer" (FR-017) is the image's still address, because the data model has no field for an institution's viewer page (a `viewer_url` field can be added later by a spec change); unlocated maps and works are not filterable by witness (the query accepts `held` and `institutional` only, as the contract says); the leak scan fails on any built text file that names an editor report, which is broader than a file-name check. Layer and place links wait for the Atlas and place pages. My local shell-suite results for #43 to #46 were taken against a stale preview server and are superseded by the fresh runs above. `main` and the TCX board are the delivery authority; this page summarises them.
