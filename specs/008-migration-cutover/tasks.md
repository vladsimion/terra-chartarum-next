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

- [x] T001 Agree the three seams above with Vlad (tdd skill) and record any change here Done 2026-10-19: agreed as written, with the grill refresh recorded in `spec.md` and `research.md` R8.
- [x] T002 [P] Create `tests/migration/fixtures/snapshot/` shaped like the legacy repository and trimmed: a TypeScript registry whose `RAW` array sits beside imports of `astro:content` and a sibling module (one map each of scope `object`, `work`, `concept`, one `unlocated`, one with an inline citation, one with a private-looking key, one with images including an `iiif`, one with `uncertainties`, a year of `-600`), a second TypeScript registry with a non-literal value (to fail), bibliography, cartographers, toponyms, layers, collections, `data/geo/catalog.json`, a small Dacia CSV set, `src/pages` with static and dynamic routes, `src/content/essays`, and a Handbook entry Part one: the snapshot fixture holds the maps (an object held by an institution with an image, a work, a concept, an unlocated object, a plain sheet; a negative and a three-digit year; inline bibliography objects; uncertainties with `wouldResolve`; an `acquisition` key with a marker value), the toponyms, a registry that imports `astro:content` and a sibling module, the Dacia CSVs, and a second file with every kind of non-literal value. The rest (cartographers, bibliography, layers, collections, assets) joins it with its adapter.
- [ ] T003 Re-read each legacy registry in the pinned snapshot against [contracts/field-mappings.md](./contracts/field-mappings.md) and correct the table, including the Dacia CSV headers (research R7); record the snapshot SHA and the findings in `research.md`
- [x] T003a [P] Move `checkLinks` from `tests/shell/support/links.ts` to `src/shell/links.ts` (the test helper re-exports it) so `scripts/cutover-check.ts` does not import from `tests/`; its tests stay green Done: `src/shell/links.ts`; `tests/shell/support/links.ts` re-exports it.
- [x] T004 [P] Add `csv-parse` at an exact pinned version (at least two weeks old) and run `npm audit --omit=dev` Done: `csv-parse` 7.0.3 and `@babel/parser` 7.29.9 at exact versions (both over two weeks old); `npm audit --omit=dev` finds nothing. **Departure from R1:** TypeScript 7 (installed) is the native port and has no `createSourceFile`, so the compiler API is not available; the extraction uses `@babel/parser`'s TypeScript plugin instead. Same method (parse, evaluate the `RAW` initialiser as literals, never execute).

---

## Phase 2: Foundation (registry; blocks the stories)

**Goal**: the import-only fields and the three rules (FR-021).

- [x] T005 [P] Write failing `tests/registry/unit/migration-schema.test.ts`: `legacy_record_scope`, `legacy_custody` and `legacy_publication_status` load only on a record with `origin: legacy` value sets as in data-model.md; `FAM-UNKNOWN` still rejects them elsewhere Done: `migration-schema.test.ts`. The three fields are members of the map schema only, so FAM-UNKNOWN rejects them on any other family; where they may appear (legacy records) and their values are judged by `MIG-LEGACY`, as for the other `legacy_*` fields (a departure from the task text, which put the check in the schema).
- [x] T006 Implement the three import-only fields in `src/registry/schemas/families.ts` and `schemas/import.ts`
- [x] T007 [P] Write failing `tests/registry/unit/mig-slug.test.ts` for `MIG-SLUG` (a legacy record whose slug is neither its local-id nor has it in `slug_history`) with a named mutation
- [x] T008 Implement `MIG-SLUG` in `src/registry/rules/migration.ts` and register it
- [x] T009 [P] Write failing `tests/registry/unit/mig-legacy.test.ts` for `MIG-LEGACY` (a `legacy_*` field on a minted record; a bad value; `legacy_record_scope: work` with `record_scope: object`; `legacy_custody` disagreeing with `witness_kind`) with a named mutation for each
- [x] T010 Implement `MIG-LEGACY`
- [x] T011 [P] Write failing `tests/registry/unit/mig-image-cleared.test.ts` for `MIG-IMAGE-CLEARED` (a legacy map image with `reproduction_cleared: true` and no `editor_confirmed` person and date) with a named mutation
- [x] T012 Implement `MIG-IMAGE-CLEARED`
- [x] T013 Register the three rules in `src/registry/rules/index.ts`, make the rule-coverage test pass, and add them to `specs/001-scholarly-registry/contracts/rule-ids.md`; update spec 001's data model import section to point at spec 008's Done: three rules and five named mutations added (91 rules and 120 mutations in all; 2279 Vitest tests in 193 files). Two existing tests and one valid fixture built legacy records whose slug was not their legacy local-id; they now carry it (`MIG-SLUG` is meant to catch exactly that).

---

## Phase 3: User Story 1 — Import canonical data with identities intact (P1)

**Goal**: the v1 profile imports into staging, deterministically, without overwriting, with every legacy ID and slug preserved.

**Independent Test**: run the importer on the snapshot fixture; record counts match; zero IDs changed; the report is complete.

- [x] T014 [P] [US1] Write failing `tests/migration/unit/extract-ts.test.ts` (FR-011): a `RAW` array is extracted from a file that imports `astro:content`; strings, numbers (including negative), booleans, null, nested objects and arrays, comments ignored; a call, identifier, spread or template substitution fails naming the file, record and key; no old code is executed
- [x] T015 [US1] Implement `src/migration/extract-ts.ts`, `read-csv.ts` and `snapshot.ts` (the manifest with the commit SHA) Done (2320 Vitest tests in 197 files pass): `extract-ts.ts`, `read-csv.ts`, `snapshot.ts` (the pinned commit from the options or from git; the manifest builder).
- [x] T016 [P] [US1] Write failing `tests/migration/unit/year-to-edtf.test.ts`: `-600` → `-0600`, `106` → `0106`, `1579` → `1579`; an approximate year becomes `<year>~`; guessed conversions are flagged lossy
- [x] T017 [US1] Implement `src/migration/year-to-edtf.ts` Done: `year-to-edtf.ts`; an approximate label (`~`, `c.`, `ca`, `circa`, `about`) gives `<year>~`, flagged lossy with the label.
- [x] T018 [P] [US1] Write failing `tests/migration/unit/adapters.test.ts` for the maps adapter (scenarios 1, 3, 6, 7): ID, slug and boundary form; `record_scope` and `witness_kind` for `object`, `work`, `concept`, `unlocated`; `cartographerId` to `makers[]` and free-text makers kept as text with the field status; `relatedMapIds` to relations; `uncertainties` to `open_questions[]`; images to archive addresses with `reproduction_cleared` false and no file copied; missing fields recorded as statuses; every record `held` at `researching`
- [x] T019 [US1] Implement the maps adapter and `profile.ts` (adapter order and dependencies) in `src/migration/adapters/` Done: `src/migration/adapters/maps.ts` and `profile.ts` (assets, layers, collections, cartographers, bibliography, Dacia, maps, toponyms, in that order). Ids are `tc:tc:<family>:<legacy id>`: the contract said `tc:atlas:…`, but ADR 0006 item 1 keeps legacy ids verbatim under the `tc` authority (the allowlist has no `atlas`); corrected in `field-mappings.md`.
- [x] T020 [P] [US1] Write failing additions to `adapters.test.ts` for the cartographers, bibliography, toponyms, layers, collections and geo-assets adapters: cartographer biography to a body file; each bibliography item to a Source with the legacy ID and a minted entry, inline citations deduplicated through the `import-bib` matcher, `section` only where the mapping table is unambiguous; toponyms to `names[]`, `location` and `same_as[]`; layers with lifecycle mapped through `LEGACY_LAYER_LIFECYCLE_MAP`, `envelope`, `time_mode`, `theme` through the table, `facets[]`, `documentation[]`, rights, the source copied into `data/layers/` under the size gate; collections with `members[]` and `default_layers[]` resolved to layer IDs; datasets from `catalog.json` with `version: legacy-<short SHA>`
- [x] T021 [US1] Implement those adapters Done: one adapter per registry in `src/migration/adapters/`. Where the registry has no field for a legacy value it is reported as set aside and stays in the snapshot: dataset years, CND source dates and rights statements, a place's geometry provenance term (checked against the vocabulary first), collection tags. A layer's `facets` strings become category facets labelled with the property name (logged lossy). Entries come from `entries.ts`: the matcher decides whether a work is one the registry or this run already has; an entry already in the registry is written again with its own id and slug, so a re-run stages the same files and a hand edit shows as a change.
- [x] T022 [P] [US1] Write failing `tests/migration/unit/vocab.test.ts` (scenario 2) and implement the Dacia adapters with `vocab-mappings/cnd.yaml`: only the places and sources referenced by the Roman Dacia layers and the Trench A pilot files are imported; an unmapped vocabulary term fails the import naming the term, vocabulary and record; the original term is kept Done: `vocab-mappings/cnd.yaml` (geometry terms; `editorial_reconstruction` is read as `generalized_editorial`, an editorial reading for the editor to confirm at T028), the places adapter for the pilot places (`pilot-places.csv`, not the manifest) and the sources adapter for the Trench A sources. An unmapped term fails the import (`UnmappedTermError`). Follow-up (code-review, 2026-10-20): the place now keeps the original term in `geometry_provenance` with `vocabulary: cnd` (the registry's own TC-D016 mechanism, so no `legacy_` field), and the staging gate sees the root's `vocab-mappings/`.
- [x] T023 [P] [US1] Write failing `tests/migration/unit/drops.test.ts` (scenario 8): a private-word key is dropped and written nowhere; legacy map room fields are dropped; both reported by name and count; `acquisition` is dropped
- [x] T024 [US1] Implement the drops and `src/migration/essay-links.ts` (`migration/essay-links.json` from every essay and room link found) Done: `essay-links.json` has maps, layers, collections, places, cartographers and rooms for each essay; the primary room is the one most of the essay's records sit in (a tie goes to the earlier of the seven), the rest are secondary.
- [x] T025 [P] [US1] Write failing `tests/migration/integration/determinism.test.ts`, `no-overwrite.test.ts` and `import-legacy.test.ts` (scenarios 4, 5; SC-004, SC-005): two runs give byte-identical staging output; `--apply` writes only new files and nothing the second time; a hand-edited applied record is untouched and a changed upstream value is listed; no image binary is added; counts match the fixture; a slug collision inside one family fails naming both records; the integrity gate runs over staging
- [x] T026 [US1] Implement `src/migration/stage.ts`, `apply.ts` and the report, and the `import-legacy` command in `src/registry/cli.ts` Done: `stage.ts` (compare with the root, write staging, add-only apply with `wx`), `import-legacy.ts` and the command in `cli.ts`. The gate's report over staging is stamped with the snapshot's date and commit so staging is byte-identical for one snapshot. The staging report's `created`, `skipped` and `changed_upstream` are relative to the registry root; everything else in it depends on the snapshot alone.
- [x] T027 [US1] Write and pass `tests/migration/unit/ids-unchanged.test.ts` (SC-001): every legacy ID in the fixture appears verbatim in the output, qualified as `tc:<authority>:<family>:<id>`
- [ ] T028 [US1] Editor acceptance: run the v1 profile on the real pinned snapshot into staging, read `import-report.json` and the integrity report together with Vlad, then `--apply` and commit the records and `migration/import-manifest.json` and `essay-links.json` (a manual step; record the SHA and counts here) Dry run on the real snapshot (not applied, by me, 2026-10-19): `e82afd9` stages 284 records (59 maps, 19 cartographers, 27 layers with 27 datasets, 6 collections, 52 places, 46 sources, 48 entries), the staging gate passes with 0 errors and 167 warnings (80 FAM-REQUIRED, 52 AUTO-UNADJUDICATED for the llm-assisted places, 35 RIGHTS-MISSING: the remediation list), 28 lossy conversions (15 facets, 13 repository texts), and drops the map room fields (59, 51, 3). The real data needed two fixes the fixture had not shown: `places.csv` mixes CRLF and LF line endings, and one inline citation has no title. Still the editor's step: pin the SHA, read the report with Vlad, `--apply`, commit.

**Checkpoint**: the v1 data is in the repository, held; TCX-45 checklist updated.

---

## Phase 4: User Story 3 — Redirect map that shrinks as essays are rebuilt (P1)

- [x] T029 [P] [US3] Write failing `tests/migration/unit/inventory.test.ts` (scenarios 1, 2 of US2 and US3): from the fixture snapshot every static and expanded dynamic route appears once, normalised, with its kind; outcomes follow the policy table (an unrebuilt essay in place; an imported public record a rule; a held record in place; each `/atlas/layers/<layer>/` in place, expanded from the Handbook documents of type `layer`, and `/atlas/` with any query a rule to `/atlas/?from=legacy`; `/privacy`, `/programmes/**`, `/data/**` in place); sorted and deterministic
- [x] T030 [US3] Implement `src/migration/inventory.ts` and the `inventory` command Done: `registry inventory`. Essays count as routes when their `releaseAt` is on or before the snapshot's date, and a Handbook document when its lifecycle is `published` or `in-review` (the legacy site's own gates). The outcome rules are one function (`outcomeOf`) shared with the rule-file generator. On the real snapshot (`e82afd9`, with the repository's seven rooms as the registry): 167 old URLs, 15 with a rule (the seven rooms and eight list pages) and 152 served in place; the rest move as maps, cartographers and essays are published.
- [x] T031 [P] [US3] Write failing `tests/migration/unit/redirects.test.ts` (scenarios 2, 3, 4): one rule per `rule` entry in Cloudflare syntax, 301, absolute targets, sorted, with the header comment; a rebuilt essay with `legacy_url`, published and released, gains its rule and an unpublished one does not; an Atlas path with a query maps to `/atlas/?from=legacy`; the generator fails when a target is not a built page
- [x] T032 [US3] Implement `src/migration/redirects.ts` and the `archive-redirects` command Done: `registry archive-redirects` refuses an inventory that disagrees with the registry (an essay published since it was built) and says to run `registry inventory` again, so a rule cannot be silently missing; it writes the header with the snapshot and the registry commit.
- [x] T033 [P] [US3] Write failing `tests/atlas/e2e/legacy-notice.spec.ts` (CI-verified): `/atlas/?from=legacy` shows a notice that the old view could not be restored, is announced to assistive technology, and the rest of the Atlas loads; blocked until spec 005's Atlas page exists
- [x] T034 [US3] Add the `from=legacy` notice to the Atlas page; extend spec 005's view-address module to ignore and report `from` without treating it as an unknown parameter Done: `parseView` reads `?from=legacy` as the usual view plus one notice item (`LEGACY_NOTICE`), shown in the Atlas's existing status region; `from` is never written back. `tests/atlas/e2e/legacy-notice.spec.ts` passes on Chromium locally (10 tests, both colour schemes, axe included); Firefox and WebKit run in CI.

---

## Phase 5: User Story 2 — Freeze the old site as an archive (P1)

- [x] T035 [P] [US2] Write failing `tests/migration/unit/archive-patch.test.ts`: `archive/banner.html` carries the "archived edition" text, a link to `https://terra-chartarum.org/` and no script; `archive/_headers` sets `X-Robots-Tag: noindex` for every path; the patch README says where each file goes in the archive project
- [x] T036 [US2] Write the patch under `archive/`
- [x] T037 [P] [US2] Write failing `tests/migration/integration/archive-check.test.ts`: the pure core compares a response to the expectations (banner present, header present, link present) and reports each failure with the URL; run against a local server serving a good and a bad page
- [x] T038 [US2] Implement `scripts/archive-check.ts` and the `archive:check` npm script

---

## Phase 6: User Story 4 — Cutover checklist (P2)

- [x] T039 [P] [US4] Write failing `tests/migration/unit/cutover-check.test.ts` (scenarios 1, 2; SC-006): the check passes on a clean fixture and fails on each broken one — a stub page, a draft room, a dead link, a redirect inventory URL with no outcome, an extra rule, a dangling target, a failed gate, a CI run that is absent or not green (canned `gh` output; `gh` missing is a clear failure) — naming the page, URL or rule; it reads `migration/redirect-inventory.json` and `archive/_redirects`; the anchor essay not published fails it
- [x] T040 [US4] Implement `scripts/cutover-check.ts` and the `cutover:check` npm script; write `docs/cutover.md` from [contracts/cutover.md](./contracts/cutover.md)
- [x] T041 [P] [US4] Write failing `tests/migration/unit/baseline.test.ts` (scenario 3): the summary table and the JSON are produced from canned Lighthouse results; the file name carries the date; the command refuses to run without URLs
- [ ] T042 [US4] Implement `scripts/baseline.ts` and the `baseline` npm script; run it by hand against the live site's key templates (home, an essay, a collection record, the Atlas, the bibliography, a cartographer) before the freeze and commit `docs/baseline/live-site-<date>.json` (a manual step) Script done (`npm run baseline`, pinned `lighthouse@12.6.1`, mobile profile; refuses without URLs). Still the editor's step: run it against the live site before the freeze and commit `docs/baseline/live-site-<date>.json`.

---

## Phase 7: Polish & cross-cutting concerns

- [x] T043 [P] Run the quickstart end to end on the fixture and fix anything it exposes Done (2026-10-20): the quickstart ran on the fixture: staging 26 records, byte-identical on a second run, `--apply` wrote 38 files and a second apply staged 0 new, 39 old URLs (11 rules, 28 in place), 11 rules written; a production build of that root then ran through `cutover:check`: integrity, links and the redirect file pass; draft copy, the missing anchor essay and the CI run still in progress fail, as expected. No fix was needed.
- [x] T044 [P] Update `README.md` and `docs/` for the migration commands; add ADR 0016 to the Read-first list in `CLAUDE.md` Done: README section "Migration and cutover"; ADR 0016 was already in the Read-first list of `CLAUDE.md`.
- [x] T045 Run the `code-review` skill against the commit before this work began (standards and spec axes) and address findings Done (2026-10-20, against 82900dd): no hard standards violations; fixed here: the archive banner is now found by its id (a page's own text could pass), ADR 0016 names the sixth cutover step, the plan's traceability table names real tests, `archive:check` reuses `requireUrls`, `cutover:check` tells a shell:check that did not run from one that found pages. Left open, for the editor: FR-016 keeps no original specialist term on the place record (needs a schema decision), the migration manifests are not committed until T028, a slug collision names the id not both records, a `deepzoom` image type the spec says is not needed, the `trench_a_stela` selector to verify on the real `sources.csv`, and smells (the local-id split repeated in four places, `_redirects` parsed in four places, string-matched expected errors in `commands.ts`).
- [ ] T046 Update Jira (TCX-44 description, story checklists, statuses), the Confluence dossier for spec 008, the Build Log and the Decision Log (workflow step 4); record the snapshot SHA used for v1 and the date of the cutover

---

## Dependencies & Execution Order

- Setup → Foundation → US1 → US3 → US2 → US4 → Polish. Foundation blocks the stories; US2 and US4 scripts need only Setup and can be built any time after it.
- The maps adapter needs spec 004's Foundation; the layers, collections and places adapters need spec 005's Foundation; the bibliography adapter needs spec 006's Foundation and its `src/bibliography/match.ts`; T033 and T034 need spec 005's Atlas page and view-address module. This spec is implemented after those.
- T028 and T042 are manual steps for the editor and are done last, against the real legacy repository and live site.
- The live legacy site and repository are never modified by this repository's code; the archive project changes only by a pull request the editor opens.

## Implementation Strategy

MVP is Foundation plus US1 on the fixture: held records with preserved IDs and a complete report. Then the inventory and rule file (US3), the archive patch and check (US2) and the cutover check (US4), and last the editor's real run. Ship one story per PR, red tests pushed first, verified in CI.
