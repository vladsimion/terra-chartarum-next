---

description: "Task list for 008 Migration & Cutover"
---

# Tasks: Migration & Cutover

**Input**: Design documents from `/specs/008-migration-cutover/`

**Prerequisites**: plan.md, spec.md (clarified 2026-10-17), research.md, data-model.md, contracts/ (field-mappings.md, redirect-inventory.md, cli-additions.md, migration-rule-ids.md, cutover.md), quickstart.md. Decision: ADR 0016 (amends ADR 0011).

**Tests**: REQUIRED (Constitution X). Every acceptance scenario has an automated test written first, and each story is built red → green with the `tdd` skill: in every phase the test tasks come first and must be seen failing before the task that makes them pass. Refactoring happens in review, not inside the loop. Every new rule gets a named mutation in the same task that adds it (the rule-coverage test fails otherwise).

**Seams** (to confirm with Vlad at T001): (1) the registry through `validateRegistry` and the CLI `main` (the `legacy_*` fields, three rules, `import-legacy`, `inventory`, `archive-redirects`); (2) the pure modules in `src/migration/` (a snapshot directory and the registry in, plain data and files out); (3) the scripts (`cutover-check`, `archive-check`, `baseline`) through their pure cores and a local server. No test reaches inside an adapter's helper.

**Organization**: Grouped by user story. Slice order: **Foundation → US1 → US3 → US2 → US4 → Polish**. The importer's maps adapter needs spec 004's Foundation (`record_scope`, `unlocated`, `open_questions[]`, `MAP-SCOPE`), the layers and places adapters need spec 005's Foundation, and the bibliography adapter needs spec 006's Foundation and its `import-bib` matcher; so spec 008's implementation follows those Foundations. The Atlas notice (US3) needs spec 005's Atlas page.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1–US4, matching `spec.md`
- Paths are relative to the repository root. Registry tests are under `tests/registry/`, migration tests under `tests/migration/`.
- Jira: each story's checklist is copied into its TCX story under epic TCX-44 (TCX-45 US1, TCX-46 US2, TCX-47 US3, TCX-48 US4; Setup and Foundation sit in TCX-45); Jira and Confluence are updated after each story (workflow step 4); `/speckit-taskstoissues` is not used.

---

## Phase 1: Setup

- [ ] T001 Agree the three seams above with Vlad (tdd skill) and record any change here
- [ ] T002 [P] Create `tests/migration/fixtures/snapshot/` shaped like the legacy repository and trimmed: a TypeScript registry whose `RAW` array sits beside imports of `astro:content` and a sibling module (one map each of scope `object`, `work`, `concept`, one `unlocated`, one with an inline citation, one with a private-looking key, one with images including an `iiif`, one with `uncertainties`, a year of `-600`), a second TypeScript registry with a non-literal value (to fail), bibliography, cartographers, toponyms, layers, collections, `data/geo/catalog.json`, a small Dacia CSV set, `src/pages` with static and dynamic routes, `src/content/essays`, and a Handbook entry
- [ ] T003 Re-read each legacy registry in the pinned snapshot against [contracts/field-mappings.md](./contracts/field-mappings.md) and correct the table, including the Dacia CSV headers (research R7); record the snapshot SHA and the findings in `research.md`
- [ ] T004 [P] Add `csv-parse` at an exact pinned version (at least two weeks old) and run `npm audit --omit=dev`

---

## Phase 2: Foundation (registry; blocks the stories)

**Goal**: the import-only fields and the three rules (FR-021).

- [ ] T005 [P] Write failing `tests/registry/unit/migration-schema.test.ts`: `legacy_record_scope`, `legacy_custody` and `legacy_publication_status` load only on a record with `origin: legacy` value sets as in data-model.md; `FAM-UNKNOWN` still rejects them elsewhere
- [ ] T006 Implement the three import-only fields in `src/registry/schemas/families.ts` and `schemas/import.ts`
- [ ] T007 [P] Write failing `tests/registry/unit/mig-slug.test.ts` for `MIG-SLUG` (a legacy record whose slug is neither its local-id nor has it in `slug_history`) with a named mutation
- [ ] T008 Implement `MIG-SLUG` in `src/registry/rules/migration.ts` and register it
- [ ] T009 [P] Write failing `tests/registry/unit/mig-legacy.test.ts` for `MIG-LEGACY` (a `legacy_*` field on a minted record; a bad value; `legacy_record_scope: work` with `record_scope: object`; `legacy_custody` disagreeing with `witness_kind`) with a named mutation for each
- [ ] T010 Implement `MIG-LEGACY`
- [ ] T011 [P] Write failing `tests/registry/unit/mig-image-cleared.test.ts` for `MIG-IMAGE-CLEARED` (a legacy map image with `reproduction_cleared: true` and no `editor_confirmed` person and date) with a named mutation
- [ ] T012 Implement `MIG-IMAGE-CLEARED`
- [ ] T013 Register the three rules in `src/registry/rules/index.ts`, make the rule-coverage test pass, and add them to `specs/001-scholarly-registry/contracts/rule-ids.md`; update spec 001's data model import section to point at spec 008's

---

## Phase 3: User Story 1 — Import canonical data with identities intact (P1)

**Goal**: the v1 profile imports into staging, deterministically, without overwriting, with every legacy ID and slug preserved.

**Independent Test**: run the importer on the snapshot fixture; record counts match; zero IDs changed; the report is complete.

- [ ] T014 [P] [US1] Write failing `tests/migration/unit/extract-ts.test.ts` (FR-011): a `RAW` array is extracted from a file that imports `astro:content`; strings, numbers (including negative), booleans, null, nested objects and arrays, comments ignored; a call, identifier, spread or template substitution fails naming the file, record and key; no old code is executed
- [ ] T015 [US1] Implement `src/migration/extract-ts.ts`, `read-csv.ts` and `snapshot.ts` (the manifest with the commit SHA)
- [ ] T016 [P] [US1] Write failing `tests/migration/unit/year-to-edtf.test.ts`: `-600` → `-0600`, `106` → `0106`, `1579` → `1579`; an approximate year becomes `<year>~`; guessed conversions are flagged lossy
- [ ] T017 [US1] Implement `src/migration/year-to-edtf.ts`
- [ ] T018 [P] [US1] Write failing `tests/migration/unit/adapters.test.ts` for the maps adapter (scenarios 1, 3, 6, 7): ID, slug and boundary form; `record_scope` and `witness_kind` for `object`, `work`, `concept`, `unlocated`; `cartographerId` to `makers[]` and free-text makers kept as text with the field status; `relatedMapIds` to relations; `uncertainties` to `open_questions[]`; images to archive addresses with `reproduction_cleared` false and no file copied; missing fields recorded as statuses; every record `held` at `researching`
- [ ] T019 [US1] Implement the maps adapter and `profile.ts` (adapter order and dependencies) in `src/migration/adapters/`
- [ ] T020 [P] [US1] Write failing additions to `adapters.test.ts` for the cartographers, bibliography, toponyms, layers, collections and geo-assets adapters: cartographer biography to a body file; each bibliography item to a Source with the legacy ID and a minted entry, inline citations deduplicated through the `import-bib` matcher, `section` only where the mapping table is unambiguous; toponyms to `names[]`, `location` and `same_as[]`; layers with lifecycle mapped through `LEGACY_LAYER_LIFECYCLE_MAP`, `envelope`, `time_mode`, `theme` through the table, `facets[]`, `documentation[]`, rights, the source copied into `data/layers/` under the size gate; collections with `members[]` and `default_layers[]` resolved to layer IDs; datasets from `catalog.json` with `version: legacy-<short SHA>`
- [ ] T021 [US1] Implement those adapters
- [ ] T022 [P] [US1] Write failing `tests/migration/unit/vocab.test.ts` (scenario 2) and implement the Dacia adapters with `vocab-mappings/cnd.yaml`: only the places and sources referenced by the Roman Dacia layers and the Trench A pilot files are imported; an unmapped vocabulary term fails the import naming the term, vocabulary and record; the original term is kept
- [ ] T023 [P] [US1] Write failing `tests/migration/unit/drops.test.ts` (scenario 8): a private-word key is dropped and written nowhere; legacy map room fields are dropped; both reported by name and count; `acquisition` is dropped
- [ ] T024 [US1] Implement the drops and `src/migration/essay-links.ts` (`migration/essay-links.json` from every essay and room link found)
- [ ] T025 [P] [US1] Write failing `tests/migration/integration/determinism.test.ts`, `no-overwrite.test.ts` and `import-legacy.test.ts` (scenarios 4, 5; SC-004, SC-005): two runs give byte-identical staging output; `--apply` writes only new files and nothing the second time; a hand-edited applied record is untouched and a changed upstream value is listed; no image binary is added; counts match the fixture; a slug collision inside one family fails naming both records; the integrity gate runs over staging
- [ ] T026 [US1] Implement `src/migration/stage.ts`, `apply.ts` and the report, and the `import-legacy` command in `src/registry/cli.ts`
- [ ] T027 [US1] Write and pass `tests/migration/unit/ids-unchanged.test.ts` (SC-001): every legacy ID in the fixture appears verbatim in the output, qualified as `tc:<authority>:<family>:<id>`
- [ ] T028 [US1] Editor acceptance: run the v1 profile on the real pinned snapshot into staging, read `import-report.json` and the integrity report together with Vlad, then `--apply` and commit the records and `migration/import-manifest.json` and `essay-links.json` (a manual step; record the SHA and counts here)

**Checkpoint**: the v1 data is in the repository, held; TCX-45 checklist updated.

---

## Phase 4: User Story 3 — Redirect map that shrinks as essays are rebuilt (P1)

- [ ] T029 [P] [US3] Write failing `tests/migration/unit/inventory.test.ts` (scenarios 1, 2 of US2 and US3): from the fixture snapshot every static and expanded dynamic route appears once, normalised, with its kind; outcomes follow the policy table (an unrebuilt essay in place; an imported public record a rule; a held record in place; `/atlas/layers/<id>/` a view address; `/privacy`, `/programmes/**`, `/data/**` in place); sorted and deterministic
- [ ] T030 [US3] Implement `src/migration/inventory.ts` and the `inventory` command
- [ ] T031 [P] [US3] Write failing `tests/migration/unit/redirects.test.ts` (scenarios 2, 3, 4): one rule per `rule` entry in Cloudflare syntax, 301, absolute targets, sorted, with the header comment; a rebuilt essay with `legacy_url`, published and released, gains its rule and an unpublished one does not; an Atlas path with a query maps to `/atlas/?from=legacy`; the generator fails when a target is not a built page
- [ ] T032 [US3] Implement `src/migration/redirects.ts` and the `archive-redirects` command
- [ ] T033 [P] [US3] Write failing `tests/atlas/e2e/legacy-notice.spec.ts` (CI-verified): `/atlas/?from=legacy` shows a notice that the old view could not be restored, is announced to assistive technology, and the rest of the Atlas loads; blocked until spec 005's Atlas page exists
- [ ] T034 [US3] Add the `from=legacy` notice to the Atlas page; extend spec 005's view-address module to ignore and report `from` without treating it as an unknown parameter

---

## Phase 5: User Story 2 — Freeze the old site as an archive (P1)

- [ ] T035 [P] [US2] Write failing `tests/migration/unit/archive-patch.test.ts`: `archive/banner.html` carries the "archived edition" text, a link to `https://terra-chartarum.org/` and no script; `archive/_headers` sets `X-Robots-Tag: noindex` for every path; the patch README says where each file goes in the archive project
- [ ] T036 [US2] Write the patch under `archive/`
- [ ] T037 [P] [US2] Write failing `tests/migration/integration/archive-check.test.ts`: the pure core compares a response to the expectations (banner present, header present, link present) and reports each failure with the URL; run against a local server serving a good and a bad page
- [ ] T038 [US2] Implement `scripts/archive-check.ts` and the `archive:check` npm script

---

## Phase 6: User Story 4 — Cutover checklist (P2)

- [ ] T039 [P] [US4] Write failing `tests/migration/unit/cutover-check.test.ts` (scenarios 1, 2; SC-006): the check passes on a clean fixture and fails on each broken one — a stub page, a draft room, a dead link, a redirect inventory URL with no outcome, an extra rule, a dangling target, a failed gate — naming the page, URL or rule; it reads `migration/redirect-inventory.json` and `archive/_redirects`; the anchor essay not published fails it
- [ ] T040 [US4] Implement `scripts/cutover-check.ts` and the `cutover:check` npm script; write `docs/cutover.md` from [contracts/cutover.md](./contracts/cutover.md)
- [ ] T041 [P] [US4] Write failing `tests/migration/unit/baseline.test.ts` (scenario 3): the summary table and the JSON are produced from canned Lighthouse results; the file name carries the date; the command refuses to run without URLs
- [ ] T042 [US4] Implement `scripts/baseline.ts` and the `baseline` npm script; run it by hand against the live site's key templates (home, an essay, a collection record, the Atlas, the bibliography, a cartographer) before the freeze and commit `docs/baseline/live-site-<date>.json` (a manual step)

---

## Phase 7: Polish & cross-cutting concerns

- [ ] T043 [P] Run the quickstart end to end on the fixture and fix anything it exposes
- [ ] T044 [P] Update `README.md` and `docs/` for the migration commands; add ADR 0016 to the Read-first list in `CLAUDE.md`
- [ ] T045 Run the `code-review` skill against the commit before this work began (standards and spec axes) and address findings
- [ ] T046 Update Jira (TCX-44 description, story checklists, statuses), the Confluence dossier for spec 008, the Build Log and the Decision Log (workflow step 4); record the snapshot SHA used for v1 and the date of the cutover

---

## Dependencies & Execution Order

- Setup → Foundation → US1 → US3 → US2 → US4 → Polish. Foundation blocks the stories; US2 and US4 scripts need only Setup and can be built any time after it.
- The maps adapter needs spec 004's Foundation; the layers, collections and places adapters need spec 005's Foundation; the bibliography adapter needs spec 006's Foundation and its `src/bibliography/match.ts`; T033 and T034 need spec 005's Atlas page and view-address module. This spec is implemented after those.
- T028 and T042 are manual steps for the editor and are done last, against the real legacy repository and live site.
- The live legacy site and repository are never modified by this repository's code; the archive project changes only by a pull request the editor opens.

## Implementation Strategy

MVP is Foundation plus US1 on the fixture: held records with preserved IDs and a complete report. Then the inventory and rule file (US3), the archive patch and check (US2) and the cutover check (US4), and last the editor's real run. Ship one story per PR, red tests pushed first, verified in CI.
