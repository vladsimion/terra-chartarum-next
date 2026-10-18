---

description: "Task list for 003 Essay Framework & Editorial Pipeline"
---

# Tasks: Essay Framework & Editorial Pipeline

**Input**: Design documents from `/specs/003-essay-framework/`

**Prerequisites**: plan.md, spec.md (clarified 2026-10-16), research.md, data-model.md, contracts/ (cli-additions.md, essay-rule-ids.md, mdx-body.md, citations-and-exports.md), quickstart.md. Decisions: ADR 0010; ADR 0006 and ADR 0002 amendments of 2026-10-16.

**Tests**: REQUIRED (Constitution X). Every acceptance scenario has an automated test written first, and each story is built red → green with the `tdd` skill: in every phase the test tasks come first and must be seen failing before the task that makes them pass. Refactoring happens in review, not inside the loop. Every new rule gets a named mutation in the same task that adds it (the rule-coverage test fails otherwise).

**Seams** (to confirm with Vlad at T001): (1) the registry through `validateRegistry` and the CLI `main` (rules, `promote`, `new essay`); (2) the pure body scanner `essay-body.ts`; (3) the pure citation module `citations.ts` (CSL-JSON in, strings out); (4) the built essay pages through Playwright. No test reaches inside a component.

**Organization**: Grouped by user story. Slice order: **Foundation → US2 → US3 (registry half) → US1 → US4 → US3 (site half) → Polish**. The registry half (Foundation, US2, US3's first part) needs no Astro and can be built before spec 002 lands. The site half (US1, US4, US3's site tests) needs spec 002's shell (its US1 and the registry integration, T040 there). US5 is out of v1 and has no tasks.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1–US4, matching `spec.md`
- Paths are relative to the repository root. Registry tests are under `tests/registry/`, site tests under `tests/essays/`.
- Jira: each story's checklist is copied into its TCX story under epic TCX-4 (TCX-23 US1, TCX-24 US2, TCX-25 US3, TCX-26 US4, TCX-27 US5 out of v1); Jira and Confluence are updated after each story (workflow step 4); `/speckit-taskstoissues` is not used.

---

## Phase 1: Setup

- [x] T001 Agree the four seams above with Vlad (tdd skill) and record any change here (done 2026-10-18: confirmed unchanged; the registry tests also use two shared test supports, `tests/registry/support/essays.ts` for a valid essay at any stage and `disk.ts` to write a registry to a temporary root for the CLI)
- [ ] T002 [P] (US2 builds the registry in code through `support/essays.ts` and `support/disk.ts`; the checked-in `fixtures/essays/` tree is still needed for the US3 and site slices) Create `tests/registry/fixtures/essays/` with a valid mini registry (the seven rooms, two maps with rights, a source and an Evidence record with a verified locator, a pending-locator Evidence record, a finding-aid source, three bibliography entries in different sections, a layer, and essays at several stages) and a few invalid variants named for the rule they trip

---

## Phase 2: Foundation (registry; blocks every story)

**Goal**: the essay schema, the stage table, the body scanner and the public allowlist, all pure.

- [x] T003 [P] Write failing `tests/registry/unit/essay-schema.test.ts`: a record with every clarified FR-001 field loads and types correctly; `FAM-UNKNOWN` still rejects an unlisted field; the typed references (`layers` → layer, `bibliography` → bibliography entry, `rooms.primary` and `rooms.secondary[]` → room) resolve through `REF-UNKNOWN` and `REF-FAMILY`; a bibliography entry accepts a `section` of the seven values and rejects another (FR-001, FR-005, FR-014) (done: `tests/registry/unit/essay-schema.test.ts`, 15 tests)
- [x] T004 Implement the extended `src/registry/schemas/essay.ts`, `src/registry/schemas/bibliography-section.ts`, the `section` field on `bibliography_entry`, `src/registry/accent-slots.ts` (the six slot names of spec 002's data model), and the nested `rooms` references in `src/registry/schemas/references.ts`; update spec 001's data-model Essay section to point at spec 003's (done; the accent list is owned by `src/registry/accent-slots.ts` and `src/shell/accents.ts` re-exports it, so spec 002's token test still guards one list; `rooms.primary` and `rooms.secondary[]` are reference fields through a dotted-path reader in `references.ts`; `section` is judged by `ENUM-INVALID`)
- [x] T005 [P] Write failing `tests/registry/unit/stages.test.ts`: the nine stages in order; the derived lifecycle for each (ADR 0003 §2); `nextStage` returns the one after, nothing after Cross-link; the cumulative check table lists, for each stage, every rule of that stage and of all earlier ones (done: `stages.ts` already held the nine stages and `lifecycleFor`; the test adds `nextStage`, `stageAtLeast`, `STAGE_CHECKS` and `checksFor`)
- [x] T006 Implement `src/registry/stages.ts` (stage order, derived lifecycle, `nextStage`, the cumulative table keyed by rule ID from [contracts/essay-rule-ids.md](./contracts/essay-rule-ids.md)) (done)
- [x] T007 [P] Write failing `tests/registry/unit/essay-body.test.ts`: the scanner returns the tags and literal props of `MapFigure`, `Cite`, `EvidencePanel`, `Interaction` and `CitationExport`; a computed prop (an expression, a variable) is reported as dynamic; text that merely looks like a tag inside a code fence is ignored; a body that does not exist yields no references and a flag (done: 17 tests; backticks inside a tag's own attribute are not treated as inline code)
- [x] T008 Implement `src/registry/essay-body.ts`; make `loadRegistry` read the `.mdx` beside each essay record and attach the result as the in-memory `body` (never a YAML field); exempt `body` from `FAM-UNKNOWN` the way `file` is (done: `loadRegistry` attaches `body` to essays only; an essay YAML that stores its own `body` is a load error; `FAM-UNKNOWN` exempts `body` for essays only)
- [x] T009 [P] Write failing additions to `tests/registry/integration/projection.test.ts`: an essay's public projection includes `question`, `thesis`, `rooms`, `layers`, `bibliography`, `accent`, `authors`, `published_on` and `interactions`, and never `jira`, `signoffs`, `stage_history`, `open_questions`, `legacy_url` or `redirect_switched` (done: in `projection.test.ts`)
- [x] T010 Implement the essay allowlist in `src/registry/project.ts` (research.md R11) (done: `rooms` and `interactions` are projected field by field with only public IDs; `layers` and `bibliography` join the filtered list references)

**Checkpoint**: the schema, stage table, scanner and allowlist pass their unit tests; no rule uses them yet.

---

## Phase 3: User Story 2 — Move an essay through the editorial stages (P1)

**Goal**: the `ESSAY-*` rules, `registry promote` and `registry new essay`.

**Independent Test**: an essay fixture at Draft with an unresolved reference cannot be promoted to Build; the validator names the failed rule.

- [x] T011 [P] [US2] Write failing `tests/registry/unit/essay-history.test.ts`: `ESSAY-HISTORY` accepts a contiguous history ending at `stage`, and rejects a skipped stage, a repeated stage, a history that does not start at Concept, a last entry that differs from `stage`, and an entry without `on` or `by` (AC 2.6, SC-002) (red 2026-10-18: `tests/registry/unit/essay-history.test.ts`, 10 tests, all failing for the missing rule or command)
- [x] T012 [P] [US2] Write failing `tests/registry/unit/essay-stages.test.ts`: for each of `ESSAY-QUESTION`, `ESSAY-ROOMS`, `ESSAY-ACCENT`, `ESSAY-CORPUS`, `ESSAY-RESEARCH`, `ESSAY-OUTLINE`, `ESSAY-BUILD`: silent below its stage, an error at and above it, with the fixture variants (missing question, three secondary rooms, secondary equal to primary, unknown accent, a corpus map that does not resolve or has no rights, no evidence, no thesis, a layer that does not resolve) (AC 2.1, 2.2) (red 2026-10-18: `tests/registry/unit/essay-stages.test.ts`, 164 tests over 19 cases x 9 stages, all failing for the missing rule or command)
- [x] T013 [P] [US2] Write failing `tests/registry/unit/essay-interactions.test.ts`: `ESSAY-INTERACTION` rejects a declaration missing `question`, `interpretation` or evidence, an unresolved evidence ID, a body `<Interaction id>` that is not declared, and, from Build, a declaration the body never uses (AC 2.3, FR-007) (red 2026-10-18: `tests/registry/unit/essay-interactions.test.ts`, 11 tests, all failing for the missing rule or command)
- [x] T014 [P] [US2] Write failing `tests/registry/unit/essay-draft.test.ts`: `ESSAY-DRAFT` rejects a missing body, a `<Cite>` to an Evidence record that does not resolve and one whose source is a finding aid; `ESSAY-BODY-DYNAMIC` rejects a computed prop (FR-004) (red 2026-10-18: `tests/registry/unit/essay-draft.test.ts`, 15 tests, all failing for the missing rule or command)
- [x] T015 [P] [US2] Write failing `tests/registry/unit/essay-signoffs.test.ts`: `ESSAY-SIGNOFF` requires all three sign-offs with a name and a valid date, and `design_qa_passed: true`, from Publish; `ESSAY-PUBLISH` requires `release: released` and a valid EDTF `published_on` (AC 2.4, 2.7, FR-011) (red 2026-10-18: `tests/registry/unit/essay-signoffs.test.ts`, 14 tests, all failing for the missing rule or command)
- [x] T016 [P] [US2] Write failing `tests/registry/unit/essay-body-public.test.ts`: `ESSAY-BODY-PUBLIC` fails at Publish when a map figure, layer, citation or evidence panel in the body points at an entity that is not published and released, and passes when only metadata references a held entity (FR-017) (red 2026-10-18: `tests/registry/unit/essay-body-public.test.ts`, 9 tests, all failing for the missing rule or command)
- [x] T017 [P] [US2] Write failing `tests/registry/unit/essay-crosslink.test.ts`: `ESSAY-CROSSLINK` requires `redirect_switched` with a name and a date when `legacy_url` is set at Cross-link, and asks nothing when it is not (AC 2.5, FR-013) (red 2026-10-18: `tests/registry/unit/essay-crosslink.test.ts`, 5 tests, all failing for the missing rule or command)
- [x] T018 [P] [US2] Write failing `tests/registry/integration/promote.test.ts`: `registry promote` moves an essay one stage, writes `stage` and the derived `lifecycle`, appends a history entry with today's date and `--by`, keeps the file's comments and key order; refuses a skipped stage, a failing check (naming the rule) and an unknown essay; `--check` writes nothing; the Publish run prints the CI requirement (ADR 0010) (red 2026-10-18: `tests/registry/integration/promote.test.ts`, 15 tests, all failing for the missing rule or command)
- [x] T019 [P] [US2] Write failing `tests/registry/integration/new-essay.test.ts`: `registry new essay` writes a valid Concept record and an `.mdx` stub with a minted ID, a derived slug and a one-entry history, passes `registry check`, and removes what it wrote and exits 1 if the result is invalid; a non-existent room or an empty title exits 2 (FR-015, SC-004) (red 2026-10-18: `tests/registry/integration/new-essay.test.ts`, 8 tests, all failing for the missing rule or command)
- [x] T020 [US2] Implement `src/registry/rules/essay.ts` with all fifteen rules of [contracts/essay-rule-ids.md](./contracts/essay-rule-ids.md), stage-gated through `stages.ts`, register them in `rules/index.ts`, add one named mutation each to `tests/registry/support/mutations.ts`, and add the rows to `specs/001-scholarly-registry/contracts/rule-ids.md`; make T011 to T017 pass (done 2026-10-18: `src/registry/rules/essay.ts`, every rule `from: 'always'` and gated on the essay's stage through `stageAtLeast`; 15 mutations in `tests/registry/support/mutations.ts`; rows in rule-ids.md with From `always`; the synthetic generator now writes valid essays; the shell fixture registry gained a map, cartographer, source, evidence, bodies and full histories so its four essays pass, and its held essay moved from Publish to Design QA because Publish requires `release: released`)
- [x] T021 [US2] Implement `src/registry/promote.ts` and `src/registry/new-essay.ts` (the `yaml` Document API, atomic writes), wire `promote` and `new` into `src/registry/cli.ts` and its usage text, and document them in `specs/001-scholarly-registry/contracts/cli.md`; make T018 and T019 pass (done 2026-10-18: `src/registry/promote.ts`, `src/registry/new-essay.ts`, wired in `cli.ts`; `validateLoaded` added to `check.ts`; promote takes the full stable ID and never sets `release`, `signoffs` or `published_on`)
- [x] T022 [US2] Update spec 001's `tasks.md`: T123 is resolved for essays (rooms are essay-only) and T124 loses the essay fields; Jira: copy this phase's checklist into TCX-24 and update the epic (workflow step 4) (done 2026-10-18: spec 001 T123 ticked, T124 narrowed; TCX-24 checklist current)

**Checkpoint**: an essay can be scaffolded, promoted stage by stage and refused when a check fails, entirely from the command line; `npm test` is green.

---

## Phase 4: User Story 3 — Hold an essay safely (P1), registry half

**Goal**: a held essay leaks nothing from the registry's outputs.

**Independent Test**: build with one held essay referencing a public layer; grep the built output for the held title and slug: zero matches.

- [x] T023 [US3] Write failing `tests/registry/integration/held-essay.test.ts`: with a held essay that references a public layer, `registry build` output (`_redirects`, `data/relations.json`) and `registry scan` contain none of its title, slug, ID or anchors, a public essay that lists it in `relations[]` does not list it, and the essay's own cards and exports are not generated (AC US3, FR-006, SC-001) (done 2026-10-18: 10 tests; red for two gaps only, the held title and the `/essays/<slug>` address; the build output, relations index and referrer lists already held nothing. An anchor is only ever the fragment of the essay's address, so the address check covers it)
- [x] T024 [US3] Make T023 pass (extend the build command and the public projection only where it fails) and add the held essay to the fixtures from T002 (done 2026-10-18: only `leak-scan.ts` needed to change, adding the title of a non-public essay and the plural page address; the held essay is built in code by the test, like US2's registries, so the checked-in `fixtures/essays/` tree of T002 is still open. Open question for you: the registry's `pagePath` and `_redirects` use `/essay/<slug>/` while the site and spec 003's contracts use `/essays/<slug>/`)

---

## Phase 5: User Story 1 — Read a visual essay as an argument (P1), site half

**Goal**: an essay page from the record and its MDX body, with figures, citations, the evidence panel, the seven-section bibliography, rooms and related lists, and the exports.

**Independent Test**: one fixture essay with two embedded map references and a bibliography renders; each map links to its catalogue record; the bibliography shows the seven sections (empty ones hidden).

*Needs spec 002's shell (its US1) and the registry integration (its T040).*

- [x] T025 Add the site-side dependencies, each pinned to an exact version at least two weeks old (`@astrojs/mdx`, `@citation-js/core`, `@citation-js/plugin-csl`, `@citation-js/plugin-bibtex`, `@citation-js/plugin-ris`) and vendor the Chicago notes-bibliography style and locale under `src/essays/csl/` unmodified, with the CC BY-SA 3.0 attribution (research.md R2) (done 2026-10-18: `@astrojs/mdx` 8.0.2 (8.0.3 and 8.1.0 are under two weeks old) and `@citation-js/*` 0.9.0, all pinned exact; the 18th-edition Chicago style and en-US locale are in `src/essays/csl/` unmodified with a README giving source commit and licence; `npm audit` shows 5 high findings, all in the existing stylelint chain, none from the new packages)
- [x] T026 [P] [US1] Write failing `tests/essays/unit/citations.test.ts`: from CSL-JSON plus a locator the module returns a Chicago note and a Chicago bibliography item (golden strings written by hand from the style's published examples, not recomputed); a verified locator shows who and when; a pending locator is marked with text; and an entry with no CSL file reports a clear error (red then green 2026-10-18: `tests/essays/unit/citations.test.ts`, 17 tests; goldens follow the 18th edition, which drops the place of publication)
- [x] T027 [P] [US1] Write failing `tests/essays/unit/exports.test.ts`: BibTeX, RIS and CSL-JSON for an essay carry the title, authors, `published_on`, the stable URL and the access date, which is `SOURCE_DATE_EPOCH` when set (FR-009) (red then green 2026-10-18: `tests/essays/unit/exports.test.ts`, 12 tests)
- [x] T028 [P] [US1] Write failing `tests/essays/unit/bibliography.test.ts`: entries group into the seven sections in the constitution's order, an empty section is absent, an entry appears once (FR-005) (red then green 2026-10-18: `tests/essays/unit/bibliography.test.ts`, 7 tests)
- [x] T029 [P] [US1] Write failing `tests/essays/unit/figure.test.ts`: a `MapFigure` caption, attribution and rights come from the map's public record and never from body text, and a body that copies a referenced record's title or caption literally is reported (FR-004, SC-003, AC 1.1) (red then green 2026-10-18: `tests/essays/unit/figure.test.ts`, 12 tests; a map figure links to spec 004's `/collection/<slug>/`)
- [x] T030 [P] [US1] Write failing `tests/essays/unit/related.test.ts`: the room list shows the primary room first and the secondary rooms; related essays come from `relations[]`, are public essays only, in title order, and a held one is absent (AC 1.3) (red then green 2026-10-18: `tests/essays/unit/related.test.ts`, 10 tests)
- [x] T031 [P] [US1] Write failing `tests/essays/e2e/essay-page.spec.ts` and `tests/essays/e2e/citation.spec.ts`: the fixture essay page shows the thesis up front, two figures that link to their catalogue records, the seven-section bibliography, the room and related lists, and activating a citation shows source, locator and verification state, with JavaScript disabled too (AC 1.1 to 1.4) (done 2026-10-18: `tests/essays/e2e/essay-page.spec.ts` and `citation.spec.ts`, 36 runs on Chromium light and dark and a no-JavaScript project, axe clean; run by `npm run test:e2e:essays` against its own build, `playwright.essays.config.ts`; they ran red first because no page existed. Firefox and WebKit are not in this config. Locally Playwright 1.63 does not support this Mac, so they ran through `PW_CHROMIUM_PATH` pointing at an older installed Chromium; CI uses its own install)
- [x] T032 [US1] Implement `src/essays/citations.ts`, the components `MapFigure`, `Cite`, `EvidencePanel`, `Bibliography`, `RoomLinks`, `RelatedEssays` and `CitationExport` in `src/essays/components/`, `EssayLayout.astro` (through spec 002's Base layout, accent from the record) and `src/pages/essays/[slug].astro` plus the export endpoints, generating pages only from the public projection; make T026 to T031 pass (done 2026-10-18: components in `src/essays/components/`, `page-model.ts` and `site-data.ts`, `src/pages/essays/[slug].astro` and the three export endpoints; essay bodies are an Astro content collection in `src/content.config.ts`; the components read the page model from `Astro.locals` and take only a record id; a body that names something not public, a source with no bibliography entry, or text copied from a map record fails the build with the essay and the thing named. Pulled forward from spec 006: the Source field `entry`, its typed reference and public projection, because a citation cannot reach its CSL-JSON without it; requiring it stays with spec 006 `SRC-ENTRY`)
- [x] T033 [US1] Build the fixture essay registry for the site (neutral content exercising every contract: two map figures, a pending and a verified citation, one declared interaction, all seven sections, a secondary room, a related essay) under `tests/essays/fixtures/registry/`, built only under the test environment, and add the essay page type to `tests/shell/ci-templates.json` so axe and Lighthouse cover it (done 2026-10-18: `tests/essays/fixtures/registry/`, 23 records that pass the gate, with the seven bibliography sections, one pending and one verified locator and a related essay; the essay page type is in `tests/shell/ci-templates.json` as `/essays/terra-nova/` and the shell fixture gained the bibliography entry it needs, so the shell build, axe and Lighthouse cover the page type. The Interaction declaration waits for US4)
- [ ] T034 [US1] Jira: copy this phase's checklist into TCX-23 and update the epic

---

## Phase 6: User Story 4 — Shared interaction components (P2)

**Goal**: the declaration contract, the citation/export control and the evidence panel meet the component rules; the other components wait for an essay that needs them.

**Independent Test**: each shipped component has a documented question it serves, keyboard operation, a reduced-motion variant and a no-JS fallback.

- [x] T035 [P] [US4] Write failing `tests/essays/e2e/components.spec.ts`: for the `Interaction` wrapper, the citation/export control and the evidence panel: keyboard operation with visible focus, a static equivalent under `prefers-reduced-motion`, working with JavaScript off, and the declared question and expected interpretation shown above an interaction
- [x] T036 [P] [US4] Write failing `tests/essays/unit/component-docs.test.ts`: every component in `src/essays/components/` has a documentation entry stating the question it serves, its keyboard model, its reduced-motion behaviour and its no-JS fallback (US4)
- [x] T037 [US4] Implement the `Interaction` wrapper component and `docs/essay-components.md`; make T035 and T036 pass; Jira: copy this phase's checklist into TCX-26 and update the epic

---

## Phase 7: User Story 3 — site half (P1)

- [ ] T038 [US3] Write failing `tests/essays/e2e/held-essay.spec.ts`: with a held essay in the fixtures, no page is generated for it, and a recursive search of the whole built output for its title, slug and anchors finds nothing; the public essay that lists it in `relations[]` does not show it (SC-001, FR-006)
- [ ] T039 [US3] Make T038 pass; Jira: copy the US3 checklist (T023, T024, T038, T039) into TCX-25 and update the epic

---

## Phase 8: Polish & cross-cutting

- [ ] T040 [P] Trench A cell helper: `tests/essays/unit/cells.test.ts` and its small module, asserting a `corpus: none` cell renders as "not yet corpus-backed" and that adding an `attestation` ID changes nothing else (FR-016); used by the Terra Sigillata epic
- [ ] T041 [P] Spec 008: note that archive redirects are generated from each essay's `legacy_url` and that `redirect_switched` is a required Cross-link confirmation (ADR 0010)
- [ ] T042 [P] Add a README section for the editorial pipeline (`promote`, `new essay`, the body tags, exports)
- [ ] T043 Walk [quickstart.md](./quickstart.md) end to end and correct it
- [ ] T044 Create the Jira epic for the Terra Sigillata rebuild (decided in the grill; it runs through the nine stages this spec enforces) and link it to TCX-4 as related, not as a child
- [ ] T045 Run the `code-review` skill against `main` and resolve the findings
- [ ] T046 Update the Confluence records (workflow step 4): a programme dossier for spec 003 to the fourteen-point contract, Build Log section U for the shipped work, the Decision Log if a cross-programme decision was made, and the TCX-4 epic description to match `main`

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 → Phase 3 → Phase 4 can run entirely without Astro. Phases 5 to 7 need spec 002 (its Foundation, US1 and the registry integration T040).
- Inside Foundation: T004 needs T003; T006 needs T005; T008 needs T007; T010 needs T009. T020 needs T004, T006, T008. T021 needs T020 and T010 for the candidate's projection.
- US1's T032 needs T025 to T031; T033 needs T032. US4's T037 needs T032. T039 needs T032 and T033.
- Spec 001's `T123` and `T124` are updated by T022 here.

### Parallel opportunities
- Foundation: T003, T005, T007 and T009 are independent test files.
- US2: T011 to T019 are independent test files.
- US1: T026 to T031 are independent test files.

## Implementation strategy

- **MVP**: Foundation + US2 gives a working editorial pipeline (scaffold, promote, gate) with no site, and can ship before spec 002. US1 and US4 add the reader's page; US3 closes the leak guarantee.
- Build one story at a time, red then green, update Jira and Confluence at each story's end, and open a pull request per story.
- Open items to watch: the golden citation strings (T026) must be written from the style's published examples, not generated by the code under test; the CSL style licence (CC BY-SA 3.0) must stay separate from the MIT code; `by` in a sign-off is a name the reviewer checks, not something the command can verify.
