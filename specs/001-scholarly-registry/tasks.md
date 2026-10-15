---
description: "Task list for 001 — Scholarly Entity Registry & Integrity Gate"
---

# Tasks: Scholarly Entity Registry & Integrity Gate

**Input**: Design documents from `/specs/001-scholarly-registry/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: REQUIRED. Constitution Principle X makes test-first non-negotiable. Within each story, every test task precedes the implementation task that makes it pass. Work in vertical slices with the `tdd` skill: write one test, make it pass, then write the next. Never write a phase's tests in bulk.

**Seams**: the test seams in plan.md ("Proposed test seams") MUST be confirmed with the user before T010. Tests are written only at confirmed seams.

**Organization**: Tasks are grouped by user story. Phase order follows plan.md "Delivery slices": US1 → US3 → US2 (all P1), then US5 → US4 (P2). US3 comes before US2 because evidence rules need resolvable `source` references.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: user story from spec.md
- Paths are relative to the repository root (single Astro project, per plan.md)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Make the repository a buildable, testable TypeScript/Astro project.

- [ ] T001 Initialise the Astro project at the repository root with TypeScript `strict`; pin Node LTS in `.nvmrc`; pin exact versions of `astro`, `typescript`, `zod` (v4), `yaml` and `vitest` in `package.json`
- [ ] T002 [P] Add npm scripts in `package.json`: `test`, `test:bench`, `registry:check` (runs `scripts/registry-check.ts`), `build`, `check`
- [ ] T003 [P] Configure Vitest in `vitest.config.ts` with `tests/` as root and a separate `bench` project for `tests/registry/bench/`
- [ ] T004 [P] Add CI workflow `.github/workflows/ci.yml` running `npm ci`, `npm run check`, `npm test`, `npm run registry:check` and `npm run build` on every push and PR; `reports/` uploaded as an artifact
- [ ] T005 [P] Create empty directories with `.gitkeep`: `data/registry/`, `data/vocab-mappings/`, `tests/registry/fixtures/valid/`, `tests/registry/fixtures/invalid/`, `reports/` (add `reports/` to `.gitignore`)

**Checkpoint**: `npm test` runs (zero tests), and CI is green on an empty project.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared vocabularies and record loading, needed by every story.

**⚠️ CRITICAL**: No user-story work begins until this phase is complete.

- [ ] T006 Write failing tests in `tests/registry/vocab.test.ts` asserting each shared enum has exactly the ADR 0003 values: lifecycle `proposed · researching · verified · ready_for_build · in_build · qa · publishable · published · superseded · blocked`; confidence `secure · probable · possible · conjectural · unknown`; geometry provenance `source_geometry · georeferenced_trace · scholarly_reconstruction · generalized_editorial · modern_reference`; silence `non_survival · non_survey · non_request · alternative_naming · outside_frame · source_not_applicable · meaningful_silence`; families (14, per data-model.md); essay stages (9); rooms (Earth, Map, City, Border, Road, Archive, Theatre)
- [ ] T007 Implement `src/registry/vocab.ts` as the single definition of every enum in T006 (make T006 pass)
- [ ] T008 Write failing tests in `tests/registry/load.test.ts`: loads every `*.yaml` under a given directory into `{ record, file }` pairs; reports YAML parse errors with file path and line; rejects non-object documents
- [ ] T009 Implement `src/registry/load.ts` (make T008 pass)

**Checkpoint**: Vocabularies and loading are in place. Confirm the test seams with the user now.

---

## Phase 3: User Story 1 — Register an entity with a stable identity (P1) 🎯 MVP

**Goal**: Every record carries a valid, unique, immutable ID; the gate runs as a CLI and writes a report.

**Independent Test**: Add a record, rename its title and slug, run `npm run registry:check`: same ID, exit 0. A duplicate or malformed ID exits 1, naming the files and the rule.

- [ ] T010 [P] [US1] Write failing tests in `tests/registry/ids.test.ts` for `parseRef`/`qualify`: local id matches `[a-z0-9][a-z0-9._-]{0,127}`; authority matches `[a-z][a-z0-9]{1,15}` and defaults to `tc`; `map:x` → (tc, map, x); `cnd:attestation:x` → (cnd, attestation, x); qualified form `tc:{authority}:{family}:{local-id}`; unknown family rejected
- [ ] T011 [P] [US1] Implement `src/registry/ids.ts` (make T010 pass)
- [ ] T012 [US1] Write failing tests in `tests/registry/schemas.test.ts › envelope`: required `id`, `family`, `title`; `slug` required for routable families; `previous_slugs` optional string[]; unknown top-level keys rejected; `private` accepted as an opaque object
- [ ] T013 [US1] Implement the envelope schema in `src/registry/schemas/envelope.ts` (make T012 pass)
- [ ] T014 [US1] Write failing test `tests/registry/integrity.test.ts › ID_SYNTAX` using fixture `tests/registry/fixtures/invalid/ID_SYNTAX/`: violation reports the offending value, the rule broken and the file
- [ ] T015 [US1] Write failing test `integrity › ID_DUPLICATE` using fixture `invalid/ID_DUPLICATE/` (same authority, family and id in two files): one violation whose `files` lists both
- [ ] T016 [US1] Implement `validateRegistry(records)` in `src/registry/integrity.ts` with ID_SYNTAX and ID_DUPLICATE (make T014–T015 pass)
- [ ] T017 [P] [US1] Write failing test `tests/registry/report.test.ts`: the JSON report validates against `specs/001-scholarly-registry/contracts/integrity-report.schema.json`; the Markdown report lists violations grouped by code; output is deterministic apart from `run_id` and `generated_at`
- [ ] T018 [P] [US1] Implement `src/registry/report.ts` (make T017 pass)
- [ ] T019 [US1] Write failing test `tests/registry/cli.test.ts`: exit 0 on `fixtures/valid`, 1 on any invalid fixture, 2 on an unreadable `--data` path; writes `integrity-report.json` and `.md` to `--report`
- [ ] T020 [US1] Implement `scripts/registry-check.ts` with `--data`, `--assets` and `--report` flags per `contracts/relations-and-cli.md` (make T019 pass)

**Checkpoint**: US1 is independently demonstrable from the CLI.

---

## Phase 4: User Story 3 — One linked scholarly graph (P1)

**Goal**: Every reference resolves; the build fails before page generation when one does not.

**Independent Test**: An essay fixture referencing an unknown `map` ID makes `npm run build` fail, naming the essay, the field and the missing ID.

- [ ] T021 [P] [US3] Write failing tests in `tests/registry/schemas.test.ts › families`: one Zod schema per family with its typed reference fields per data-model.md "Family-specific fields"; collections require `layer_ids[]` and `default_layer_ids[]`
- [ ] T022 [P] [US3] Implement per-family schemas in `src/registry/schemas/<family>.ts` and an index `src/registry/schemas/index.ts` (make T021 pass)
- [ ] T023 [US3] Write failing tests `integrity › REF_UNKNOWN` and `› REF_FAMILY` (fixtures `invalid/REF_UNKNOWN/`, `invalid/REF_FAMILY/`): violation names the entity, field path and missing or mismatched ID
- [ ] T024 [US3] Write failing test `integrity › COLLECTION_DEFAULTS`: fails when `default_layer_ids ⊄ layer_ids` or members are duplicated
- [ ] T025 [US3] Extend `src/registry/integrity.ts` with reference resolution across all families, REF_UNKNOWN, REF_FAMILY and COLLECTION_DEFAULTS (make T023–T024 pass)
- [ ] T026 [US3] Write failing test `tests/registry/build-hook.test.ts`: the Astro integration aborts the build before page generation when the gate fails, printing the report path
- [ ] T027 [US3] Implement `src/integrations/registry-gate.ts` and register it in `astro.config.mjs`; bind content collections to registry schemas in `src/content.config.ts` (make T026 pass)
- [ ] T028 [US3] Build the valid fixture `tests/registry/fixtures/valid/` with at least one record per family and every reference type resolving; the CLI test from T019 exits 0 on it

**Checkpoint**: US1 and US3 work together; broken links cannot reach `main`.

---

## Phase 5: User Story 2 — Record evidence and uncertainty as data (P1)

**Goal**: Provenance, precision, confidence, silence, rights and extraction are structured and enforced.

**Independent Test**: A fixture with one `source_geometry` feature and one `scholarly_reconstruction` feature validates with distinguishable provenance; an invalid enum value fails.

- [ ] T029 [P] [US2] Write failing tests `schemas › evidence`: fields and enums exactly as data-model.md "Evidence"; `date_precision` ∈ `day · month · year · decade · century · range · unknown`; `evidence_type` ∈ `textual · cartographic · archaeological · archival · epigraphic · other`; negative years accepted in `valid_from`/`valid_to`; evidence also validates inside GeoJSON `properties.evidence` (US2-AS1, US2-AS4)
- [ ] T030 [P] [US2] Write failing tests `schemas › rights` (`licence`, `attribution`, `text_copyright_status`, `reproduction_cleared: boolean`, kept separate) and `schemas › extraction` (`method: manual | ocr | htr | llm`; non-manual requires `raw_evidence_ref`, `transformation_log_ref`)
- [ ] T031 [US2] Implement `src/registry/schemas/evidence.ts`, `rights.ts` and `extraction.ts` (make T029–T030 pass)
- [ ] T032 [US2] Write failing tests `integrity › LOCATOR_VERIFICATION_INCOMPLETE` ("`verified` requires `verified_by`, `verified_on`, `consulted_copy`") and `› LOCATOR_UNVERIFIED_SECURE` ("`confidence = secure` ⇒ every locator in that evidence is `verified`") (US2-AS2, US2-AS5)
- [ ] T033 [US2] Write failing tests `integrity › PROVENANCE_MISSING` (rights required when lifecycle ≥ `publishable`, US2-AS3), `› FINDING_AID_AS_SOURCE` and `› EXTRACTION_UNADJUDICATED` (non-manual extraction past `verified` without `adjudicated_by`/`adjudicated_on`, FR-008)
- [ ] T034 [US2] Implement the five rules from T032–T033 in `src/registry/integrity.ts` (make T032–T033 pass)
- [ ] T035 [US2] Add one invalid fixture per new code under `tests/registry/fixtures/invalid/` and extend `fixtures/valid/` with a source-geometry and a reconstructed feature

**Checkpoint**: All P1 stories complete. This is the MVP of the gate.

---

## Phase 6: User Story 5 — Shared lifecycle and publication authority (P2)

**Goal**: One lifecycle; essays derive theirs from stage; supersession and specialist vocabularies are handled.

**Independent Test**: An essay at stage `Draft` reports lifecycle `verified`; an essay that declares `lifecycle` fails; a `superseded` record without `superseded_by` fails.

- [ ] T036 [P] [US5] Write failing tests in `tests/registry/lifecycle.test.ts` for `lifecycleForStage`: Concept→proposed; Corpus, Research→researching; Outline, Draft→verified; Build→in_build; Design QA→qa; Publish, Cross-link→published
- [ ] T037 [P] [US5] Implement `src/registry/lifecycle.ts` (make T036 pass)
- [ ] T038 [US5] Write failing tests `integrity › ESSAY_LIFECYCLE_DECLARED`, `› SUPERSEDED_WITHOUT_SUCCESSOR` and `› ENUM_INVALID` (including an unmapped specialist term)
- [ ] T039 [US5] Write failing test `tests/registry/vocab-mappings.test.ts`: `data/vocab-mappings/<authority>.yaml` maps specialist terms to shared ones; boundary import mapping `planned→proposed`, `in-preparation→in_build`, `in-review→qa` (FR-011)
- [ ] T040 [US5] Implement the three rules and specialist-mapping resolution in `src/registry/integrity.ts` and `src/registry/load.ts` (make T038–T039 pass)
- [ ] T041 [US5] Write failing test `integrity › ASSET_MISSING`: a `published` layer whose asset path does not exist under `--assets` fails; non-published layers without assets pass
- [ ] T042 [US5] Implement availability derivation and ASSET_MISSING (make T041 pass)
- [ ] T043 [P] [US5] Add optional `dimensions[]` to the essay schema (`Measure · Witness · Use · Cosmos · Power · Silence`) with a passing/failing pair in `schemas.test.ts` (FR-012)

**Checkpoint**: Lifecycle is consistent everywhere.

---

## Phase 7: User Story 4 — Reverse relationships (P2)

**Goal**: "Cited in" and "Used by" are derived for every entity; public output contains only released content and no private data.

**Independent Test**: Two essays reference one map, one released and one held. Public `relations.json` lists only the released essay.

- [ ] T044 [P] [US4] Write failing tests in `tests/registry/relations.test.ts` for `buildRelations(records, { releasedOnly })`: output shape per `contracts/relations-and-cli.md`; held sources excluded when `releasedOnly`; a target referenced only by held content has empty arrays
- [ ] T045 [P] [US4] Implement `src/registry/relations.ts` (make T044 pass)
- [ ] T046 [P] [US4] Write failing tests in `tests/registry/public.test.ts` for `toPublic(entity)`: drops `private`; throws on non-released entities; adds `qualified_id`
- [ ] T047 [P] [US4] Implement `src/registry/public.ts` (make T046 pass)
- [ ] T048 [US4] Write failing tests in `tests/registry/redirects.test.ts` for `redirectsFor(records)`: one `301` line per previous slug to the current slug; superseded entities point to their successor's tombstone
- [ ] T049 [US4] Implement `src/registry/redirects.ts` and emit `dist/_redirects` and `dist/data/relations.json` from the Astro integration (make T048 pass)
- [ ] T050 [US4] Write `tests/registry/rename.regression.test.ts` (SC-002): rewrite every title and slug in a fixture copy; assert IDs, references and resolved links are unchanged and a redirect exists for every old slug (US1-AS2)
- [ ] T051 [US4] Write `tests/registry/leak-scan.test.ts` (FR-009): build the fixture site; zero occurrences of held titles or `private:` fixture values anywhere in `dist/`

**Checkpoint**: All five stories complete and independently tested.

---

## Phase 8: Polish & Cross-Cutting

- [ ] T052 [P] Implement `scripts/gen-synthetic-registry.ts`: a deterministic (seeded) 5,000-entity registry across all 14 families with realistic cross-references
- [ ] T053 Write `tests/registry/mutation.test.ts` (SC-003): seed one broken reference per family into the synthetic registry; assert 100% detection
- [ ] T054 Write `tests/registry/bench/registry.bench.ts` (SC-004): the gate validates the 5,000-entity registry in under 60 s (fail CI above that; target under 10 s locally)
- [ ] T055 [P] Generate `schemas/registry.schema.json` from the Zod source during the build, for R pipelines and contributors (contracts/record-file.md)
- [ ] T056 [P] Add an `R/` usage note to `docs/registry.md`: how an R pipeline writes records and calls `npm run registry:check -- --data <dir>` before committing
- [ ] T057 Walk through `specs/001-scholarly-registry/quickstart.md` steps 1–6 end to end and record the results in the PR description
- [ ] T058 Run the `code-review` skill against `main` (Standards + Spec axes) and resolve findings

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 → US1 (Phase 3) → US3 (Phase 4) → US2 (Phase 5) → US5 (Phase 6) → US4 (Phase 7) → Polish (Phase 8).
- US3 depends on US1 (IDs, gate, CLI). US2 depends on US3 (source references must resolve). US5 depends on US1. US4 depends on US3 (references) and US5 (`released` derives from lifecycle).
- Within each story: a test task always precedes its implementation task.

### Parallel opportunities
- Setup: T002–T005 together after T001.
- US1: T010/T011 (ids) alongside T017/T018 (report).
- US3: T021/T022 (family schemas) while T023–T024 are drafted.
- US2: T029 and T030 together.
- US5: T036/T037 and T043 alongside the integrity rules.
- US4: relations (T044/T045) and public projection (T046/T047) in parallel.
- Polish: T052, T055, T056 together.

## Implementation Strategy

1. **MVP = Phases 1–5** (all P1 stories): the gate rejects bad IDs, broken references and unsupported evidence. Merge to `main` behind green CI.
2. **Increment 2 = US5**: lifecycle, ready for specs 003 and 005.
3. **Increment 3 = US4**: relations, public projection and redirects, ready for any reader-facing page.
4. **Polish**: scale proofs and review; then mark TCX-2 Done.

### Jira mapping
TCX-13 (US1) · TCX-15 (US3) · TCX-14 (US2) · TCX-17 (US5) · TCX-16 (US4). Each story's task IDs go into its Jira description as a checklist; Polish tasks go on epic TCX-2.
