---

description: "Task list for 001 Scholarly Entity Registry & Integrity Gate"
---

# Tasks: Scholarly Entity Registry & Integrity Gate

**Input**: Design documents from `/specs/001-scholarly-registry/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ (module-api.md, cli.md, rule-ids.md, integrity-report.schema.json), quickstart.md

**Tests**: REQUIRED. Constitution X: every acceptance scenario has an automated test written first, and each story is built red → green with the `tdd` skill. In every story phase the test tasks come first and must be seen failing before the implementation tasks start. Refactoring happens in review (`code-review`), not inside the loop.

**Organization**: Tasks are grouped by user story. Phases follow the agreed slice order **US1 → US3 → US2 → US5 → US4** (plan.md), not priority number: US5 (release state) must precede US4 (reverse relationships), and US3 (graph) precedes US2 (evidence) so evidence targets have something to resolve against.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1–US5, matching `spec.md`
- All paths are relative to the repository root. Test paths are under `tests/registry/`, source under `src/registry/`.
- Jira: each story's checklist is copied into its TCX story description (CLAUDE.md); `/speckit-taskstoissues` is not used.

---

## Phase 1: Setup

- [X] T001 Create `package.json` (`"type": "module"`, `"private": true`; dependencies `zod`, `yaml` (no `fast-glob`: its glob chain carries an unfixed advisory, so files are listed with `node:fs`); devDependencies `typescript`, `vitest`, `tsx`, `ajv`, `@types/node`; scripts `test` = `vitest run`, `typecheck` = `tsc --noEmit`, `registry` = `tsx src/registry/cli.ts`) and `.nvmrc` containing `24`; run `npm install` and commit `package-lock.json`
- [X] T002 Create `tsconfig.json` with `strict: true`, `noUncheckedIndexedAccess: true`, `module`/`moduleResolution` `NodeNext`, `target` `ES2023`, `include` `["src", "tests", "scripts"]`
- [X] T003 Create `vitest.config.ts` (include `tests/**/*.test.ts`, node environment, `testTimeout` 120000 so the SC-004 timing test is not cut off)
- [X] T004 [P] Create `.gitignore` (`node_modules/`, `reports/`, `dist/`, `.DS_Store`)
- [X] T005 [P] Create `.github/workflows/registry.yml`: on pull request and push to `main`, Node from `.nvmrc`, `npm ci`, `npm run typecheck`, `npm test`, then `npm run registry -- check --dir content --out reports` (skip when `content/` is absent) and upload `reports/` as an artefact (FR-006, SC-001)

---

## Phase 2: Foundational (blocks every user story)

- [X] T006 [P] Create `src/registry/families.ts`: `FAMILIES` = the closed list `essay, map, cartographer, place, source, attestation, dataset, layer, collection, route, event, period, room, bibliography_entry, evidence` (FR-001); `AUTHORITIES` allowlist = `tc, pleiades, whg`; `ROOM_IDS` = `earth, map, city, border, road, archive, theatre` in that order
- [X] T007 [P] Create `src/registry/schemas/shared.ts` with Zod enums exactly as in data-model.md "Shared types": `Origin` (`legacy | minted`), `Lifecycle` (`proposed, researching, verified, ready_for_build, in_build, qa, publishable, published, superseded, blocked`), `Release` (`held | released`, default `held`), `Confidence` (`secure, probable, possible, conjectural, unknown`), `GeometryProvenance` (`source_geometry, georeferenced_trace, scholarly_reconstruction, generalized_editorial, modern_reference`), `DatePrecision` (`day, month, year, decade, quarter_century, century, unknown`), `EvidenceType`, `SilenceState` (`non_survival, non_survey, non_request, alternative_naming, outside_frame, source_not_applicable, meaningful_silence`), `LocatorState` (`verified, pending`), `SameAs` (`{ authority, id }`), `Rights` (`{ licence, attribution, reproduction_cleared, text_public_domain }`); also export the plain value lists (`LIFECYCLE_VALUES`, `RELEASE_VALUES`, `ORIGIN_VALUES`, `CONFIDENCE_VALUES`, and one per remaining enum) and `PortalDimension` (`Measure, Witness, Use, Cosmos, Power, Silence`, FR-012)
- [X] T008 [P] Create `tests/registry/support/builders.ts`: typed in-memory builders (`entity(family, overrides)`, `place()`, `source()`, `map()`, `evidence()`) that return a valid record by default so tests state only what they change
- [X] T009 Write failing `tests/registry/unit/report-model.test.ts`: `buildReport` sets `pass = true` only when there are zero `error` violations, counts errors and warnings separately, includes `schema_version: 1`, `run_id`, `commit`, `timestamp`, and is deterministic for equal input when `now` and `commit` are injected
- [X] T010 Implement `src/registry/report.ts`: `Violation` (`rule, severity, entity, file, field, value, expected`, per contracts/integrity-report.schema.json), `IntegrityReport`, `buildReport`, `toJson`
- [X] T011 Write failing `tests/registry/unit/severity.test.ts`: a rule with threshold `always` is an error at every lifecycle; `ready_for_build` is a warning at `proposed`, `researching`, `verified` and an error from `ready_for_build` through `published`; `publishable` is a warning below `publishable`; assumption to be confirmed in review: `blocked` is treated as `proposed` and `superseded` as `published` for severity
- [X] T012 Implement `src/registry/rules/framework.ts`: `defineRule({ id, from, check })`, lifecycle ordering, and `severityFor(rule, lifecycle)`; rule IDs must be stable strings from contracts/rule-ids.md
- [X] T013 Write failing `tests/registry/unit/validate-skeleton.test.ts`: `validateRegistry([])` passes with zero entities; the same input twice yields identical reports; `validateRegistry` performs no file or network access (assert by running with `fs`/`net` calls spied to throw)
- [X] T014 Implement `src/registry/validate.ts`: `validateRegistry(records, options?)` builds the `Map<canonicalId, record>` index once, runs every registered rule, returns `buildReport(...)`; options `{ now?, commit?, featureIndex?, assetIndex? }`
- [X] T015 Write failing `tests/registry/unit/synthetic.test.ts`: `generateRegistry(count, seed)` is deterministic (same seed → deep-equal output), differs across seeds, returns exactly `count` records spread over the families, and the result passes `validateRegistry` with zero errors
- [X] T016 Implement `tests/registry/support/synthetic.ts` (seeded PRNG, no dependency; extended by later stories as new record shapes appear)
- [X] T017 Create the mutation harness in `tests/registry/support/mutations.ts` (list and `runMutation`) with `tests/registry/mutations.test.ts` running it: `MUTATIONS: { name, rule, apply(records) }[]`; for each, apply to a fresh `generateRegistry(200, 1)`, assert the base has zero errors, assert the mutated registry reports the named rule ID, and assert the mutation actually changed the records (a no-op mutation fails, SC-003). Starts with an empty list; each story adds its entries

**Checkpoint**: `npm test` and `npm run typecheck` green; foundation ready.

---

## Phase 3: User Story 1 — Register an entity with a stable identity (P1) 🎯 MVP

**Goal**: every entity has an immutable, valid, unique ID; renaming a title or slug changes no ID and breaks no URL.

**Independent Test**: add a record, rename its title and slug, rebuild; the ID and every inbound reference are unchanged and the old URL redirects (`tests/registry/integration/rename.test.ts`).

### Tests for US1 (write first; confirm red)

- [X] T018 [P] [US1] `tests/registry/unit/ids.test.ts`: `ID-SYNTAX` for values violating `tc:{authority}:{family}:{local-id}` (authority `[a-z0-9][a-z0-9-]*`, family `[a-z][a-z0-9-]*`, local-id `[A-Za-z0-9][A-Za-z0-9._:-]*`); minted IDs must match `{family}-{6 digits}`; `ID-AUTHORITY` for an authority not in the allowlist; `ID-FAMILY` for a family outside the closed list; `ID-ORIGIN` for missing `origin` or a `legacy` ID that fails the legacy pattern; a valid new place gets a unique ID (US1.1, US1.4); the failure carries the offending value and the rule broken
- [X] T019 [P] [US1] `tests/registry/unit/duplicates.test.ts`: two records declaring the same canonical ID yield `ID-DUPLICATE` and the violation names both files (US1.3)
- [X] T020 [P] [US1] `tests/registry/unit/mint.test.ts`: `nextLocalId('place', existing)` returns the highest `place-NNNNNN` plus one, zero-padded to 6 digits (`place-000124`); other families and legacy IDs are ignored; an empty set yields `place-000001`; a collision between two branches' minted IDs is reported by `ID-DUPLICATE` (rule from ADR 0006 item 6 note)
- [X] T021 [P] [US1] `tests/registry/unit/redirects.test.ts` (FR-013): a former slug produces one 301 rule to the current URL (US1.2); `SLUG-UNIQUE` for two live records sharing a slug; `SLUG-HISTORY-COLLISION` when a former slug equals a live slug; a `superseded` record with `superseded_by` redirects to the successor; one without a successor yields a withdrawn-page descriptor, never a missing page (`LIFE-SUPERSEDED` is added in US5)
- [X] T022 [P] [US1] `tests/registry/integration/load.test.ts`: `loadRegistry(fixtureDir)` returns typed records; unparseable YAML yields `LOAD-PARSE`; a filename that differs from the local-id, or a file in the wrong family directory, yields `LOAD-PATH`; load errors appear in the report as violations (contracts/module-api.md)
- [X] T023 [P] [US1] `tests/registry/integration/cli.test.ts`: `registry check` exits `0` on the valid fixture, `1` on the duplicate-ID fixture (stdout names `ID-DUPLICATE`), `2` on an unreadable directory; `registry mint place` prints the next ID and exits `0`, and exits `2` for an unknown family; warnings never change the exit code (contracts/cli.md)
- [X] T024 [US1] `tests/registry/integration/rename.test.ts` (SC-002): for every record in `fixtures/valid`, rename title and slug, reload and validate; assert zero ID changes, zero new violations, and one redirect per former slug

### Fixtures for US1

- [X] T025 [P] [US1] Create `tests/registry/fixtures/valid/content/` with one minimal valid YAML file for `place`, `source` and `map` (filename = local-id) and `tests/registry/fixtures/invalid/{duplicate-id,bad-syntax,path-mismatch,unparseable}/` with the smallest file sets that trigger `ID-DUPLICATE`, `ID-SYNTAX`, `LOAD-PATH` and `LOAD-PARSE`

### Implementation for US1

- [X] T026 [P] [US1] `src/registry/ids.ts`: `parseStableId`, `formatStableId`, `isMinted`, `isLegacy`, using the exact patterns above; no title or slug input is accepted
- [X] T027 [US1] `src/registry/schemas/entity.ts`: base entity Zod schema per data-model.md "Entity": `id*`, `family*`, `origin*`, `title*`, `slug*`, `slug_history[]`, `lifecycle*`, `release*` (default `held`), `same_as[]`, `relations[]`, `superseded_by`, `private`, `legacy_confidence`, `legacy_review_state`; enumerated fields (`lifecycle`, `release`, `origin`) are declared as `z.string()` so the loader checks structure only and the rules check membership (module-api.md); also create `src/registry/schemas/references.ts` exporting `referenceFields(record): { field, id }[]` driven by data-model.md "Reference fields"
- [X] T028 [US1] `src/registry/rules/id.ts`: `ID-SYNTAX`, `ID-DUPLICATE` (names both files), `ID-AUTHORITY`, `ID-FAMILY`, `ID-ORIGIN`, all threshold `always`; register them with the framework
- [X] T029 [US1] `src/registry/load.ts`: `loadRegistry(rootDir)` globs `content/<family>/<local-id>.yaml`, parses with `yaml`, validates with the entity schema, emits `LOAD-PARSE` and `LOAD-PATH` as violations, returns `{ records, loadErrors }`
- [X] T030 [P] [US1] `src/registry/mint.ts`: `nextLocalId(family, existing)` pure; `mintNext(family, dir)` collects local-ids from the working tree and from `main` via `git ls-tree` (falls back to the working tree if git is unavailable), then calls `nextLocalId`
- [X] T031 [P] [US1] `src/registry/redirects.ts` and `src/registry/rules/slug.ts`: `redirects(records)` returns `{ rules, withdrawn }`; rules `SLUG-UNIQUE`, `SLUG-HISTORY-COLLISION` (threshold `always`)
- [X] T032 [US1] `src/registry/cli.ts`: commands `check [--dir content] [--out reports]` (writes `integrity-report.json`, prints a one-line summary and each error's rule ID, exit codes `0/1/2`) and `mint <family>` per contracts/cli.md
- [X] T033 [US1] Add mutation entries to `tests/registry/mutations.test.ts` for `ID-SYNTAX`, `ID-DUPLICATE`, `ID-AUTHORITY`, `ID-FAMILY`, `ID-ORIGIN`, `LOAD-PATH`, `SLUG-UNIQUE`, `SLUG-HISTORY-COLLISION`
- [X] T034 [US1] Run `npm test` and `npm run typecheck`; every US1 scenario (1–4) passes; confirm in the PR that each test was seen red first

**Checkpoint**: US1 is shippable alone: IDs, minting, load, redirects, CLI check.

---

## Phase 4: User Story 3 — One linked scholarly graph (P1)

**Goal**: any reference to something that does not exist, a collection default outside its members, or a wrong room set fails the build, and a passing build emits a machine-readable report.

**Independent Test**: an essay fixture referencing an unknown `map` ID fails with a violation naming the essay, the field and the missing ID.

### Tests for US3 (write first; confirm red)

- [X] T035 [P] [US3] `tests/registry/unit/references.test.ts`: `REF-UNKNOWN` for a `relations[]` entry that does not resolve; the violation names entity, field and missing ID (US3.1); a resolving reference passes Add one case per row of data-model.md "Reference fields" (`relations[]`, `superseded_by`, evidence `target.entity`/`source`/`provenance_chain[]`, attestation `place`/`source`, collection `members[]`/`default_layers[]`, map `makers[]`, layer `dataset`, essay `evidence[]`/`maps[]`/`places[]`/`sources[]`)
- [X] T036 [P] [US3] `tests/registry/unit/collections.test.ts`: `REF-COLLECTION-SUBSET` when `default_layers` is not a subset of `members` (US3.2); equal and strict-subset cases pass
- [X] T037 [P] [US3] `tests/registry/unit/rooms.test.ts`: `ROOM-SET` when any of the seven fixed rooms (`tc:tc:room:earth, map, city, border, road, archive, theatre`) is missing or an eighth exists
- [X] T038 [P] [US3] `tests/registry/integration/report.test.ts`: on the valid fixture the gate passes and writes `integrity-report.json` that validates against `contracts/integrity-report.schema.json` (via `ajv`) and an `integrity-report.html`; on the unknown-reference fixture the JSON lists the violation (US3.3)
- [X] T039 [P] [US3] `tests/registry/unit/report-html.test.ts`: the HTML uses a real `<table>` with header cells, shows severity as text (not colour alone), loads no external assets, and escapes entity values

### Fixtures for US3

- [X] T040 [P] [US3] Add the seven room files to `fixtures/valid/content/room/`, a `collection` and `layer` pair to `fixtures/valid`, and `fixtures/invalid/{unknown-map-ref,collection-not-subset,missing-room}/`

### Implementation for US3

- [X] T041 [P] [US3] (not needed: `EntityBase` is loose, so `members[]`, `default_layers[]` and the fixed room ids are read directly by their rules; per-family schemas arrive with spec 002 and the Astro collections) ~~`src/registry/schemas/collection.ts` and `room.ts`~~
- [X] T042 [US3] `src/registry/rules/references.ts`: `REF-UNKNOWN` over `referenceFields(record)` for every record, using the index (O(n + references), research R4)
- [X] T043 [P] [US3] `src/registry/rules/collections.ts`: `REF-COLLECTION-SUBSET`
- [X] T044 [P] [US3] `src/registry/rules/rooms.ts`: `ROOM-SET`
- [X] T045 [P] [US3] `src/registry/report-html.ts`: `renderHtml(report)` per T039
- [X] T046 [US3] Extend `src/registry/cli.ts` `check` to write `integrity-report.html` beside the JSON
- [X] T047 [US3] Add mutation entries for `REF-UNKNOWN`, `REF-COLLECTION-SUBSET`, `ROOM-SET`; extend `synthetic.ts` to include rooms, layers and collections Add one `REF-UNKNOWN` mutation per row of data-model.md "Reference fields" so removing the target of each field kind is caught
- [X] T048 [US3] Run `npm test` and `npm run typecheck`; US3 scenarios 1–3 pass

**Checkpoint**: US1 + US3 give a working linked-graph gate with reports.

---

## Phase 5: User Story 2 — Record evidence and uncertainty as data (P1)

**Goal**: every claim exposes source, locator, evidence type, date precision, geometry provenance, confidence, reconstruction state, rights and last-verified date; invalid values fail.

**Independent Test**: a fixture with one source-geometry feature and one reconstructed feature shows distinguishable provenance, and an invalid enumeration value fails validation.

### Tests for US2 (write first; confirm red)

- [X] T049 [P] [US2] `tests/registry/unit/provenance.test.ts`: `PROV-GEOMETRY` (geometry provenance required for feature targets from `ready_for_build`), `PROV-RECONSTRUCTION` (`scholarly_reconstruction` requires `reconstruction: true`, accepted when present, US2.1), `PROV-SOURCE` (source and evidence type required) Add `PROV-MODERN-AS-EVIDENCE`: an evidence record with geometry provenance `modern_reference` fails; a layer with role `historical`, `evidence` or `map-overlay` and provenance `modern_reference` fails; the same provenance on a `context` layer passes (Constitution III)
- [X] T050 [P] [US2] `tests/registry/unit/locators.test.ts`: `LOC-VERIFIED-FIELDS` ("`verified` requires all three of `verified_by`, `verified_on`, `consulted_copy`", US2.2); `LOC-AI-VERIFIED` (AI-proposed locator cannot be `verified` without a person); `LOC-SECURE-PENDING` ("`secure` forbidden if any supporting locator is `pending`", US2.5); `REF-FINDING-AID` (source that is a finding aid) `LOC-AI-VERIFIED` is driven by `proposed_by = ai` with `state = verified` and no distinct `verified_by` person
- [X] T051 [P] [US2] `tests/registry/unit/silence.test.ts`: a silence Attestation needs exactly one silence state (`SIL-STATE`, US2.4); a silence state on any other form or family is `SIL-MISPLACED`; `confidence = secure` without `source_coverage_verified: true` is `SIL-SECURE`
- [X] T052 [P] [US2] `tests/registry/unit/rights.test.ts`: `RIGHTS-MISSING` is a warning below `ready_for_build` and an error from it, so a `publishable` record without rights fails (US2.3); `RIGHTS-CLEARED` is a warning below `publishable` and an error from it; out-of-copyright text and reproduction rights are checked separately
- [X] T053 [P] [US2] `tests/registry/unit/automated.test.ts` (FR-008): `AUTO-UNADJUDICATED` for a `publishable` record whose `provenance_chain` has a step with status `proposed`; `AUTO-LOG` for a step missing tool, version, input or date; `AUTO-ARTEFACT-HASH` for a large artefact reference without `sha256`; an adjudicated step needs `adjudicated_by` and `adjudicated_on`
- [X] T054 [P] [US2] `tests/registry/unit/import-mapping.test.ts` (FR-014): `IMPORT-FAMILY` (`port` imports only as `place` with a port place type; `project` is rejected); `IMPORT-CONFIDENCE` (`high→probable`, `medium→possible`, `low→conjectural`, never `secure`, `legacy_confidence` kept); `IMPORT-REVIEW` (imports start at `researching`, `legacy_review_state` kept); `IMPORT-REVIEWER` (`verified_by`/`verified_on` from legacy only when `editor_confirmed`) Add `IMPORT-LAYER-LIFECYCLE`: `planned→proposed`, `in-preparation→in_build`, `in-review→qa`, `published→published` (stays `held`), original kept as `legacy_layer_status`, unknown legacy terms fail; non-layer imports still start at `researching`
- [X] T055 [P] [US2] `tests/registry/unit/enums.test.ts`: `ENUM-INVALID` for any enumerated field with an unknown value; `DATE-ORDER` when `valid_from > valid_to` (signed integer years, negative for BCE accepted); `SAMEAS-SYNTAX` for a non-allowlisted authority or malformed ID in `same_as[]` (the `lifecycle: nonsense` case moves to T074 with `LIFE-VALUE`;) an unknown `portal_dimensions` entry yields `ENUM-INVALID`; an absent `portal_dimensions` passes
- [X] T056 [US2] `tests/registry/integration/geometry-index.test.ts`: `loadRegistry` builds a `featureIndex` from GeoJSON files referenced by path; `REF-FEATURE` when an evidence `target.feature` is absent from the referenced file

### Fixtures for US2

- [X] T057 [P] [US2] Add to `fixtures/valid`: an `evidence` record for a source-geometry feature and one for a reconstructed feature, a silence `attestation`, a small GeoJSON file, and a `provenance/` step; add `fixtures/invalid/{bad-enum,verified-missing-fields,secure-pending,unadjudicated,missing-rights}/`

### Implementation for US2

- [X] T058a [P] [US2] `src/registry/schemas/families.ts`: Zod shapes for map, cartographer, place, source, dataset, layer, route, event, period and bibliography_entry exactly per data-model.md "Family fields" (required: map `makers[]`; place `place_type`; source `is_finding_aid` default `false`; dataset `version`; layer `role`, `asset`, `dataset`; bibliography_entry `csl`); T063, T065, T067 and T080 read these fields
- [X] T058 [P] [US2] `src/registry/schemas/evidence.ts` per data-model.md "Evidence record": `target*` (`{ entity, feature? }`), `source*`, `locator` (`{ value*, state*, proposed_by*, verified_by?, verified_on?, consulted_copy? }`), `evidence_type*`, `valid_from`/`valid_to` (signed integer years), `date_precision`, `date_label`, `geometry_provenance`, `reconstruction`, `confidence*`, `rights`, `last_verified`, `provenance_chain[]`
- [X] T059 [P] [US2] `src/registry/schemas/attestation.ts`: `place*`, `source*`, `form*` (`name, depiction, silence`), `silence_state`, `source_coverage_verified`
- [X] T060 [P] [US2] `src/registry/schemas/provenance-step.ts`: `id*, tool*, tool_version*, input*, ran_on*, parameters, artefact { url | shelfmark, sha256 }, status*, adjudicated_by, adjudicated_on`
- [X] T061 [P] [US2] `src/registry/schemas/import.ts`: legacy ID pattern `^tc:[a-z0-9][a-z0-9-]*:[a-z][a-z0-9-]*:[A-Za-z0-9][A-Za-z0-9._:-]*$`, `editor_confirmed`, confidence and review-state mapping tables Include the layer lifecycle mapping table (`planned`, `in-preparation`, `in-review`, `published`) and the `legacy_layer_status` field
- [X] T062 [P] [US2] `src/registry/rules/provenance.ts`: `PROV-GEOMETRY`, `PROV-RECONSTRUCTION`, `PROV-SOURCE` (threshold `ready_for_build`) Also implement `PROV-MODERN-AS-EVIDENCE` (always) reading the layer `role` and `geometry_provenance`
- [X] T063 [P] [US2] `src/registry/rules/locators.ts`: `LOC-VERIFIED-FIELDS`, `LOC-SECURE-PENDING`, `LOC-AI-VERIFIED` (always), `REF-FINDING-AID` (`ready_for_build`)
- [X] T064 [P] [US2] `src/registry/rules/silence.ts`: `SIL-STATE`, `SIL-MISPLACED`, `SIL-SECURE`
- [X] T065 [P] [US2] `src/registry/rules/rights.ts`: `RIGHTS-MISSING`, `RIGHTS-CLEARED` (`publishable`)
- [X] T066 [P] [US2] `src/registry/rules/automated.ts`: `AUTO-UNADJUDICATED` (`publishable`), `AUTO-LOG`, `AUTO-ARTEFACT-HASH` (`ready_for_build`)
- [X] T067 [P] [US2] `src/registry/rules/import.ts`: `IMPORT-FAMILY`, `IMPORT-CONFIDENCE`, `IMPORT-REVIEW`, `IMPORT-REVIEWER` Also implement `IMPORT-LAYER-LIFECYCLE`; `IMPORT-FAMILY` reads the place `place_type`
- [X] T068 [P] [US2] `src/registry/rules/enums.ts`: `ENUM-INVALID` (membership of every enumerated field, including `portal_dimensions`, against the exported value lists), `DATE-ORDER`, `SAMEAS-SYNTAX` (and `REF-FEATURE` lives in `rules/geometry.ts`)
- [X] T069 [US2] Extend `src/registry/load.ts`: read `provenance/`, build `featureIndex` from referenced GeoJSON paths, pass both to `validateRegistry`
- [X] T070 [US2] Update `specs/001-scholarly-registry/contracts/module-api.md` so `validateRegistry` options document `featureIndex` (and, in US5, `assetIndex`), keeping `validateRegistry` pure
- [X] T071 [US2] Add mutation entries for every rule introduced in this phase (`PROV-*`, `LOC-*`, `SIL-*`, `RIGHTS-*`, `AUTO-*`, `IMPORT-*`, `ENUM-INVALID`, `DATE-ORDER`, `SAMEAS-SYNTAX` (and `REF-FEATURE` lives in `rules/geometry.ts`), `REF-FINDING-AID`); extend `synthetic.ts` with evidence, attestation and provenance records Also add mutations for `PROV-MODERN-AS-EVIDENCE` and `IMPORT-LAYER-LIFECYCLE`
- [X] T072 [US2] Run `npm test` and `npm run typecheck`; US2 scenarios 1–5 pass

**Checkpoint**: evidence and uncertainty are data; invalid values fail.

---

## Phase 6: User Story 5 — Shared lifecycle and publication authority (P2)

**Goal**: one lifecycle plus a `held | released` flag; only `published` and `released` entities reach public output; private data never leaks.

**Independent Test**: a fixture with one entity per lifecycle value, half released, yields public output containing exactly the `published` + `released` ones.

### Preparation

- [X] T073 [US5] Close two gaps found while tasking: confirm the essay `stage` and `design_qa_passed` fields in data-model.md "Essay" and the derivation table of ADR 0003 §2; add `assetIndex` to the `validateRegistry` options in contracts/module-api.md
- [X] T073a [US5] `src/registry/schemas/essay.ts`: essay shape per data-model.md "Essay": `stage*` (nine stages), `design_qa_passed`, optional `portal_dimensions[]` (FR-012), and reference fields `evidence[]`, `maps[]`, `places[]`, `sources[]`; T074 and T079 depend on it

### Tests for US5 (write first; confirm red)

- [X] T074 [P] [US5] `tests/registry/unit/lifecycle.test.ts`: `LIFE-VALUE` for unknown values; `LIFE-ESSAY-DERIVED` when an essay at stage Draft is not `verified` or sets lifecycle by hand (US5.4), covering every row of the stage→lifecycle table; `LIFE-AVAILABILITY` for a `published` layer whose `asset` path has no entry in `assetIndex` (US5.5); `LIFE-SUPERSEDED` for `superseded` with neither a resolving `superseded_by` nor a withdrawn marker
- [X] T075 [P] [US5] `tests/registry/unit/release.test.ts`: `REL-VALUE` for anything but `held | released`; a record with no release field defaults to `held`
- [X] T076 [P] [US5] `tests/registry/unit/strictness.test.ts` (US5.3): a record at `researching` missing provenance and rights passes with warnings; the same record at `ready_for_build` errors on provenance and at `publishable` errors on the full rule set; ID, family, lifecycle value and references error at every state; `blocked` and `superseded` severity follows the T011 assumption Rights: missing rights is a warning at `researching` and an error at `ready_for_build`; rights not cleared is a warning at `ready_for_build` and an error at `publishable`
- [X] T077 [P] [US5] `tests/registry/integration/projection.test.ts`: `projectPublic` returns exactly the `published` + `released` entities (US5.1, US5.2 and the independent test); a `published` entity left `held` is absent; a `released` entity at any other lifecycle is absent; fields outside the per-family allowlist, including the `private` block, never appear; a newly added field is excluded until allowlisted
- [X] T078 [P] [US5] `tests/registry/integration/leak-scan.test.ts` (FR-009): in a temp `dist/`, a private value or a held ID inside an HTML or JSON file yields `PRIV-LEAK`; a clean output passes; `registry scan` exits `1` on a leak and `0` when clean

### Implementation for US5

- [X] T079 [P] [US5] `src/registry/stages.ts`: essay stage enum and the stage→lifecycle derivation (Concept→proposed; Corpus, Research→researching; Outline, Draft→verified; Build→in_build; Design QA→qa, or publishable once all Design QA checks pass; Publish, Cross-link→published)
- [X] T080 [P] [US5] `src/registry/rules/lifecycle.ts`: `LIFE-VALUE`, `LIFE-ESSAY-DERIVED`, `LIFE-AVAILABILITY` (threshold `published`), `LIFE-SUPERSEDED`
- [X] T081 [P] [US5] `REL-VALUE` (lives in `src/registry/rules/lifecycle.ts`, with the other lifecycle rules)
- [X] T082 [US5] `src/registry/project.ts`: per-family allowlists as Zod `pick` shapes and `projectPublic(records)` that keeps only lifecycle `published` and release `released`
- [X] T083 [P] [US5] `src/registry/leak-scan.ts`: `scanOutput(distDir, records)` builds a manifest of private values and held IDs and searches text and JSON files in `dist/`; emits `PRIV-LEAK`
- [X] T084 [US5] Extend `src/registry/cli.ts` with `scan <distDir> [--dir content]` (exit `0` clean, `1` leak)
- [X] T085 [US5] Add mutation entries for `LIFE-VALUE`, `LIFE-ESSAY-DERIVED`, `LIFE-AVAILABILITY`, `LIFE-SUPERSEDED`, `REL-VALUE`; `PRIV-LEAK` is exercised by T078 because it is a scan, not a registry rule
- [X] T086 [US5] Run `npm test` and `npm run typecheck`; US5 scenarios 1–5 pass

**Checkpoint**: lifecycle, release, projection and leak scan are in place; reverse relationships can now filter correctly.

---

## Phase 7: User Story 4 — Reverse relationships ("Cited in", "Used by") (P2)

**Goal**: map, source and place pages can list every released essay, layer and object that references them.

**Independent Test**: two essays reference one map; the map's reverse list contains both; a held essay is not listed.

- [ ] T087 [US4] Write failing `tests/registry/unit/reverse.test.ts`: `reverseRelationships(records)` returns, for each referenced ID, the referrers that are `published` and `released` (FR-007); a held referrer and a `published` but `held` referrer are excluded; an entity referenced only by a held essay has an empty list yet the reference stays valid (spec edge case); results are sorted by ID for determinism
- [ ] T088 [US4] Implement `src/registry/reverse.ts` as one pass over declared references using the index (research R4)
- [ ] T089 [US4] Run `npm test` and `npm run typecheck`; US4 independent test passes

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T090 Write `tests/registry/performance.test.ts` (SC-004): `generateRegistry(5000, 1)` validates in under 60 seconds; implement `registry synth <count> --seed <n>` in `src/registry/cli.ts` and `scripts/generate-synthetic-registry.ts`
- [ ] T091 Write `tests/registry/unit/rule-coverage.test.ts`: every rule ID registered in `src/registry/rules/` appears in `contracts/rule-ids.md` and has a mutation in `mutations.test.ts` (exempting `PRIV-LEAK`, covered by T078); fails when a rule is added without both
- [ ] T092 Run every command in `quickstart.md` end to end and fix any drift between the document and the code
- [ ] T093 [P] Add a short "Registry" section to `README.md` linking to `specs/001-scholarly-registry/quickstart.md`
- [ ] T094 Copy each story's task checklist (T-IDs) into the matching TCX story description under epic TCX-2; move stories to Done only when the PR is linked and the Definition of Done in `CLAUDE.md` holds (manual; no `/speckit-taskstoissues`)
- [ ] T095 Make the `registry` workflow a required status check on `main` so a failing gate blocks merge (SC-001) (manual repository setting)
- [ ] T096 Run `/speckit-analyze` and resolve any findings before `/speckit-implement`

---

## Dependencies & Execution Order

- **Setup (T001–T005)** → **Foundational (T006–T017)** → user stories. Foundational blocks everything.
- **Stories in order**: US1 → US3 → US2 → US5 → US4. US3 needs US1's load and index; US2 needs US3's reference resolution; US5 needs US2's rights and provenance rules for its strictness tests; US4 needs US5's release filtering.
- **Within a story**: tests (red) → fixtures → schemas → rules → CLI wiring → mutations → green run.
- **Cross-story files**: `cli.ts` (T032, T046, T084, T090), `load.ts` (T029, T069), `synthetic.ts` (T016, T047, T071) and `mutations.test.ts` (T017, T033, T047, T071, T085) are shared, so those edits run sequentially across stories.

### Parallel opportunities

- Setup: T004, T005 together.
- Foundational: T006, T007, T008 together.
- US1 tests: T018–T023 together (T024 after fixtures T025); impl T026, T030, T031 together.
- US3 tests: T035–T039 together; impl T041, T043, T044, T045 together.
- US2: tests T049–T055 together; schemas T058–T061 together; rules T062–T068 together (largest parallel block).
- US5: tests T074–T078 together; impl T079, T080, T081, T083 together.

## Implementation Strategy

- **MVP = US1** (stable identity, load, mint, redirects, CLI check). Stop and validate: rename test and CLI exit codes pass.
- **Increment 2 = US3**: the linked-graph gate and reports; this is the first version CI can enforce on real content.
- **Increment 3 = US2**: evidence and uncertainty; unlocks the legacy import in spec 008.
- **Increment 4 = US5 then US4**: release state, projection and leak scan, then reverse relationships.
- One user story per PR, one Jira story each, each ending green on its own acceptance scenarios (Definition of Done).
