---

description: "Task list for 004 Map Collection & Cartographers Catalogue"
---

# Tasks: Map Collection & Cartographers Catalogue

**Input**: Design documents from `/specs/004-collection-catalogue/`

**Prerequisites**: plan.md, spec.md (clarified 2026-10-17), research.md, data-model.md, contracts/ (map-rule-ids.md, collection-pages.md, cli-additions.md), quickstart.md. Decision: ADR 0011.

**Tests**: REQUIRED (Constitution X). Every acceptance scenario has an automated test written first, and each story is built red → green with the `tdd` skill: in every phase the test tasks come first and must be seen failing before the task that makes them pass. Refactoring happens in review, not inside the loop. Every new rule gets a named mutation in the same task that adds it (the rule-coverage test fails otherwise).

**Seams** (to confirm with Vlad at T001): (1) the registry through `validateRegistry` and the CLI `main` (schemas, rules, `completeness`); (2) the pure site modules `record-view.ts`, `index-data.ts`, `filter.ts`, `where-used.ts` and `enrichment.ts` (records in, plain data out); (3) the built pages through build-output tests (`node-html-parser`) and Playwright. No test reaches inside a component.

**Organization**: Grouped by user story. Slice order: **Foundation → US1 → US2 → US4 → US3 → US5 → Polish**. The registry half (Foundation and US5's pure part) needs no Astro and can be built before spec 002 lands. The site half needs spec 002's shell and registry integration; the citation task in US1 needs spec 003's `src/essays/citations.ts` and is the last task of that story so everything before it is not blocked.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1–US5, matching `spec.md`
- Paths are relative to the repository root. Registry tests are under `tests/registry/`, site tests under `tests/collection/`.
- Jira: each story's checklist is copied into its TCX story under epic TCX-5 (TCX-28 US1, TCX-29 US2, TCX-30 US3, TCX-31 US4, TCX-32 US5; Setup and Foundation sit in TCX-28); Jira and Confluence are updated after each story (workflow step 4); `/speckit-taskstoissues` is not used.

---

## Phase 1: Setup

- [ ] T001 Agree the three seams above with Vlad (tdd skill) and record any change here
- [ ] T002 [P] Create `tests/collection/fixtures/registry/` with about six hand-authored map records and their neighbours: a held witness with `inspected` verification and `basis` on provenance; an institutional IIIF witness; a record attributed to a `workshop` (unresolved); a record whose reproduction is not cleared (image withheld); a record whose only attribution evidence is a `dealer` source; a record with an unknown date; two cartographers (person and workshop), places of type region and country, the seven rooms, two public essays and one held essay that cite the maps, a layer that references one map, sources including a finding aid, and a held cartographer used by no public map. Add invalid variants named for the rule they trip
- [ ] T003 [P] Extend `src/registry/synthetic.ts` so the seeded generator can produce `n` map records with their makers, places and essays (60 for US2, 500 for SC-004); a test asserts the same seed gives byte-identical records

---

## Phase 2: Foundation (registry; blocks every story)

**Goal**: the schemas, the rules, the public allowlist and spec 001's documents brought in step (FR-009).

- [ ] T004 [P] Write failing `tests/registry/unit/map-schema.test.ts`: a map record with every clarified FR-001 field loads and types correctly, including `record_scope` (`object`, `work`, `concept`), `witness_kind` of `held`, `institutional` or `unlocated`, and `open_questions[]`; `images[]` takes objects (the old `string[]` placeholder is rejected); `physical` loads and is never projected; a cartographer with `kind`, `names`, `roles`, `active` loads; `FAM-UNKNOWN` still rejects an unlisted field; `coverage[]` (place), `publication_place` (place), `attribution_evidence[]` (evidence) and `bibliography[]` (bibliography entry) resolve through `REF-UNKNOWN` and `REF-FAMILY`; `witness_kind` and cartographer `kind` are required from `ready_for_build` (`FAM-REQUIRED`)
- [ ] T005 Implement `src/registry/schemas/map-values.ts` (the value sets, `DISPLAYED_FIELDS`, the private-word list), the extended `MapSchema` and `CartographerSchema` and the `ImageSource` and `Physical` value objects in `src/registry/schemas/families.ts`, the reference fields in `schemas/references.ts`, and the required lists; update every existing fixture that used `images: [string]`
- [ ] T006 [P] Write failing `tests/registry/unit/map-field-status.test.ts` for `MAP-FIELD-STATUS` and `MAP-BASIS` (empty and unstated warns at `ready_for_build` and errors at `publishable`; a `recorded` entry on an empty field fails; an unknown status value fails; a held witness missing `basis` on a filled provenance fails; an institutional witness with `basis` fails) with a named mutation for each rule
- [ ] T007 Implement `MAP-FIELD-STATUS` and `MAP-BASIS` in `src/registry/rules/map.ts` and register them
- [ ] T008 [P] Write failing `tests/registry/unit/map-verification.test.ts` for `MAP-VERIFICATION` (vocabulary; `last_verified` required unless `unverified`; `inspected` on an institutional witness is an error) with a named mutation
- [ ] T009 Implement `MAP-VERIFICATION`
- [ ] T010 [P] Write failing `tests/registry/unit/map-image.test.ts` for `MAP-IMAGE` (type, `https` url, attribution, `static_url` for `iiif` and `deepzoom`, `witness_kind` equal to the record's; `alt` missing warns at `ready_for_build` and errors at `publishable`) with a named mutation
- [ ] T011 Implement `MAP-IMAGE`
- [ ] T012 [P] Write failing `tests/registry/unit/map-attribution.test.ts` for `MAP-ATTRIBUTION`, `CART-KIND` and `MAP-SCOPE` (a `work` or `concept` carrying `witness_kind`, images or `inspected`; an `object` without `witness_kind`; a workshop maker forces `attribution: unresolved` and the reverse; `kind` and `roles` vocabularies; a workshop with `life_dates` fails) with named mutations
- [ ] T013 Implement `MAP-ATTRIBUTION`, `CART-KIND` and `MAP-SCOPE`
- [ ] T014 [P] Write failing `tests/registry/unit/map-dealer-only.test.ts` for `MAP-DEALER-ONLY` (all attribution evidence from `dealer` or `auction` sources warns at `ready_for_build` and errors at `publishable`; one scholarly source among them passes; none at `publishable` fails) with a named mutation
- [ ] T015 Implement `MAP-DEALER-ONLY` (it reads the evidence record's source `source_kind`)
- [ ] T016 [P] Write failing `tests/registry/unit/map-maker-held.test.ts` for `MAP-MAKER-HELD` (a public map with a held maker: warning at `ready_for_build`, error at `publishable`; a held map with a held maker is fine) with a named mutation
- [ ] T017 Implement `MAP-MAKER-HELD`
- [ ] T018 [P] Write failing `tests/registry/unit/map-private-field.test.ts` for `MAP-PRIVATE-FIELD` (a `price`, `paid`, `negotiation` or `vendor` key at any depth, in a map, an image object or another family, fails with the private-data message; a value containing "paid" does not) with a named mutation
- [ ] T019 Implement `MAP-PRIVATE-FIELD`
- [ ] T020 [P] Write failing `tests/registry/unit/map-project.test.ts`: the public projection of a map and a cartographer carries exactly the allowlist of data-model.md and nothing else (`physical`, `private`, held references and any field not listed are dropped); a withheld image keeps its metadata
- [ ] T021 Extend `src/registry/project.ts` with the map and cartographer allowlists
- [ ] T022 Register the ten rules in `src/registry/rules/index.ts`, make the rule-coverage test pass (each has a named mutation), and add them to `specs/001-scholarly-registry/contracts/rule-ids.md`; update spec 001's `data-model.md` map and cartographer rows to point at spec 004's

---

## Phase 3: User Story 1 — Inspect a map object in detail (P1)

**Goal**: a reader opens a record and sees every field with its status, the witness, the evidence for the attribution, and a viewer that costs nothing until used.

**Independent Test**: the IIIF fixture renders its record and a working viewer; with the image source blocked the record still renders with the static image and a message.

- [ ] T023 [P] [US1] Write failing `tests/collection/unit/record-view.test.ts` (scenarios 2 to 6): every displayed field returns its value or its explicit status text; a held witness's provenance and atlas context return `Observed` or `Inferred`; attribution returns its evidence list; a workshop maker returns the unresolved state; an uncleared reproduction returns an `image: withheld` decision with the reason and no URL; an institutional witness is labelled with its repository
- [ ] T024 [US1] Implement `src/collection/record-view.ts` (pure)
- [ ] T025 [P] [US1] Write failing `tests/collection/build/map-page.test.ts`: the record page for each fixture contains the rows, status text, witness label, attribution evidence and, for the cleared record, attribution and licence next to every image (SC-001); the uncleared record has no `<img>` and says why; no `<script>` ships the viewer on first load
- [ ] T026 [US1] Implement `src/pages/collection/[slug].astro`, `MapRecord.astro`, `FieldRow.astro` and the image block on spec 002's Base layout, reading through `loadPublicRecords` and `record-view.ts`; set the collection destination in `destinations.ts` to `live`
- [ ] T027 [P] [US1] Write failing `tests/collection/e2e/viewer.spec.ts` (CI-verified): the viewer chunk is not requested before activation; activating it lets the reader pan and zoom by mouse, touch and keyboard (scenario 1); with the image source blocked the static image stays and a message shows; with JavaScript off the block links to the institution's viewer; under `prefers-reduced-motion` the animation time is zero; first sharp tile within 2.5 s (SC-003, timed against a local tile server)
- [ ] T028 [US1] Add `openseadragon` at an exact pinned version (record its gzip size here), `src/collection/viewer.client.ts` (dynamic import on click, keyboard map from the contract, reduced-motion, failure message) and `ImageViewer.astro`
- [ ] T029 [US1] Add the collection record page type to `tests/shell/ci-templates.json` and `/collection/<fixture>/` to `lighthouserc.json`; write `tests/collection/e2e/a11y.spec.ts` (axe on the record page, viewer closed and open); check first-load JS is ≤ 100 KB compressed
- [ ] T030 [US1] Add the citation and export control to the record page from spec 003's `src/essays/citations.ts` with the map record as input (CSL type `map`, stable URL, access date), and extend `build/map-page.test.ts` for FR-006; blocked until that module exists, so it can follow the other stories

**Checkpoint**: a reader can inspect any public fixture map; US1's Jira checklist updated.

---

## Phase 4: User Story 2 — Browse and filter the collection (P1)

**Goal**: filter by cartographer, date range, region, room and witness, combined, with the list complete without JavaScript.

**Independent Test**: the 60-record generated fixture filters correctly on each facet and on combinations.

- [ ] T031 [P] [US2] Write failing `tests/collection/unit/index-data.test.ts`: the index holds only the contract's fields for public maps; the year interval comes from the EDTF value (`1595?`, `159X`, `1595/1602`, a BCE year); rooms come from `roomsOf` in `src/rooms/membership.ts` (spec 007, ADR 0015), which derives them from the public essays that cite the map (FR-019) and a held essay contributes none; regions come from `coverage[]` places of type region or country
- [ ] T032 [US2] Implement `src/collection/index-data.ts` (pure) and `src/pages/data/collection-index.json.ts`
- [ ] T033 [P] [US2] Write failing `tests/collection/unit/filter.test.ts`: each facet alone; facets combined; an uncertain date matches any overlapping range and an undated record matches no date filter (US2.1); sort by date (undated last), title, maker, stable on ties (US2.3); an unknown query key or value is ignored; and `filter.perf.test.ts` — the 500-record generated fixture filters in under 200 ms (SC-004)
- [ ] T034 [US2] Implement `src/collection/filter.ts` (pure, with query-string parse and serialise)
- [ ] T035 [P] [US2] Write failing `tests/collection/build/collection-list.test.ts` (static list of every public map and no held record; the filter form and sort control are present and submit as GET) and `tests/collection/e2e/collection.spec.ts` (CI-verified: filters apply and write the query string; a copied address reopens the same view (US2.2); with JavaScript off the form still filters by reloading)
- [ ] T036 [US2] Implement `src/pages/collection/index.astro`, `CollectionList.astro`, `FilterBar.astro` and `src/collection/filters.client.ts`
- [ ] T037 [US2] Add the collection list page type to `tests/shell/ci-templates.json` and `/collection/` to `lighthouserc.json`; axe on the list with filters open

**Checkpoint**: US2 independently verifiable; Jira updated.

---

## Phase 5: User Story 4 — See where a map is used (P2)

**Goal**: a map page lists every public essay, Atlas layer or overlay and place that references it, and nothing held.

- [ ] T038 [P] [US4] Write failing `tests/collection/unit/where-used.test.ts`: reverse references from essay `maps[]`, layer `relations[]` and place `relations[]` or `coverage[]`; grouped by kind; a held essay, a held layer and a held place are omitted; the result is empty for an unused map
- [ ] T039 [US4] Implement `src/collection/where-used.ts` (pure) and `WhereUsed.astro`; extend `build/map-page.test.ts`
- [ ] T040 [P] [US4] Write failing `tests/collection/build/leak.test.ts` (SC-005, US4 scenario): no title, id or slug of the held essay, the held cartographer or any private field word appears in any file of the built output, including `data/collection-index.json`; add the held fixtures' strings to the existing leak list
- [ ] T041 [US4] Make the leak test pass (fix whatever it finds); add the named mutation to `tests/registry/mutations.test.ts` that adds a held essay's title to a map page and expects the leak scan to fail

---

## Phase 6: User Story 3 — Cartographer profiles (P2)

**Goal**: a profile with names, roles, dates, biography, the maps linked to the cartographer and the essays that use them.

- [ ] T042 [P] [US3] Write failing `tests/collection/build/cartographer-page.test.ts`: the profile shows names, roles, dates, the biography from `<id>.md`, public maps with `attribution: exact` and the public essays using them; a workshop page lists its unresolved maps separately; a person with no public map says so; the held cartographer has no page and is not linked from any map (FR-012); the list shows released cartographers only
- [ ] T043 [US3] Implement `src/pages/cartographers/index.astro`, `[slug].astro` and `CartographerCard.astro`; load the `.md` body only for public records; set the cartographers destination to `live`
- [ ] T044 [US3] Add the cartographer page types to `tests/shell/ci-templates.json` and `lighthouserc.json`; axe on both

---

## Phase 7: User Story 5 — Completeness and enrichment queue (P3)

**Goal**: an editor report of what is incomplete and what to enrich first, never published.

- [ ] T045 [P] [US5] Write failing `tests/registry/unit/enrichment.test.ts`: completeness per record (displayed, recorded, gaps, statuses); the three factors from the bands in research R7; the product and the order (ties by id); a held essay counts toward impact; a record with no gaps and no references scores 1
- [ ] T046 [US5] Implement `src/registry/enrichment.ts` (pure)
- [ ] T047 [P] [US5] Write failing `tests/registry/integration/completeness.test.ts`: `registry completeness` writes `completeness.json`, `enrichment-queue.json` and `.md` into `--out`, exits 0 even when the gate fails, and exits 1 on an unloadable registry; a build-output test asserts neither file name nor content reaches the site output
- [ ] T048 [US5] Add `completeness` to `src/registry/cli.ts`; upload the reports as a CI artefact in `.github/workflows/registry.yml`

---

## Phase 8: Polish & cross-cutting

- [ ] T049 [P] Run the quickstart end to end and fix anything it exposes
- [ ] T050 [P] Update `README.md` and the `docs/` notes for the collection pages; list ADR 0011 in `CLAUDE.md`'s Read-first line
- [ ] T051 Confirm the accessibility and performance gates on the new page types in CI (Lighthouse CI budgets and axe), including the viewer-open state
- [ ] T052 Run the `code-review` skill against `main...HEAD` (standards and spec axes) and address findings in review
- [ ] T053 Update Jira (TCX-5 description, story checklists, statuses), the Confluence dossier for spec 004, the Build Log and the Decision Log (workflow step 4); record in the dossier that spec 008 owns the import and release of the 59 records

---

## Dependencies & Execution Order

- Setup → Foundation → US1 → US2 → US4 → US3 → US5 → Polish. Foundation blocks everything; US5's pure part (T045 to T046) needs only Foundation.
- The site half needs spec 002's shell and its registry integration (spec 002 US4: `loadPublicRecords`, the build-time gate and `REGISTRY_ROOT`). T030 also needs spec 003's `src/essays/citations.ts`.
- SC-002 (no essay-private duplicate description of a map) is enforced by spec 003's body scan (`ESSAY-BODY-DYNAMIC`, `essay-body.test.ts`); spec 004 adds no task for it. FR-008 (the 59 records) belongs to spec 008.
- US4 needs the record page (US1); US3 reuses the record page's maker links.
- Spec 008's importer targets this schema; nothing here imports legacy data.

## Implementation Strategy

MVP is Foundation plus US1: a fixture map renders fully and honestly. Each later story adds one reader capability. Ship one story per PR, red tests pushed first for the browser specs, verified in CI.
