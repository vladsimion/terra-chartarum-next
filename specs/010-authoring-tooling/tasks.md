---

description: "Task list for 010 Authoring Tooling"
---

# Tasks: Authoring Tooling

**Input**: Design documents from `/specs/010-authoring-tooling/`

**Prerequisites**: plan.md, spec.md (clarified 2026-11-21), research.md, data-model.md, contracts/ (cli.md, dependents.schema.json, editor-schemas.md, link-check.md), quickstart.md. Decisions: ADR 0018, ADR 0019.

**Tests**: REQUIRED (Constitution X). Every acceptance scenario has an automated test written first (the map is in `quickstart.md`), and each slice is built red → green with the `tdd` skill: in every phase the test tasks come first and must be seen failing before the task that makes them pass. Refactoring happens in review, not in the loop. Steps only the author can take are marked **(author)**.

**Seams** (to confirm with Vlad at T001): (1) the registry through `validateRegistry`, `loadAndCheck` and the CLI `main` (the checklist, `registry new`, `registry deps`, `check --out`); (2) pure modules (`checklist.ts`, `dependents.ts`, `editor-schema.ts`, `glossary.ts`, `src/linkcheck/*`); (3) the link checker through injected `fetch`, Jira, GitHub and Wayback clients, with in-memory stand-ins; no test touches the network.

**Organization**: by user story in priority order: **Setup → Foundation → US1 (P1) → US2 (P2) → US3 (P2) → US4 (P3) → Polish**. The stories are independent; US2 and US3 may swap.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1–US4, matching `spec.md`
- Paths are relative to the repository root.
- Jira: epic TCX-59; US1 → TCX-62, US2 → TCX-63, US3 → TCX-61, US4 → TCX-64; Setup, Foundation and Polish sit in the epic. Each story's description points at this file rather than copying the checklist (CLAUDE.md workflow step 4).

### Pull-request map (each merged by the editor with `gate` green)

| PR | Tasks | Slice |
|---|---|---|
| 1 | spec, plan, tasks, analysis; T001–T004 | this directory, the dossier, the rule guard |
| 2 | T005–T020 | US1 `registry new <family>` |
| 3 | T021–T030 | US2 dependents |
| 4 | T031–T041 | US3 editor schemas |
| 5 | T042–T062 | US4 link and manifest checker |
| after | T063–T066 | Polish |

---

## Phase 1: Setup

- [x] T001 Agree the three seams above with Vlad (tdd skill) and record any change here Done 2026-11-21: agreed as written (Vlad: "seams look good").
- [x] T002 [P] Create the spec 010 programme dossier `docs/confluence/spec-010-authoring-tooling.md` (scope, stories ↔ Jira, decisions from research.md R1–R9, open items, a `<!-- status:begin -->`/`<!-- status:end -->` block), list it in `docs/confluence/README.md` as "not yet published", and run `npm run status -- --write` Done 2026-11-21: `docs/confluence/spec-010-authoring-tooling.md`, listed in `docs/confluence/README.md`.

## Phase 2: Foundation (blocks every story)

- [x] T003 Write `tests/registry/unit/rules-not-weakened.test.ts` (SC-003, research R9): a literal list of every `[rule id, from]` pair in `ALL_RULES` at `main` f0a9230 (94 rules), asserting each pair is still registered with the same threshold; new rules are allowed. It passes on first run (it is a guard, not a feature), so see it fail once by deleting a pair from a local copy of `ALL_RULES`, then restore Done 2026-11-21: `ALL_RULES` holds **92** rules at f0a9230 (the status block's 94 also counts `LOAD-PARSE` and `PRIV-LEAK`, which run outside the validator); seen failing with `LOC-SECURE-PENDING`'s threshold changed, then 93 of 93 green.
- [x] T004 [P] Add a `requires` property to the rule type in `src/registry/rules/framework.ts`: `requires?: { family: string | '*'; field: string; notYet?: unknown; when?: (record: RegistryRecord) => boolean }[]`, declarative only, never read by `check` (data-model.md "Rule.requires"); typecheck passes with no rule using it yet Done 2026-11-21, simplified: `requires?: readonly Requirement[]` with `Requirement = { family, field }`, `field` being the field the rule's finding names. No `notYet` or `when`: no current rule needs either (research R2, amended).

**Checkpoint**: the guard is in place; stories can start.

---

## Phase 3: User Story 1 — A new record, minted and checklisted (P1) · TCX-62

**Goal**: `registry new <family> <title>` writes one stub per call with a minted ID and the provenance checklist read from the rules.

**Independent test**: one run per scaffoldable family on a copy of the registry writes one file and adds no gate error; promoting the untouched stub fails on exactly its checklist (quickstart.md US1).

### Tests (write first, see them fail)

- [x] T005 [P] [US1] Write `tests/registry/unit/checklist.test.ts`: for each of the 14 scaffoldable families (every `FAMILIES` entry but `room`), build the stub `checklistFor` describes (identity, `proposed`, `held`, its "not yet" values), promote it to `ready_for_build` and assert the error findings' `(rule, field)` set equals the checklist's `ready_for_build` list; promote to `publishable` and assert it equals both lists together (SC-002). Collection, route, event and period have empty lists (FR-019). Assert the "not yet" values are exactly `locator.state: pending`, `confidence: unknown` and map `field_status` `not_yet_verified` where their rules apply (research R2) Done 2026-11-21: 32 tests. Essays are left out with rooms: their lifecycle follows the stage (ADR 0010), so a promoted essay is judged by its stage checks, not a checklist. The test compares `rule:field` pairs per threshold, because a field can be needed by one rule from `ready_for_build` and another from `publishable` (map `makers`, `witness_kind`). Map `field_status: not_yet_verified` is **not** written: `MAP-FIELD-STATUS` accepts it at `publishable`, so it would make an untouched map pass.
- [x] T006 [P] [US1] Write `tests/registry/integration/new-record.test.ts` on a temporary copy of `tests/registry/fixtures/valid`: (1) for every scaffoldable family but essay, `registry new <family> "<title>"` exits 0, prints the stable ID then `content/<family>/<local-id>.yaml`, the local-id is the next counter for that family, the file has `lifecycle: proposed`, `release: held`, the headings `# To complete before ready_for_build` and, where that list is non-empty, `# To complete before publishable` (FR-003), and `loadAndCheck` reports no error that was not there before; (4) `room` and `nosuch` exit 2, print the contract's message on stderr and write nothing; an empty title exits 2; (5) with a fixture rule injected that the stub breaks, the command exits 1 and every file under `content/` is byte-for-byte as before; and on a fixture that already has a gate error, a valid stub is still written and that error is not blamed on it (spec edge case) (contracts/cli.md) Done 2026-11-21: 20 tests, seen red (the CLI knew only `essay`). The rollback case is a real one, a place titled "Napoca" against the fixture's `napoca` (`SLUG-UNIQUE`), rather than an injected rule.
- [x] T007 [P] [US1] Write `tests/registry/integration/mint-contract.test.ts` (FR-007, research R5): run `tsx src/registry/cli.ts mint place --dir <copy>` and `… new place "X" --dir <copy>` as child processes, the way R's `system2()` will; assert `mint` prints exactly one line matching `^place-\d{6}$`, `new` prints two lines whose first is `tc:tc:place:<that local-id>`, and an unknown family exits non-zero with stderr and empty stdout Done 2026-11-21: 2 tests. Written after T015, so seen green first; its `new` half would have failed before T015 and its `mint` half is behaviour that already existed.

### Implementation

- [x] T008 [P] [US1] Declare `requires` in `src/registry/rules/family.ts` (`FAM-REQUIRED`: one entry per field of `REQUIRED`, with `when` for map `witness_kind` on object records only and map `makers` unless `field_status.makers` is answered) and `src/registry/rules/rights.ts` (`RIGHTS-MISSING`: `rights.licence` for each family in `NEEDS_RIGHTS`; `RIGHTS-CLEARED` from `publishable` where it applies) Done 2026-11-21: `FAM-REQUIRED` from `REQUIRED`, `RIGHTS-MISSING` from `NEEDS_RIGHTS` (field `rights`). No `when` was needed: a bare map is an object record with no `field_status`.
- [x] T009 [P] [US1] Declare `requires` in `src/registry/rules/provenance.ts` (`PROV-SOURCE`: evidence `source`, `evidence_type`; `PROV-GEOMETRY` with `when` target has a feature) and `src/registry/rules/locators.ts` (`locator.state` with `notYet: 'pending'`, and the fields a verified locator needs only `when` state is `verified`, so a pending stub is not asked for them) Done 2026-11-21: `PROV-SOURCE` only. `PROV-GEOMETRY` and the locator rules do not fire on a bare record, so they declare nothing.
- [x] T010 [P] [US1] Declare `requires` in the remaining rules that demand a field on a bare record at `ready_for_build` or `publishable`: `src/registry/rules/map.ts`, `atlas.ts`, `bibliography.ts` and `essay.ts` (not `rooms.ts`: rooms are never scaffolded); T005 lists any rule still missing a declaration Done 2026-11-21: `MAP-FIELD-STATUS` (from `DISPLAYED_FIELDS`), `MAP-SCOPE`, `MAP-DEALER-ONLY`, `LAYER-THEME`, `LAYER-TIME`, `PLACE-NAMES`, `PLACE-LOCATION`, `SRC-ENTRY`; nothing in `essay.ts`.
- [x] T011 [US1] Implement `checklistFor(family)` in `src/registry/checklist.ts`: collect `requires` from `ALL_RULES` where `family` matches or is `'*'`, split by the rule's `from` into `ready_for_build` and `publishable` (a `publishable` field already in the first list is listed once, in the first), each item `{ field, notYet? }`, stable order; T005 goes green Done 2026-11-21: `src/registry/checklist.ts`; each item carries its rules with their thresholds.
- [x] T012 [US1] Move `slugFromTitle` and the before/after error comparison and rollback out of `src/registry/new-essay.ts` into `src/registry/scaffold.ts` (`withRollback(rootDir, files, write)`), with `new-essay.ts` calling it; the existing `tests/registry/integration/new-essay.test.ts` must pass unchanged (FR-006) Done 2026-11-21: `src/registry/scaffold.ts` (`slugFromTitle`, `writeWithRollback`); `new-essay.test.ts` 8 of 8 unchanged; `slugFromTitle` is still exported from `new-essay.ts`.
- [x] T013 [US1] Implement the stub writer in `src/registry/new-record.ts`: the identity block (`id`, `family`, `origin: minted`, `title`, `slug`, `slug_history: []`, `lifecycle: proposed`, `release: held`, `relations: []`) and the "not yet" values via `yaml`'s `stringify`, then the two commented headings with each remaining field as a commented key, dotted paths written as nested commented keys (`# locator:` / `#   verified_by:`); a stub reparsed by `loadRegistry` has no `LOAD-PARSE` or `FAM-UNKNOWN` finding Done 2026-11-21: `stubText` in `src/registry/new-record.ts`; every checklist field is a top-level commented key.
- [x] T014 [US1] Implement `createRecord(rootDir, family, title)` in `src/registry/new-record.ts`: refuse `room` and unknown families (exit 2, contract messages), `mintNext`, write `content/<family>/<local-id>.yaml` through `withRollback`, return the two-line stdout; T006 goes green Done 2026-11-21.
- [x] T015 [US1] Wire `registry new <family> <title>` in `src/registry/cli.ts` (essay keeps its options and goes to `createEssay`; every other family to `createRecord`) and update the usage text; T007 goes green Done 2026-11-21.
- [x] T016 [US1] Run the US1 rows of quickstart.md on a scratch copy and record the result here Done 2026-11-21 on a copy of the real registry: `new place "Apulum"` wrote `place-000001` (no counter places existed: all are legacy ids) with `# place_type:` before `ready_for_build` and `# names:`, `# location:` before `publishable`; `new evidence` wrote `evidence-000016` with `source`, `evidence_type`, `rights`; gate PASS, 313 entities, 0 errors; `new room` exit 2.

### Documentation (same PR)

- [x] T017 [P] [US1] Update `specs/001-scholarly-registry/contracts/cli.md` and the README's registry section for `registry new <family>`; note that R calls `mint` or `new` through `system2()` and never computes an ID Done 2026-11-21: `specs/001-scholarly-registry/contracts/cli.md` and the README's registry section.
- [x] T018 [P] [US1] Add the US1 row to `docs/confluence/build-log-spec-010.md` (including the second checklist heading, research R1, and FR-007 narrowed until the first R pipeline, research R5) and the dossier's status; `npm run status -- --write` Done 2026-11-21: Build Log row #127; dossier §12.
- [x] T019 [US1] Run `npm test`, `npm run typecheck`, `npm run registry -- check --dir .` and `npm run status -- --check`; all green Done 2026-11-21: `npm test` 235 files, 2957 passed, 10 skipped; `typecheck` and `lint:css` clean; gate on the real registry PASS, 311 entities, 0 errors, 111 warnings (unchanged); `status --check` passes.
- [x] T020 [US1] Jira: TCX-62 In Progress when started, In Review with the PR, Done at merge with `gate` green; its description points at this file Done: TCX-62 is Done (recorded 2026-11-22, `/speckit-analyze` finding U1).

**Checkpoint**: MVP. Every new record can be created without typing an ID.

---

## Phase 4: User Story 2 — What would a correction touch? (P2) · TCX-63

**Goal**: one graph of every record and reference, held included, written beside the integrity report and queried by `registry deps <id>`.

**Independent test**: on a fixture chain (entry ← source ← evidence ← essay), the query for the entry lists the source as direct and the evidence and essay as indirect with paths; the graph file validates against the contract (quickstart.md US2).

### Tests (write first, see them fail)

- [ ] T021 [P] [US2] Write `tests/registry/unit/dependents.test.ts`: (1) on a built chain entry ← source ← evidence ← essay, `dependentsOf(graph, entry)` gives `direct` = source with field `entry`, `indirect` = evidence and essay, each with the path of `{ id, field }`; (2) a held referrer is listed with `held: true`; (3) a two-record cycle terminates and lists each record once; (6) over `generateRegistry(200, 1)` the edge set equals every `(record, referenceFields(record))` pair minus self-references; an edge to a missing ID makes a node with `unknown: true`; a record with `same_as[]` gets no edge for it (spec edge case)
- [ ] T022 [P] [US2] Write `tests/registry/integration/deps-cli.test.ts`: (4) `registry deps tc:tc:place:place-999999` exits 1 with `registry deps: no record …` on stderr; a known ID prints `direct (n)` and `indirect (n)` sections, and `--json` prints `{ id, direct, indirect }`; (5) `registry check --dir <fixture> --out <tmp>` writes `dependents.json` and `dependents.html` beside `integrity-report.json`, the JSON validates against `specs/010-authoring-tooling/contracts/dependents.schema.json`, and both are written when the gate fails too
- [ ] T023 [P] [US2] Add a case to `tests/registry/performance.test.ts`: building the graph and querying the most-referenced record of the real registry takes under 5 s (SC-004)
- [ ] T024 [P] [US2] Write `tests/registry/unit/dependents-html.test.ts`: the viewer is one HTML document with no `<script>`, one section per record that has dependents, held records marked in text (not colour alone, Principle IX), and every ID escaped

### Implementation

- [ ] T025 [US2] Implement `buildDependents(records)` and `dependentsOf(graph, id)` in `src/registry/dependents.ts` (research R6: edges from `referenceFields`, breadth-first over reversed edges, first path kept, visited set); T021 goes green
- [ ] T026 [US2] Implement the viewer in `src/registry/dependents-html.ts`, following `src/registry/report-html.ts`; T024 goes green
- [ ] T027 [US2] Write both files from `registry check --out` in `src/registry/check.ts` (with `commit`, `generated_at`, `counts`), and add `registry deps <id> [--json]` to `src/registry/cli.ts` with usage text; T022 and T023 go green
- [ ] T028 [P] [US2] Confirm `dist/` never contains `dependents.*` after `npm run build` (add the assertion to an existing build-output test) and that `.github/workflows/registry.yml` already uploads `reports/` (no workflow change)
- [ ] T029 [P] [US2] Update `specs/001-scholarly-registry/contracts/cli.md`, the README, the Build Log row and the dossier
- [ ] T030 [US2] Full checks green (`npm test`, `typecheck`, gate, `status --check`); Jira TCX-63 through In Progress → In Review → Done at merge

**Checkpoint**: the editor can see what a correction touches before making it.

---

## Phase 5: User Story 3 — The editor knows the schema (P2) · TCX-61

**Goal**: uncommitted JSON Schemas per family, generated from Zod, with definitions on the eight shared vocabularies (seven from the glossary, the analytical dimensions from `FRAMEWORK.md`) and ID suggestions on reference fields, wired into VS Code.

**Independent test**: generated schemas accept every record the gate accepts structurally and reject seeded typos; every vocabulary value carries its definition (quickstart.md US3).

### Tests (write first, see them fail)

- [ ] T031 [P] [US3] Write `tests/registry/unit/glossary.test.ts`: `vocabularyDefinitions(glossaryText)` returns a definition for every value of `LIFECYCLE_VALUES`, `RELEASE_VALUES`, `CONFIDENCE_VALUES`, `GEOMETRY_PROVENANCE_VALUES`, `SILENCE_STATE_VALUES`, `LOCATOR_STATE_VALUES`, `EVIDENCE_TYPE_VALUES` from the real `GLOSSARY.md`, and for every value of `ANALYTICAL_DIMENSION_VALUES` from the real `FRAMEWORK.md`; the expected count is computed from the constants, never typed (amended 2026-11-22: "43" was wrong); on a fixture glossary or framework missing one value it throws naming the value; on a fixture with an extra row or section it throws naming it (FR-012, research R4)
- [ ] T032 [P] [US3] Add `ajv` (exact version, devDependency only, for tests) and write `tests/registry/unit/editor-schema.test.ts`: (1) `editorSchemas(records, glossary)` returns one schema per family in `FAMILIES`; `.schemas/` is in `.gitignore`; (3) every record on `main` that loads and has no `FAM-UNKNOWN` or `ENUM-INVALID` finding validates against its family's schema, and a seeded set (a misspelt top-level field, an unknown value in each of the seven glossary vocabularies, and an unknown entry in `analytical_dimensions` and in `portal_dimensions`) is rejected by both the schema and the gate (SC-005); (4) a reference field's `anyOf` holds `{ const, description }` for each record of the expected family and a plain `{ type: 'string' }`, so an ID not in the list still validates; (5) `.vscode/settings.json` maps `content/<family>/*.yaml` to `./.schemas/<family>.json` for every family, and `.vscode/extensions.json` recommends `redhat.vscode-yaml`

### Implementation

- [ ] T033 [US3] **(author to approve)** Add a **Vocabulary values** section to `GLOSSARY.md`: one table per vocabulary (`lifecycle`, `release`, `confidence`, `geometry_provenance`, `silence_state`, `locator.state`, `evidence_type`), `| value | definition |`, one row per value, drafted from ADR 0003 §1–§4 and the existing glossary rows; the PR asks Vlad to confirm every definition. The analytical dimensions get no table here: their definitions live in `FRAMEWORK.md` (Principle XI)
- [ ] T034 [US3] Implement `vocabularyDefinitions` in `src/registry/glossary.ts` (parse the glossary section's tables and, for the analytical dimensions, `FRAMEWORK.md`'s dimension sections; two-way check against the constants); T031 goes green
- [ ] T035 [US3] Implement `editorSchemas(records, definitions)` in `src/registry/editor-schema.ts` (research R7): `z.toJSONSchema` on each family schema, then top-level `additionalProperties: false`, `enum` + `markdownEnumDescriptions` on the seven glossary vocabularies and on the items of `analytical_dimensions[]` (from `FRAMEWORK.md`), `enum` with the Portal facet description on the items of `portal_dimensions[]`, `enum` on `origin`, `role`, `form`, `section`, `locator.proposed_by`, and the `anyOf` suggestions on every path in `src/registry/schemas/references.ts`
- [ ] T036 [US3] Write `scripts/editor-schemas.ts` (writes `.schemas/<family>.json` and `.schemas/index.json`; `--soft` reports and exits 0) and add to `package.json`: `"schemas": "tsx scripts/editor-schemas.ts"`, `"postinstall": "tsx scripts/editor-schemas.ts --soft"`, `"predev"` and `"prebuild"` running `npm run schemas`; add `.schemas/` to `.gitignore`
- [ ] T037 [P] [US3] Add `.vscode/settings.json` (the `yaml.schemas` mapping for all 15 families) and `.vscode/extensions.json`; T032 goes green
- [ ] T038 [US3] Confirm `npm ci` in a clean clone still succeeds when generation fails (temporarily break one glossary row locally) and that `npm run build` then fails with the value named; record the result here
- [ ] T039 [US3] Open `content/place/` in VS Code with the extension and check the three behaviours in quickstart.md US3 by hand; record the result here
- [ ] T040 [P] [US3] Update the README (editor setup), the Build Log row and the dossier
- [ ] T041 [US3] Full checks green; Jira TCX-61 through In Progress → In Review → Done at merge

**Checkpoint**: typos are caught at the keyboard; the gate is unchanged.

---

## Phase 6: User Story 4 — A dead link becomes a ticket, never an edit (P3) · TCX-64

**Goal**: a weekly workflow that checks every external URL records depend on, opens one Jira issue per dead URL, a review issue per changed manifest, and one pull request proposing archived copies, and writes no record itself.

**Independent test**: against a fixture registry and stub network, Jira, GitHub and Wayback: one issue per broken URL, none duplicated on a second run, a review issue for a changed manifest, a pull request for a verified locator without an archived copy, and no file under `content/` changed by the run (quickstart.md US4).

### Record fields (tests first)

- [ ] T042 [P] [US4] Write `tests/registry/unit/locator-archived.test.ts` with valid and invalid fixtures: `archived_copy` without `archived_on`, `archived_on` without `archived_copy`, an `http:` URL, a date that is not `YYYY-MM-DD`, and a future date each give `LOC-ARCHIVED` at `always`; both present and valid give nothing; and add a named mutation `a locator has an archived copy with no date` → `LOC-ARCHIVED` to `tests/registry/support/mutations.ts`
- [ ] T043 [US4] Add `archived_copy` and `archived_on` (both `z.string().optional()`) to `LocatorShape` in `src/registry/schemas/evidence.ts` and the rule `LOC-ARCHIVED` (from `always`) to `src/registry/rules/locators.ts`; add its row to `specs/001-scholarly-registry/contracts/rule-ids.md`, the two fields to `specs/001-scholarly-registry/data-model.md`, and run `npm run status -- --write`; T042 goes green and T003 still passes

### Checker tests (write first, see them fail)

- [ ] T044 [P] [US4] Write `tests/linkcheck/collect.test.ts`: from a fixture registry, `collectUrls(records)` returns each URL once with every `{ id, file, field }` using it, from locator `consulted_copy` (all `https?://` URLs in the text), map `images[].url` and `static_url`, bibliography `digital_copy` and dataset `upstream.url`, held records included; `same_as[]` values are not collected
- [ ] T045 [P] [US4] Write `tests/linkcheck/probe.test.ts` with a fake clock and a stub `fetch`: 404, 410 and DNS failure on all three attempts → `dead`; 429, 5xx and timeout on all attempts → `unreachable`; a success on the third attempt → `ok`; `HEAD` rejected (405) falls back to a ranged `GET`; no two requests to one host less than 1 s apart; backoff 2 s then 8 s
- [ ] T046 [P] [US4] Write `tests/linkcheck/manifest.test.ts` with IIIF Presentation 2 and 3 fixtures: the fingerprint is the sorted canvas IDs and their count; a reordered manifest has the same fingerprint, one with a canvas added or an ID changed does not; `diffFingerprint` lists added and removed IDs
- [ ] T047 [P] [US4] Write `tests/linkcheck/jira.test.ts` against an in-memory Jira: `reportDead(url, uses, status)` creates one Task in TCX with summary `Dead link: <host><path>` and labels `linkcheck`, `linkcheck-<hash12>`; called again it updates that issue and creates none; `reportRecovered` adds a comment and does not close; `reportManifestChange` creates a Low-priority issue labelled `linkcheck-manifest-<hash12>` naming the maps and layer georeferences (contracts/link-check.md)
- [ ] T048 [P] [US4] Write `tests/linkcheck/archive.test.ts` with stub Wayback and GitHub: only locators with `state: verified`, a `consulted_copy` URL and no `archived_copy` are proposed; a snapshot found adds exactly `locator.archived_copy` and `locator.archived_on` to that record file and nothing else; no snapshot, no change; all changes of one run go on branch `linkcheck/archived-copies-<date>` in one pull request; nothing is merged and nothing is pushed to `main`
- [ ] T049 [P] [US4] Write `tests/linkcheck/run.test.ts` over two consecutive runs with every client stubbed: (2) one issue per dead URL, none duplicated on run two; an unreachable URL opens an issue only on its third consecutive unreachable run; (3) a dead `consulted_copy` on a verified locator leaves every file under `content/` byte-for-byte as before (the run's own working tree; the archive PR is a separate branch); (4) a manifest changed between runs opens one review issue; a missing `JIRA_API_TOKEN` or `JIRA_USER` fails before any request; `--dry-run` makes no request and writes nothing
- [ ] T050 [P] [US4] Write `tests/linkcheck/isolation.test.ts` (SC-008): follow static imports from `src/registry/cli.ts`, `astro.config.mjs` and every file under `src/pages/` and assert none reaches `src/linkcheck/`

### Checker implementation

- [ ] T051 [P] [US4] Implement `src/linkcheck/collect.ts`; T044 goes green
- [ ] T052 [P] [US4] Implement `src/linkcheck/probe.ts` (injected `fetch` and clock, per-host queue, retries, dead/unreachable/ok); T045 goes green
- [ ] T053 [P] [US4] Implement `src/linkcheck/manifest.ts`; T046 goes green
- [ ] T054 [P] [US4] Implement `src/linkcheck/jira.ts` (Jira Cloud REST v3 through an injected HTTP client: search by JQL `project = TCX AND labels = "linkcheck-<hash12>"`, create, edit, comment); T047 goes green
- [ ] T055 [US4] Implement `src/linkcheck/archive.ts` (Wayback save and availability) and `src/linkcheck/pull-request.ts` (edit the two locator fields with `yaml`'s document API so comments and order are kept, commit on the run branch, open one PR through an injected GitHub client); T048 goes green
- [ ] T056 [US4] Implement `src/linkcheck/run.ts` (load registry, collect, probe, compare with `linkcheck-state.json`, report, propose archived copies, write the new state) and `scripts/link-check.ts` (`--dir`, `--state`, `--dry-run`; real clients built from `JIRA_USER`, `JIRA_API_TOKEN`, `GITHUB_TOKEN`); T049 and T050 go green
- [ ] T057 [US4] Add `.github/workflows/link-check.yml` per contracts/link-check.md: `schedule` `17 3 * * 1` and `workflow_dispatch`; `permissions: contents: write, pull-requests: write`; `actions/cache` for `linkcheck-state.json`; not referenced by `gate` in `registry.yml`
- [ ] T058 [US4] Run `npx tsx scripts/link-check.ts --dir . --state /tmp/state.json --dry-run` against the real registry and record here how many URLs and hosts it collects
- [ ] T059 [P] [US4] Update the README (what the checker does and never does), the Build Log row, the dossier and the Decision Log entry `docs/confluence/decision-log-tc-d042.md` (TC-D042) if anything in it changed
- [ ] T060 [US4] Full checks green (`npm test`, `typecheck`, gate, `status --check`)
- [ ] T061 [US4] **(author)** Add the Actions secrets `JIRA_USER` and `JIRA_API_TOKEN` to the repository
- [ ] T062 [US4] **(author)** After merge, run the `link-check` workflow once by hand, confirm issues carry `linkcheck-*` labels, run it again and confirm none is duplicated; record the result here; then Jira TCX-64 → Done

**Checkpoint**: link rot is reported weekly; no record changes without a person merging it.

---

## Phase 7: Polish & cross-cutting concerns

- [ ] T063 [P] Run `quickstart.md` end to end and fix anything it exposes
- [ ] T064 Run the `code-review` skill against f0a9230 (standards and spec axes) and address the findings
- [ ] T065 [P] Re-run T003 (`rules-not-weakened`) and record the final rule count and the rules spec 010 added (`LOC-ARCHIVED`)
- [ ] T066 Update Jira (TCX-59 description; TCX-61 to TCX-64 statuses), the spec 010 dossier, Build Log section AD and the Decision Log draft (workflow step 4); publishing to Confluence follows the merge and holds no story open

---

## Dependencies & Execution Order

- Setup → Foundation → stories. T003 (the guard) and T004 (`requires`) block US1; US2, US3 and US4 need only T003.
- US1: T005–T007 (tests) → T008–T010 (declarations, parallel by file) → T011 → T012 → T013 → T014 → T015.
- US2: T021–T024 (tests) → T025 → T026 → T027.
- US3: T031–T032 (tests) → T033 (author approves the definitions) → T034 → T035 → T036 → T037.
- US4: T042 → T043 (record fields first, in the registry); T044–T050 (tests) → T051–T054 (parallel) → T055 → T056 → T057. T061 and T062 are the author's and come last.
- The stories are independent of each other; each ends in its own PR.

### Parallel opportunities

- Every test task within a story is [P]; within US1, the declarations T008–T010 touch different rule files; within US4, `collect`, `probe`, `manifest` and `jira` are separate modules.
- The author's inputs (T033's definitions, T061's secrets) can be asked for now and run alongside the code.

### Parallel example: User Story 4

```text
T044 collect.test.ts   T045 probe.test.ts   T046 manifest.test.ts   T047 jira.test.ts
→ T051 collect.ts      T052 probe.ts        T053 manifest.ts        T054 jira.ts
```

## Implementation Strategy

MVP is US1: once `registry new <family>` exists, no ID is typed by hand again (SC-001), which is the only integrity gain in the spec; everything after it is convenience. Then US2 (seeing what a correction touches), US3 (typos at the keyboard) and US4 (link rot). One story per pull request, red then green, Jira and the dossier updated in the same PR. The author's two inputs are the critical path for their stories: the vocabulary definitions for US3 and the Jira secrets for US4.
