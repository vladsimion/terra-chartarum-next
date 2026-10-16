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

- [x] T001 Initialise the Astro project at the repository root with TypeScript `strict`; pin Node LTS in `.nvmrc`; pin exact versions of `astro`, `typescript`, `zod` (v4), `yaml`, an EDTF parser and `vitest` in `package.json`
- [x] T002 [P] Add npm scripts in `package.json`: `test`, `test:bench`, `registry:check` (runs `scripts/registry-check.ts`), `build`, `check`
- [x] T003 [P] Configure Vitest in `vitest.config.ts` with `tests/` as root and a separate `bench` project for `tests/registry/bench/`
- [x] T004 [P] Add CI workflow `.github/workflows/ci.yml` running `npm ci`, `npm run check`, `npm test`, `npm run registry:check` and `npm run build` on every push and PR; `reports/` uploaded as an artifact
- [x] T005 [P] Create empty directories with `.gitkeep`: `data/registry/`, `data/vocab-mappings/`, `tests/registry/fixtures/valid/`, `tests/registry/fixtures/invalid/`, `reports/` (add `reports/` to `.gitignore`)

**Checkpoint**: `npm test` runs (zero tests), and CI is green on an empty project.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared vocabularies and record loading, needed by every story.

**⚠️ CRITICAL**: No user-story work begins until this phase is complete.

- [x] T006 Write failing tests in `tests/registry/vocab.test.ts` asserting each shared enum has exactly the ADR 0003 values: lifecycle `proposed · researching · verified · ready_for_build · in_build · qa · publishable · published · superseded · blocked`; confidence `secure · probable · possible · conjectural · unknown`; geometry provenance `source_geometry · georeferenced_trace · scholarly_reconstruction · generalized_editorial · modern_reference`; silence `non_survival · non_survey · non_request · alternative_naming · outside_frame · source_not_applicable · meaningful_silence`; families (14, per data-model.md: … `room`, `bibliography`); essay stages (9); rooms (Earth, Map, City, Border, Road, Archive, Theatre)
- [x] T007 Implement `src/registry/vocab.ts` as the single definition of every enum in T006 (make T006 pass)
- [x] T008 Write failing tests in `tests/registry/load.test.ts`: loads every `*.yaml` under a given directory into `{ record, file }` pairs; reports YAML parse errors with file path and line; rejects non-object documents
- [x] T009 Implement `src/registry/load.ts` (make T008 pass)

**Checkpoint**: Vocabularies and loading are in place. Confirm the test seams with the user now.

---

## Phase 3: User Story 1 — Register an entity with a stable identity (P1) 🎯 MVP

**Goal**: Every record carries a valid, unique, immutable ID; the gate runs as a CLI and writes a report.

**Independent Test**: Add a record, rename its title and slug, run `npm run registry:check`: same ID, exit 0. A duplicate or malformed ID exits 1, naming the files and the rule.

- [x] T010 [US1] Write failing tests in `tests/registry/integrity.test.ts › ID_SYNTAX` through seam 1 (`validateRegistry`): a local id not matching `[a-z0-9][a-z0-9._-]{0,127}`, an authority not matching `[a-z][a-z0-9]{1,15}` or an unknown family each yields ID_SYNTAX naming the value, the rule and the file; valid records yield none; violations name the entity in qualified form `tc:{authority}:{family}:{local-id}` (authority defaults to `tc`)
- [x] T011 [US1] Implement `src/registry/ids.ts` and a first `validateRegistry({ records, loadErrors })` in `src/registry/integrity.ts` returning `{ status, counts, violations }` (make T010 pass)
- [x] T012 [US1] Write failing tests `integrity › SCHEMA_INVALID` through seam 1: missing `id`, `family` or `title`; missing `slug` on a routable family; an unknown top-level key; a `private` block is accepted as an opaque object; `previous_slugs` must be a list of strings
- [x] T013 [US1] Implement the envelope schema in `src/registry/schemas/envelope.ts` and report its failures as SCHEMA_INVALID with the field path (make T012 pass)
- [x] T014 [US1] Write failing test `integrity › FILE_UNREADABLE`: loader errors passed in as `loadErrors` appear as violations with file and line
- [x] T015 [US1] Write failing test `integrity › ID_DUPLICATE` (same authority, family and id in two files): one violation whose `files` lists both
- [x] T016 [US1] Implement FILE_UNREADABLE and ID_DUPLICATE in `src/registry/integrity.ts` (make T014–T015 pass)
- [x] T017 [US1] Write failing tests in `tests/registry/cli.test.ts` through seam 2 (the CLI): on a valid registry it writes `integrity-report.json` that validates against `specs/001-scholarly-registry/contracts/integrity-report.schema.json` with `status: pass`, and `integrity-report.md`; two runs on the same input produce identical reports apart from `run_id` and `generated_at`
- [x] T018 [US1] Implement `src/registry/report.ts` (JSON + Markdown, violations grouped by code) and a first `scripts/registry-check.ts` that loads `--data`, runs the check and writes reports to `--report` (make T017 pass)
- [x] T019 [US1] Write failing tests `cli › exit codes`: 0 on a valid registry, 1 when any violation exists (Markdown report lists it under its code), 2 on an unreadable `--data` path or an unknown flag
- [x] T020 [US1] Complete `scripts/registry-check.ts`: exit codes, defaults (`--data data/registry`, `--report reports`), `--assets` accepted for later use, per `contracts/relations-and-cli.md` (make T019 pass)
- [x] T021 [US1] Write failing tests in `tests/registry/redirects.test.ts` for `redirectsFor(records)`: one `301` line per entry in `previous_slugs` to the current slug (US1-AS2)
- [x] T022 [US1] Implement `src/registry/redirects.ts` and a build step that writes `dist/_redirects` (make T021 pass)
- [x] T023 [US1] Write `tests/registry/rename.regression.test.ts` (SC-002): rewrite every title and slug in a fixture copy; assert IDs and references are unchanged and a redirect exists for every old slug (US1-AS2)

**Checkpoint**: US1 is independently demonstrable from the CLI, and renames never break links.

---

## Phase 4: User Story 3 — One linked scholarly graph (P1)

**Goal**: Every reference resolves; the build fails before page generation when one does not.

**Independent Test**: An essay fixture referencing an unknown `map` ID makes `npm run build` fail, naming the essay, the field and the missing ID.

- [x] T024 [US3] Write failing tests in `tests/registry/integrity.test.ts › family fields` through seam 1: each family accepts its fields from data-model.md "Family-specific fields" and rejects unknown ones (SCHEMA_INVALID); reference values must use `family:id` or `authority:family:id`; collections require `layer_ids[]` and `default_layer_ids[]`; an attestation requires `place` and `source`; a `source` requires a `bibliography` reference and rejects embedded citation fields (Principle V)
- [x] T025 [US3] Implement per-family schemas in `src/registry/schemas/<family>.ts` and an index `src/registry/schemas/index.ts` (make T024 pass)
- [x] T026 [US3] Write failing tests `integrity › REF_UNKNOWN` and `› REF_FAMILY` (fixtures `invalid/REF_UNKNOWN/`, `invalid/REF_FAMILY/`): violation names the entity, field path and missing or mismatched ID
- [x] T027 [US3] Write failing test `integrity › COLLECTION_DEFAULTS`: fails when `default_layer_ids ⊄ layer_ids` or members are duplicated
- [x] T028 [US3] Extend `src/registry/integrity.ts` with reference resolution across all families, REF_UNKNOWN, REF_FAMILY and COLLECTION_DEFAULTS (make T026–T027 pass)
- [x] T029 [US3] Write failing test `tests/registry/build-hook.test.ts`: the Astro integration aborts the build before page generation when the gate fails, printing the report path
- [x] T030 [US3] Run the gate from the registry integration in `src/integrations/registry.ts` at build start, writing reports and aborting on failure (make T029 pass). Binding Astro content collections to registry schemas is deferred to the first spec whose pages read registry records (003/004): no speculative code.
- [x] T031 [US3] Build the valid fixture `tests/registry/fixtures/valid/` with at least one record per family and every reference type resolving; the CLI test from T019 exits 0 on it

**Checkpoint**: US1 and US3 work together; broken links cannot reach `main`.

---

## Phase 5: User Story 2 — Record evidence and uncertainty as data (P1)

**Goal**: Provenance, precision, confidence, silence, rights and extraction are structured and enforced.

**Independent Test**: A fixture with one `source_geometry` feature and one `scholarly_reconstruction` feature validates with distinguishable provenance; an invalid enum value fails.

- [x] T032 [US2] Write failing tests in `tests/registry/integrity.test.ts › evidence` through seam 1: evidence entries accept the data-model.md fields; `source` is required and is a reference; values outside a shared vocabulary (`evidence_type`, `geometry_provenance`, `reconstruction`, `confidence`, `silence_state`, `locator_state`) are ENUM_INVALID; an authored `date_precision` is SCHEMA_INVALID (it is derived, ADR 0006); `last_verified` and `verified_on` are calendar dates
- [x] T033 [US2] Write failing tests `integrity › rights and extraction`: rights fields (`licence`, `attribution`, `text_copyright_status`, `reproduction_cleared: boolean`, kept separate); extraction `method: manual | ocr | htr | llm`, non-manual requires `raw_evidence_ref` and `transformation_log_ref`
- [x] T034 [US2] Implement `src/registry/schemas/evidence.ts` (evidence, rights, extraction) and map vocabulary failures to ENUM_INVALID (make T032–T033 pass). The evidence schema is exported for reuse on GeoJSON feature properties by spec 005, which owns layer files.
- [x] T035 [US2] Write failing tests `integrity › LOCATOR_VERIFICATION_INCOMPLETE` ("`verified` requires `verified_by`, `verified_on`, `consulted_copy`") and `› LOCATOR_UNVERIFIED_SECURE` ("`confidence = secure` ⇒ the evidence's locator is `verified`") (US2-AS2, US2-AS5)
- [x] T036 [US2] Write failing tests `integrity › PROVENANCE_MISSING` (rights required when lifecycle is `publishable` or `published`, US2-AS3), `› FINDING_AID_AS_SOURCE`, `› DATE_INVALID` (EDTF level 0–1, four-digit signed years, in evidence, place names and dated families) and `› EXTRACTION_UNADJUDICATED` (non-manual extraction past `verified` without `adjudicated_by`/`adjudicated_on`, FR-008); evidence `source` references resolve like any other
- [x] T037 [US2] Implement the rules from T035–T036 in `src/registry/integrity.ts` with EDTF parsing in `src/registry/dates.ts` (make T035–T036 pass). Deriving `date_precision` waits for its first consumer (the public projection, US4).
- [x] T038 [US2] Extend `tests/registry/fixtures/valid/` with evidence carrying a `source_geometry` and a `scholarly_reconstruction` claim, a verified locator, rights on a publishable record and an adjudicated extraction

**Checkpoint**: All P1 stories complete. This is the MVP of the gate.

---

## Phase 6: User Story 5 — Shared lifecycle and publication authority (P2)

**Goal**: One lifecycle; essays derive theirs from stage; supersession and specialist vocabularies are handled.

**Independent Test**: An essay at stage `Draft` reports lifecycle `verified`; an essay that declares `lifecycle` fails; a `superseded` record without `superseded_by` fails.

- [x] T039 [US5] Write failing tests in `tests/registry/integrity.test.ts › essay lifecycle` through seam 1: an essay's lifecycle is derived from its stage (Concept→proposed; Corpus, Research→researching; Outline, Draft→verified; Build→in_build; Design QA→qa; Publish, Cross-link→published), observed through the rules that depend on it (an essay at Publish or Cross-link without a licence is PROVENANCE_MISSING; at Design QA or earlier it is not)
- [x] T040 [US5] Implement `src/registry/lifecycle.ts` and use the effective lifecycle in every lifecycle-dependent rule (make T039 pass)
- [x] T041 [US5] Write failing tests `integrity › ESSAY_LIFECYCLE_DECLARED`, `› SUPERSEDED_WITHOUT_SUCCESSOR` and `› ENUM_INVALID` for `lifecycle` and essay `stage` values outside the shared vocabularies
- [x] T042 [US5] Write failing tests `integrity › specialist vocabularies`: a registry check given per-authority mappings accepts a specialist term (e.g. a CND lifecycle term) and applies its shared meaning to every rule; an unmapped specialist term is ENUM_INVALID; the shipped `data/vocab-mappings/atlas.yaml` maps the legacy layer terms `planned→proposed`, `in-preparation→in_build`, `in-review→qa` (FR-011); the CLI loads mappings from `--mappings` (default `data/vocab-mappings`)
- [x] T043 [US5] Implement the three rules from T041 and specialist-mapping resolution (make T041–T042 pass)
- [x] T044 [US5] Write failing tests `integrity › ASSET_MISSING` through seam 1 with the set of available asset paths as input: a `published` layer whose `asset` is not available fails; non-published layers without assets pass; the CLI builds that set from `--assets` (default `public`)
- [x] T045 [US5] Implement ASSET_MISSING and the CLI's asset listing (make T044 pass)
- [x] T046 [US5] Extend `redirectsFor` and its tests so a `superseded` entity keeps its own address (tombstone, spec 002 FR-011): its previous slugs lead to its tombstone and no rule ever redirects a live page path away. *Decided 2026-10-15: tombstone, not a redirect to the successor.*
- [x] T047 [P] [US5] Add optional `dimensions[]` to the essay schema (`Measure · Witness · Use · Cosmos · Power · Silence`) with a passing/failing pair in `integrity.test.ts` (seam 1) (FR-012)

**Checkpoint**: Lifecycle is consistent everywhere.

---

## Phase 7: User Story 4 — Reverse relationships (P2)

**Goal**: "Cited in" and "Used by" are derived for every entity; public output contains only released content and no private data.

**Independent Test**: Two essays reference one map, one released and one held. Public `relations.json` lists only the released essay.

- [x] T048 [P] [US4] Write failing tests in `tests/registry/relations.test.ts` for `buildRelations(records, { releasedOnly })`: output shape per `contracts/relations-and-cli.md`; held sources excluded when `releasedOnly`; a target referenced only by held content has empty arrays
- [x] T049 [P] [US4] Implement `src/registry/relations.ts` (make T048 pass)
- [x] T050 [P] [US4] Write failing tests in `tests/registry/public.test.ts` for `toPublic(entity)`: drops `private`; throws on non-released entities; adds `qualified_id`
- [x] T051 [P] [US4] Implement `src/registry/public.ts` (make T050 pass)
- [x] T052 [US4] Emit `dist/data/relations.json` (released-only) and `reports/relations.full.json` from the Astro integration, per `contracts/relations-and-cli.md`
- [x] T053 [US4] Write `tests/registry/leak-scan.test.ts` (FR-009): build the fixture site (including `relations.json`); zero occurrences of held titles or `private:` fixture values anywhere in `dist/`

**Checkpoint**: All five stories complete and independently tested.

---

## Phase 8: Polish & Cross-Cutting

- [ ] T054 [P] Implement `scripts/gen-synthetic-registry.ts`: a deterministic (seeded) 5,000-entity registry across all 14 families with realistic cross-references
- [ ] T055 Write `tests/registry/mutation.test.ts` (SC-003): seed one broken reference per family into the synthetic registry; assert 100% detection
- [ ] T056 Write `tests/registry/bench/registry.bench.ts` (SC-004): the gate validates the 5,000-entity registry in under 60 s (fail CI above that; target under 10 s locally)
- [ ] T057 [P] Generate `schemas/registry.schema.json` from the Zod source during the build, for R pipelines and contributors (contracts/record-file.md)
- [ ] T058 [P] Add an `R/` usage note to `docs/registry.md`: how an R pipeline writes records and calls `npm run registry:check -- --data <dir>` before committing
- [ ] T059 Walk through `specs/001-scholarly-registry/quickstart.md` steps 1–6 end to end and record the results in the PR description
- [ ] T060 Run the `code-review` skill against `main` (Standards + Spec axes) and resolve findings

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 → US1 (Phase 3) → US3 (Phase 4) → US2 (Phase 5) → US5 (Phase 6) → US4 (Phase 7) → Polish (Phase 8).
- US3 depends on US1 (IDs, gate, CLI). US2 depends on US3 (source references must resolve). US5 depends on US1. US4 depends on US3 (references) and US5 (`released` derives from lifecycle).
- Within each story: a test task always precedes its implementation task.

### Parallel opportunities
- Setup: T002–T005 together after T001.
- US1: report and CLI (T017–T020) follow the integrity rules; redirects (T021–T022) can run in parallel with them.
- US3: sequential (all tasks touch the registry check).
- US2: sequential (all tasks touch the registry check).
- US5: T039/T040 and T047 alongside the integrity rules.
- US4: relations (T048/T049) and public projection (T050/T051) in parallel.
- Polish: T054, T057, T058 together.

## Implementation Strategy

1. **MVP = Phases 1–5** (all P1 stories): the gate rejects bad IDs, broken references and unsupported evidence. Merge to `main` behind green CI.
2. **Increment 2 = US5**: lifecycle, ready for specs 003 and 005.
3. **Increment 3 = US4**: relations, public projection and redirects, ready for any reader-facing page.
4. **Polish**: scale proofs and review; then mark TCX-2 Done.

### Jira mapping
TCX-13 (US1) · TCX-15 (US3) · TCX-14 (US2) · TCX-17 (US5) · TCX-16 (US4). Each story's task IDs go into its Jira description as a checklist; Polish tasks go on epic TCX-2.
