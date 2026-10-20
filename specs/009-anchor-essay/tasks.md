---

description: "Task list for 009 The Anchor Essay"
---

# Tasks: The Anchor Essay

**Input**: Design documents from `/specs/009-anchor-essay/`

**Prerequisites**: plan.md, spec.md (clarified 2026-10-20), research.md, data-model.md, contracts/ (essay-record.md, components.md, review-tooling.md), quickstart.md. Decision: ADR 0017.

**Tests**: REQUIRED (Constitution X). Every acceptance scenario has an automated test written first, and each slice is built red → green with the `tdd` skill: in every phase the test tasks come first and must be seen failing before the task that makes them pass. Refactoring happens in review, not in the loop. Steps that only the author can take are marked **(author)** and are done last in their slice.

**Seams** (to confirm with Vlad at T001): (1) the registry through `validateRegistry` and the CLI `main` (the essay record, the evidence records, the existing `ESSAY-*` rules; nothing new); (2) the pure modules and scripts (`src/essays/preview.ts`, `ledger.ts`, `reconcile.ts`, `cells-file.ts`, `timeline.ts`); (3) the built site, through the preview build (build-output tests with `node-html-parser`, Playwright with axe in both colour schemes, Lighthouse CI).

**Organization**: grouped by user story, ordered by dependency: **Setup → Foundation → US2 (the interactions) → US3 (the record and the evidence) → US1 (the text) → US5 (approvals) → Build and Design QA → US6 and US4 (Publish and Cross-link) → Polish**. The stories overlap (reading the essay needs the interactions and the evidence), so the pull-request map below cuts across them; every task carries its story label and each Jira story collects its own tasks.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1–US6, matching `spec.md`
- Paths are relative to the repository root. Essay tests are under `tests/essays/`, migration tests under `tests/migration/`.
- Jira: each story's checklist is copied into its TCX story under epic TCX-52 (TCX-53 US1, TCX-54 US2, TCX-55 US3, TCX-56 US4, TCX-57 US5, TCX-58 US6; Setup and Foundation sit in TCX-53); Jira and Confluence are updated after each slice (workflow step 4); `/speckit-taskstoissues` is not used.

### Pull-request map (twelve slices, each merged by the editor; the essay stays held until the last)

| PR | Tasks | Slice |
|---|---|---|
| 1 | spec, plan, tasks, analysis | this directory |
| 2 | T004 to T011 | review tooling: preview, ledger, reconciliation, paragraph manifest, cell-file validator |
| 3 | T012 to T018 | shared components: `Timeline`, `CompareSlider`, `Scrollytelling` |
| 4 | T019 to T023 | essay-specific components, registration, fixture e2e |
| 5 | T024 to T029 | Concept and Corpus |
| 6 | T030 to T031 | Research |
| 7 | T032 to T035 | Outline |
| 8 to 10 | T036 to T044 | Draft, in three parts |
| 11 | T045 to T052 | approvals, Build and Design QA |
| 12 | T053 to T060 | Publish and Cross-link |
| after | T061 to T064 | Polish |

---

## Phase 1: Setup

- [ ] T001 Agree the three seams above with Vlad (tdd skill) and record any change here
- [ ] T002 **(author)** Name the path of a fresh clone of the legacy repository pinned at `e82afd990fd473a2cdf80896401bc64602a1bd29` (never the working copy) and record it here; the one-off scripts take it as an argument
- [ ] T003 [P] Confirm that `npm run test:e2e:essays` and an essay fixture build run on this machine (`PW_CHROMIUM_PATH` if Playwright's own Chromium is unsupported), so the red-then-green loop can be seen

---

## Phase 2: Foundation (review tooling and the cell-file validator; blocks the stories)

- [ ] T004 [P] Write failing `tests/essays/unit/preview.test.ts` (contracts/review-tooling.md): over an in-memory registry, the records an essay uses are selected (its `maps`, `evidence`, `sources`, `bibliography`, each evidence record's `source` and that source's `entry`); in the copy the essay becomes stage `Publish`, `release: released` with `design_qa_passed: true`, placeholder `signoffs`, a full `stage_history` and a `published_on` stamped as a preview, and every used record becomes published and released while every other record is untouched; `--without <map>` removes that map from the copy's `maps` and its `<MapFigure>` tag from the copy's body; the real registry is byte-identical afterwards; an unknown slug is exit 2
- [ ] T005 Implement `src/essays/preview.ts` (pure) and `scripts/essay-preview.ts` with the `essay:preview` npm script: copy `content/`, `vocab-mappings/` and the layer data to a temporary folder, apply the flips, build the copy with `REGISTRY_ROOT` into `dist-anchor`, print the gate's errors on failure and name the temporary folder (exit 1), remove the folder on success (exit 0)
- [ ] T006 [P] Write failing `tests/essays/unit/ledger.test.ts`: the table `id | legacy line | legacy text | proposed text | reason | status | approved by | date` parses; `status` is `pending`, `approved` or `rejected`; the test fails when the essay's `stage` is Build or later and any row is `pending`, and when an `approved` row has no `approved by` or `date`
- [ ] T007 Implement `src/essays/ledger.ts`, `scripts/essay-ledger.ts` (lists pending rows, exit 1 while there is one) and the `essay:ledger` script; create `docs/review/anchor-essay-changes.md` seeded, all `pending`, with the rows research R7 lists: "nineteen centuries" (legacy lines 5, 74); "thirteen stones" and `mapCount` 13 (130, 1588, 1600); "1.87 metres" and "twelve centuries" (78, 1586); the derived durations "seventeen", "eighteen", "sixteen", "thirteen centuries" (90, 2148, 2043); "112 sheets" (1925); the per-stone record and silence tallies; `yearTo` 2024 against "2026"; the two appendix titles (2225, 2226); the "not yet corpus-backed" label added to the pit tables
- [ ] T008 [P] Write failing `tests/essays/unit/reconcile.test.ts`: the cell file is compared with the legacy CSV pit rows and each cell gets a difference of `none`, `name`, `language`, `note`, `missing in CSV` or `missing in essay`; a row with a difference and no `resolution` fails the test when the stage is Build or later
- [ ] T009 Implement `src/essays/reconcile.ts` and `scripts/essay-reconcile.ts` with the `essay:reconcile` script, writing `docs/review/pit-cells-reconciliation.md` with the columns `pit | stratum | essay name | CSV name_original | CSV name_normalized | CSV class | difference | resolution | resolved by` (the legacy clone is an argument, never committed)
- [ ] T010 [P] Write failing `tests/essays/unit/port-fidelity.test.ts` on small synthetic bodies: a rebuilt body is normalised the same way as the manifest (markup and whitespace removed, case folded) and every legacy paragraph hash must be present in it or covered by a ledger row; then implement `scripts/essay-legacy-manifest.ts <legacy clone>` and, once, run it and commit `docs/review/anchor-essay-legacy-paragraphs.json` (`[{line, sha256}]`)
- [ ] T011 [P] Write failing `tests/essays/unit/cells-file.test.ts` (data-model.md, "Cell file"): exactly 52 entries; four pits of thirteen strata each, in order (`sarmizegetusa`, `apulum`, `napoca`, `drobeta`; strata 0 to XII); every row `corpus: 'none'` with no `attestation`; every row renders "not yet corpus-backed" through `renderCell`; then implement `src/essays/cells-file.ts` (`validateCellFile`)

---

## Phase 3: User Story 2 — Work the interactions without a script (P1)

**Goal**: seven components that ship no script, meet the keyboard, focus, reduced-motion and contrast rules, and have their static form always present. **Independent test**: the fixture e2e spec and build test pass in both colour schemes.

- [ ] T012 [P] [US2] Write failing `tests/essays/unit/timeline.test.ts`: the square-root-compressed axis (`src/essays/timeline.ts`) is monotonic, places `from` and `to` at the ends, and gives each of a set of events a position
- [ ] T013 [US2] Add two fixture essays (record, body, evidence; the second with a cell file) to `tests/essays/fixtures/registry/`: one using the three shared components, one using the four essay-specific ones, each with minimal content; write failing `tests/essays/build/components-build.test.ts` over their build: no `<script>`, no `client:` directive, no inline event handler, no reference to a `.js` file, no hex colour in the markup, and each component's contract markup (components.md)
- [ ] T014 [P] [US2] Write failing `tests/essays/e2e/bespoke-components.spec.ts` (existing `playwright.essays.config.ts`, in both colour schemes): `CompareSlider` moves with the arrow keys, Home and End and still moves with JavaScript disabled; `StoneGallery`'s checkbox toggles with Space; each `SectionRadar` has its values table and its legend buttons emphasise a series by keyboard; `Scrollytelling` keeps its figure visible; `Timeline` events are links reached by Tab; under `prefers-reduced-motion: reduce` nothing moves; axe finds nothing
- [ ] T014a [P] [US2] Write failing `tests/essays/unit/progressive-css.test.ts`: in the new components, every `:has()` selector and every `animation-timeline` declaration sits inside an `@supports` block, and the base rules (outside it) leave all content visible and every control working, so a browser without the feature gets a plain form (US2 scenario 5)
- [ ] T015 [P] [US2] Implement `src/essays/components/Timeline.astro` and `src/essays/timeline.ts` per contracts/components.md, with its section in `docs/essay-components.md` (question, keyboard, reduced motion, no-script)
- [ ] T016 [P] [US2] Implement `src/essays/components/CompareSlider.astro` on a native `<input type="range">` driving a CSS custom property, with its section in `docs/essay-components.md`
- [ ] T017 [P] [US2] Implement `src/essays/components/Scrollytelling.astro` (a sticky static figure beside the steps; CSS scroll-driven highlight as an enhancement), with its section in `docs/essay-components.md`
- [ ] T018 [US2] Register the three shared components in the `components` map of `src/pages/essays/[slug].astro`; the parts of T013 and T014 for the first fixture essay pass; `npm test`, `npm run lint:css` and `npm run test:e2e:essays` green
- [ ] T019 [P] [US2] Implement `src/essays/bespoke/StoneGallery.astro` (a labelled visually hidden checkbox with `:has()`) and `StonePlate.astro` (a figure whose drawing has `role="img"` and an `aria-label`)
- [ ] T020 [P] [US2] Implement `src/essays/bespoke/SectionRadar.astro` (static SVG on tokens, a values table, `:has()` legend emphasis)
- [ ] T021 [P] [US2] Implement `src/essays/bespoke/PitTable.astro`, reading the cell file through `renderCell` so each row is marked "not yet corpus-backed"
- [ ] T022 [US2] Register the four essay-specific components in `src/pages/essays/[slug].astro`; add any new colour pair to `tests/shell/contrast-pairs.ts`; all T013 and T014 specs pass for both fixture essays; the 100 KB budget and accessibility 100 hold
- [ ] T023 [US2] Run the fixture e2e in both colour schemes with JavaScript disabled and with reduced motion; fix anything it exposes

---

## Phase 4: User Story 3 — Check what the essay claims: the record and the evidence (P1)

**Goal**: the essay record at Outline with its maps, twelve stone-source evidence records, five declared interactions and their five evidence records. **Independent test**: the gate passes at each stage and every citation and figure resolves.

- [ ] T024 [P] [US3] Write failing `tests/essays/unit/anchor-record.test.ts`: the record has slug `dacia-lapidarium`, title "Terra Sigillata · Lapidarium Dacicum", `origin: minted`, `authors` Vlad Simion, `accent: gold`, `rooms` primary `tc:tc:room:border` and secondary `[tc:tc:room:archive]`, `portal_dimensions` `[Measure, Silence]`, `legacy_url` `/essays/dacia/`, `release: held` until Publish, and none of the dropped legacy fields (`eras`, `regions`, `mapCount`, `yearFrom`, `yearTo`, `readingMinutes`, `metaScores`, `featured`, `order`, `status`, `cover`, `hero`, `publishedAt`, `updatedAt`)
- [ ] T025 [US3] **(author)** Write the `question`; then `registry new essay "Terra Sigillata · Lapidarium Dacicum" --room border --question "<question>" --author "Vlad Simion"`; set the slug `dacia-lapidarium` by hand (the command derives one from the title), the accent, the secondary room, the portal dimensions and `legacy_url`; the record passes the gate at Concept and T024 passes
- [ ] T026 [US3] **(author)** State a licence for each of `ptolemy`, `peutinger`, `honterus` and `ortelius` (their `rights`); a map for which none can be made is left out of the essay's `maps` and its stone becomes source-only (the dossier records which and why)
- [ ] T027 [US3] **(author)** Answer the open review questions for the maps that stay: `witness_kind` for `ptolemy`, `peutinger`, `honterus`, `ortelius` (and `ptolemy`'s and `ortelius`'s scope, work or object), a maker or `unknown` for `peutinger` and `hereford`; apply them as in `docs/review/map-warnings-2026-10-20.csv`, keeping the gate green
- [ ] T028 [US3] Set the essay's `maps` to the maps that remain; run `npm run essay:preview -- dacia-lapidarium` to see the gate's readiness errors, if any, for those maps
- [ ] T029 [US3] Promote the essay to Corpus (`registry promote <id> Corpus --by "Vlad Simion"`); the gate passes

- [ ] T030 [P] [US3] Write failing `tests/essays/unit/evidence-records.test.ts`: twelve evidence records, one for each of `src-ptolemy-geographia`, `src-tabula-peutingeriana`, `src-hereford-mappa`, `src-vesconte-portolan`, `src-honterus-chorographia`, `src-ortelius-parergon`, `src-cantacuzino-wallachia`, `src-cantemir-moldavia`, `src-iosephina-survey`, `src-russian-staff-1835`, `src-szathmari-charta`, `src-secret-century`; each has a `source`, a `locator.value`, `locator.state` of `pending` or a verified state, an `evidence_type` and a `confidence`; none cites a finding aid; each `target` resolves
- [ ] T031 [US3] **(author)** Supply the twelve locators and create the twelve evidence records (`content/evidence/evidence-NNNNNN.yaml`, counter-minted; I draft each from its source's bibliography entry, you give the locator); add them to the essay's `evidence`, `sources` and `bibliography`; set `open_questions`; promote to Research
- [ ] T032 [P] [US3] Write failing `tests/essays/unit/anchor-interactions.test.ts`: five declarations `hereford-against-vesconte` (`compare-slider`), `core-sample` (`scrollytelling`), `radar-ptolemy-iosephina`, `radar-vesconte-secretum`, `radar-secretum-satelles` (`section-radar`), each with `question`, `interpretation` and at least one evidence id that resolves, ids unique
- [ ] T033 [US3] **(author)** Write the `thesis` and the five interactions' questions and interpretations (candidates are drawn from the legacy text); create the five interaction evidence records (they may cite a stone's source with a different locator); declare the interactions in the record
- [ ] T034 [US3] Write failing `tests/essays/unit/bibliography-sections.test.ts` first: each of the twelve sources' bibliography entries has a `section` that is one of the seven (`primary_sources`, `historical_maps`, `reference_works`, `specialised_studies`, `digital_resources`, `datasets_licences`, `further_reading`) and a CSL file (an entry without a section is not public, and the essay's bibliography builder rejects one); then **(author)** choose each entry's `section` and enrich any of the thin entries (title, author, year, note) you want public as they are not
- [ ] T035 [US3] Promote to Outline; the gate passes and T032 passes

---

## Phase 5: User Story 1 — Read Trench A from start to finish: the text (P1)

**Goal**: the whole legacy essay ported into the body and the cell file, section by section, with its ledger rows. **Independent test**: the preview build shows all six sections, thirteen stones and four pits, and every legacy paragraph is present or on the ledger.

- [ ] T036 [P] [US1] Write failing `tests/essays/build/anchor-essay.test.ts` over the preview build (`essay:preview`): the introduction and six sections in the legacy order; thirteen stones; four pits of 13 rows, each marked "not yet corpus-backed"; one `<MapFigure>` per shown map linking to its collection record; each stone with a source has a source line and a note; no link to the Atlas or a CND layer; the satellite stone has no citation; no `<script>`; no reference to a JavaScript file; no hex colour in the built SVG; the essay is listed under Border (primary) and Archive (secondary)
- [ ] T037 [P] [US1] Write failing `tests/essays/unit/port-fidelity.test.ts` against the real manifest and the rebuilt body (fails until the body is complete)
- [ ] T038 [US1] Port the introduction and the section "the church that is both" (legacy lines 1 to 127) into `content/essay/<id>.mdx`, carrying the author's words unchanged; move the section's drawings onto tokens (research R4); add a ledger row for every change; the preview builds
- [ ] T039 [US1] Port the Lapidarium's first half (the first halls of "the lapidarium", from line 128): each stone's heading, `StonePlate`, `Timeline`, `StoneGallery`, the six readings table and prose; each stone with a source gets its `<Cite>` source line with the attestation tallies as literal text, no Atlas link; the six stones with maps get `<MapFigure>`; ledger rows for every change
- [ ] T040 [US1] Port the Lapidarium's second half, to the satellite stone (ported as written, no `<Cite>`), in the same way
- [ ] T041 [US1] Port "the comparison desk" (the Hereford against Vesconte slider) and "below the wall, the trench" (the core sample) inside their declared `<Interaction>`s; the 13 strata and the Five Seals tables
- [ ] T042 [US1] Port "the section comparison" (the three radar charts, each inside its `<Interaction>`) and "the test pits": write the 52 cells into `content/essay/<id>.cells.json`, four `<PitTable>`s in place of the legacy tables (T011 passes), `reading` left as `""` until the author confirms its vocabulary (research R6); the `extra muros`, `absent` and `(uncertain)` marks kept as written
- [ ] T043 [US1] Port the appendix ("Finds shed"), rewording the two list items whose titles the body rule rejects (as ledger rows); add `<CitationExport />`
- [ ] T044 [US1] Promote to Draft (`ESSAY-DRAFT`, `ESSAY-BODY-DYNAMIC`, `REF-FINDING-AID` pass); T036 passes

---

## Phase 6: User Story 5 — Approve what changed in the port (P2)

**Goal**: every change to the author's text and data is approved or resolved before the essay leaves Draft. **Independent test**: `essay:ledger` and `essay:reconcile` exit 0 and their tests pass.

- [ ] T045 [US5] Run `npm run essay:reconcile -- <legacy clone>` and commit `docs/review/pit-cells-reconciliation.md` (the 52 cells against the legacy attestation rows: 50 pit rows)
- [ ] T046 [US5] **(author)** Approve, amend or reject each row of `docs/review/anchor-essay-changes.md` (setting `status`, `approved by` and `date`); a rejected row means the legacy text stays; I apply each decision to the body
- [ ] T047 [US5] **(author)** Resolve each reconciliation difference (the essay's table stays the source of truth unless your resolution says otherwise) and confirm the cell `reading` vocabulary; I update the cell file
- [ ] T048 [US5] `essay:ledger`, `essay:reconcile` and their tests pass; `port-fidelity.test.ts` passes

---

## Phase 7: Build and Design QA (US1 and US2 evidence; P1)

- [ ] T049 [P] [US2] Write failing `tests/essays/e2e/anchor-essay.spec.ts` for the real essay on the preview build, with `playwright.anchor.config.ts` and the `test:e2e:anchor` script: JavaScript disabled, keyboard-only through all five interactions, reduced motion, both colour schemes, axe on the page and in the states each interaction can take
- [ ] T050 [US2] Add the essay's page type to `tests/shell/ci-templates.json` and its URL to `lighthouserc.json` (built from the preview), add the `test:e2e:anchor` step to CI, and make T049 pass: accessibility 100, LCP at most 2.5 s, CLS at most 0.1
- [ ] T051 [US2] Check the sixteen drawings in both colour schemes (contrast through axe, shapes and labels unchanged) and adjust the token classes
- [ ] T052 [US1] **(author)** Design QA read of the preview in both schemes: settle the Vesconte stone's heading against the figure's registry title ("Portolan of the Black Sea" against "Eastern Mediterranean portolan"), re-verify the literal tallies, set `design_qa_passed`; promote to Build, then to Design QA

---

## Phase 8: User Stories 6 and 4 — Publish and Cross-link (P2, P1)

- [ ] T053 [P] [US6] Write failing `tests/essays/unit/release-list.test.ts`: after Publish the set of public records equals the release list (the essay; its 17 evidence records; the 12 sources and 12 bibliography entries; the maps it shows) plus today's public set, and every other imported record is still held
- [ ] T054 [P] [US4] Write failing `tests/migration/integration/anchor-redirect.test.ts`: the committed `migration/redirect-inventory.json` gives `/essays/dacia/` the outcome `rule` to `/essays/dacia-lapidarium/`, and `archive/_redirects` contains the 301 rule
- [ ] T055 [US6] **(author)** Sign the `historical`, `cartographic` and `data` sign-offs (Vlad Simion) and set `published_on`; flip the essay and the records it uses to published and released; promote to Publish (`ESSAY-SIGNOFF`, `ESSAY-PUBLISH`, `ESSAY-BODY-PUBLIC` pass); record in the dossier that no independent review took place
- [ ] T056 [US6] Run the gate, the full suite, the leak scan and the production build; T053 passes
- [ ] T057 [US4] Run `registry inventory --snapshot <legacy clone>` and `registry archive-redirects` and commit `migration/redirect-inventory.json` and `archive/_redirects` for the whole site; T054 passes
- [ ] T058 [US4] Run `npm run cutover:check`; its anchor-essay step passes (the other steps are the editor's)
- [ ] T059 [US4] **(author)** Open the archive-project pull request that applies `archive/_redirects`, and sign `redirect_switched`; promote to Cross-link (`ESSAY-CROSSLINK`)
- [ ] T060 [US4] Open `/essays/dacia/` on the archive after the redirect is applied and confirm it lands on the new essay (a signed step in `docs/cutover.md`)

---

## Phase 9: Polish & cross-cutting concerns

- [ ] T061 [P] Run the quickstart end to end and fix anything it exposes
- [ ] T062 [P] Update `README.md` and `docs/` for the review tooling and the essay; refresh the spec 008 dossier line that still named the old default slug
- [ ] T063 Run the `code-review` skill against the commit before this work began (standards and spec axes) and address findings
- [ ] T064 Update Jira (TCX-52 description, story checklists, statuses), the Confluence dossier for spec 009, the Build Log and the Decision Log (workflow step 4); record the Publish date

---

## Dependencies & Execution Order

- Setup → Foundation → US2 (components) → US3 (record and evidence) → US1 (text) → US5 (approvals) → Build and Design QA → Publish and Cross-link (US6, US4) → Polish.
- Foundation blocks everything that renders or checks the essay (preview, ledger, reconciliation, cell file). The seven components (US2) block every Draft task, because the body cannot build without them.
- T026 and T027 (licence statements and review answers) block T029; each can be sidestepped for one map by leaving it out, which makes its stone source-only.
- T031 (twelve locators) blocks Research; T033 (thesis and interpretations) blocks Outline; T046 and T047 (approvals) block Build.
- T055, T059 and the archive pull request are the editor's, done last; the live archive is never changed by this repository's code.

### Parallel opportunities

- In Foundation, T004, T006, T008, T010 and T011 are independent tests; T005, T007, T009 follow their tests.
- In US2, T012, T014 and the components T015 to T017 and T019 to T021 are in different files.
- The author's inputs (T025 to T027, T031, T033, T034) can start as soon as the spec is merged and run in parallel with the code slices.

## Implementation Strategy

MVP is Foundation plus US2 on the fixture: the preview build and the seven components proven in both colour schemes with no script, before any of the essay is written. Then the record and the evidence (US3), the text in three parts (US1), the approvals (US5), Design QA, and last Publish and the redirect (US6, US4). Ship one slice per pull request, red then green, and update Jira and Confluence after each. The author's inputs are the critical path: ask for the licence statements and the open map answers now.
