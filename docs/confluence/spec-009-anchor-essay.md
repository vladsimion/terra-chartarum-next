Programme dossier for spec 009, written against the fourteen-point contract in [Programme Dossier Contract & Reconciliation Register](https://vladsimion.atlassian.net/wiki/spaces/~7012186ee7d7085f34fff9bc2bf8fbe8de309/pages/18481169), as the dossiers for specs 001 to 008 are. Not yet published; this file is the canonical copy and will be copied to its page whole when it is.

## 1. Programme metadata

| | |
|---|---|
| Programme type | Content: the v1 anchor essay "Terra Sigillata · Lapidarium Dacicum" (Trench A), rebuilt natively on the essay framework (spec 003) and published, so that spec 008's `cutover:check` step 6 passes |
| Status | **In progress.** Grilled, specified, clarified, planned, tasked and analysed (#105 to #107, 20 October 2026). Merged: slice 2, the review tooling (#108, 20 October 2026); slice 3, the three shared components (#110, 16 November 2026); slice 4, the four essay-specific components (#114, 17 November 2026); slices 5 to 7, the record through to the interaction, section and fidelity checks (#115 to #117, 17 November 2026). The essay record exists and stands at **Research**: six maps with licences, thirteen evidence records, a thesis, four of the five interactions declared, the twelve bibliography sections set. The body is ported as far as the whole Lapidarium: thirteen stones, nine halls, every legacy paragraph through line 1471 present. Nothing is published; the essay is `release: held` and has no public page. |
| Jira | **TCX-52** epic (In Progress); stories **TCX-53** (US1 the text; also holds Setup and Foundation), **TCX-54** (US2 the interactions), **TCX-55** (US3 the record and the evidence), **TCX-56** (US4 old links and the cutover gate), **TCX-57** (US5 approvals), **TCX-58** (US6 release). TCX-51, the earlier placeholder epic for the same essay, is superseded by TCX-52. |
| Canonical parent | A standalone page at the root of the space, as for specs 001 to 008 |
| Repository | https://github.com/vladsimion/terra-chartarum-next (public). Spec `specs/009-anchor-essay/`; code `src/essays/{preview,ledger,reconcile,port-fidelity,cells-file,timeline,radar}.ts`, `src/essays/components/{Timeline,CompareSlider,Scrollytelling}.astro`, `src/essays/bespoke/{StoneGallery,StonePlate,SectionRadar,PitTable}.astro`; scripts `scripts/essay-{preview,ledger,reconcile}.ts`; review files `docs/review/anchor-essay-changes.md`, `docs/review/anchor-essay-legacy-paragraphs.json`; decision `docs/adr/0017` |
| Successor relationship | The legacy essay at `/essays/dacia/` on the archive is ported whole; at Publish its URL gains one redirect rule to `/essays/dacia-lapidarium/` (spec 008, ADR 0010) |
| Pinned snapshot | The legacy repository `github.com/vladsimion/terra-chartarum` at `e82afd990fd473a2cdf80896401bc64602a1bd29`, read from a fresh clone; the legacy text itself is not copied into this repository, only a manifest of its 245 paragraphs' hashes |
| Last reconciliation | 2026-11-17 after T040, on `claude/elegant-gates-j2rlor`: 2737 Vitest tests in 226 files, all passing; `typecheck` clean; `essay:ledger` lists 21 of 21 rows pending, which is expected before T046. The counts this spec does not own are generated below. |

<!-- status:begin -->
- Registry rules: 93
- Named mutations: 121
- Entities: 308 (0 errors, 136 warnings)
<!-- status:end -->

## 2. Purpose / thesis

Can the site's anchor essay, fifteen thousand words with five interactions, be published on the successor as a faithful port with no JavaScript, every claim it makes backed by the registry, and nothing released that it does not use? The falsifiable claim: **every legacy paragraph is present in the rebuilt body or on an approved ledger of changes; each interaction works by keyboard, under reduced motion and with script off; the page passes the gate, accessibility 100 and the ADR 0004 budgets; and Publish releases exactly the essay, its evidence, twelve sources and their entries and up to six maps.**

## 3. Scope and non-goals

### In scope
- The essay as a registry record, an MDX body, a cell file (52 pit cells, the essay's own local data, each shown as not yet corpus-backed) and seventeen evidence records, taken through the nine editorial stages with a preview build before Publish.
- Seven components with no script: three shared (`Timeline`, `CompareSlider`, `Scrollytelling`, which spec 003 planned for the first essay that needs them) and four essay-specific (`StoneGallery`, `StonePlate`, `SectionRadar`, `PitTable`).
- Three review scripts: a preview of a held essay built from a temporary registry copy, the changed-claim ledger check, the pit-cell reconciliation against the legacy attestations; a paragraph manifest and the port-fidelity check.
- At Publish: the first redirect inventory and rule file, committed for the whole site; the archive redirect applied by pull request.

### Non-goals
- Other programmes, CND attestations (the cells wait for them), any JavaScript, a first-cut subset of the essay, research-gated publication paths (spec 003 US5).

## 4. Outputs / deliverables

Merged: `src/essays/preview.ts` and `scripts/essay-preview.ts` (`essay:preview`); `src/essays/ledger.ts` and `scripts/essay-ledger.ts` (`essay:ledger`); `src/essays/reconcile.ts` and `scripts/essay-reconcile.ts` (`essay:reconcile`); `src/essays/port-fidelity.ts` and the manifest; `src/essays/cells-file.ts`; `docs/review/anchor-essay-changes.md` (twelve pending rows). In slice 3: `src/essays/timeline.ts`; the three shared components and their sections of `docs/essay-components.md`; the fixture essay `fixture-interactions`; `tests/essays/support/` (the essay fixture registry built once per Vitest run); `tests/essays/build/components-build.test.ts`, `tests/essays/unit/{timeline,progressive-css}.test.ts`, `tests/essays/e2e/bespoke-components.spec.ts`. In slice 4: the four essay-specific components and their sections of `docs/essay-components.md`; `src/essays/radar.ts`; the page model's pit cells and `loadEssayCells`; the second fixture essay `fixture-bespoke` with its 52-cell file; `tests/essays/unit/radar.test.ts` and the bespoke cases of the build test and the Playwright spec. To come: the essay record and evidence, the ported text, the approvals, Design QA, Publish and the redirect.

## 5. Research, sources and rights framework

Twelve stone sources, each with an evidence record whose locator the author supplies and a person verifies; none cites a finding aid. Six maps are shown through `MapFigure` when the author can make a licence statement for them; a map without one drops to source-only and the dossier records which stones lost their figure and why. The other stones are source-only; the satellite stone carries no citation. Attestation tallies become literal text; the page never links to a CND layer or the Atlas.

## 6. Evidence and data architecture

The essay is a registry record (`dacia-lapidarium`, `legacy_url` `/essays/dacia/`) with five declared interactions (the compare slider, the core-sample scrollytelling, three radar charts), each with its question, interpretation and evidence; the timeline and the squeeze toggle ask the reader to interpret nothing and are not declared. The 52 pit cells live in a cell file beside the essay, `corpus: none`, validated to four pits of thirteen strata; a CND retrofit later sets an `attestation` and changes nothing else. Every difference from the legacy text is a row of the changed-claim ledger, approved by the author one by one; from stage Build on an unapproved row fails a test.

## 7. Essay and editorial architecture

Nine stages, one at a time, with a contiguous `stage_history`; the essay stays held with no public page until Publish. Before that, `essay:preview` copies the real registry to a temporary folder, marks the essay and what it uses released in the copy only, and builds it, so the author and the automated checks see the rendered essay; the real registry stays byte-identical. The author's steps (the question and thesis, licence statements, the open map answers, twelve locators, ledger approvals, the four sign-offs) are the critical path and are marked **(author)** in the task list.

## 8. Interaction and technical implementation

### 8.1 Seams (where tests live)
1. The registry through `validateRegistry` and the CLI (the essay record, the evidence records, the existing `ESSAY-*` rules; nothing new).
2. The pure modules and scripts: `preview.ts`, `ledger.ts`, `reconcile.ts`, `cells-file.ts`, `port-fidelity.ts`, `timeline.ts`.
3. The built site: build-output tests with `node-html-parser` over a Vitest build of the essay fixture registry, Playwright with axe in both colour schemes and with JavaScript off, Lighthouse CI; against the preview build until Publish and the production build after.

### 8.2 Rules that tests enforce
- No `<script>`, no `client:` directive, no inline handler, no JavaScript file in the built essay; no hex colour in its SVG or inline styles; colour, size and motion from the tokens (stylelint).
- Every `:has()` selector and `animation-timeline` declaration sits inside `@supports`, and the base rules hide nothing, so a browser without the feature gets a plain form.
- Each interaction works from the keyboard with visible focus and 44px targets, keeps its figures in the page, and has no animation or transition under `prefers-reduced-motion: reduce`; axe finds nothing.
- Every legacy paragraph hash is in the rebuilt body or covered by a ledger row; the cell file has exactly 52 cells in order, all `corpus: none`.
- The preview leaves the real registry byte-identical and derives its copy on each run.

### 8.3 CI and repository
The `gate` workflow runs typecheck, Vitest (the essay fixture build included), stylelint, the shell, essays, collection, bibliography, rooms and Atlas Playwright suites and Lighthouse CI. Playwright 1.63 asks for a Chromium build that does not run on the editor's macOS 12; `PW_CHROMIUM_PATH` points it at the headless shell already in its cache (quickstart).

## 9. Implementation phases and dependency model

Setup → Foundation (the review tooling) → US2 (the seven components, on the fixture) → US3 (the record and the evidence) → US1 (the text, in three parts) → US5 (approvals) → Build and Design QA → US6 and US4 (Publish and the redirect) → Polish. Twelve pull-request slices (tasks.md); slices 1 to 7 merged, slice 8 (the first part of Draft) under way. The components blocked every Draft task and are done. The author's inputs no longer block the record: the question, the thesis, the licences, the map answers, the twelve locators and the twelve bibliography sections are all in. What the author still owes is on the critical path later: the three unidentified pointers (Hereford, the Russian sheet, the firing-plan sheet), which also hold the fifth interaction and so hold T035 and the promotion to Outline; then the ledger approvals, the cell vocabulary, Design QA and the four sign-offs.

## 10. Jira hierarchy and reconciliation history

TCX-52 carries the design paragraph, the critical path and the "next" pointer; each story carries its task checklist. Reconciled 2026-10-20 (#107, #108: TCX-53 In Progress), 2026-11-16 (slice 3: TCX-54 In Progress, this dossier and Build Log section AC drafted), 2026-11-17 (slice 4: TCX-54's checklist ticked to T021, #110 recorded as merged) and again 2026-11-17 after T040 (slices 4 to 7 merged as #114 to #117; TCX-55 In Progress for the record and the evidence, TCX-53 In Progress for the text; T024 to T034 and T036 to T040 ticked; this dossier, the Build Log section and the review files brought back to the repository's own state, which had run ahead of them). No numbers are typed here that a test or script owns; the counts in §1 are true at the commit named there.

## 11. Programme acceptance criteria

The spec's SC-001 to SC-007: all six sections, thirteen stones and four pits present in order with script off; every interaction keyboard-operable, still under reduced motion, working with script off, in both schemes; the gate green at every stage; accessibility 100 and the ADR 0004 budgets on the preview and then the production build; Publish releases exactly the listed records and the leak scan passes; `cutover:check` step 6 fails while held and passes once published; `/essays/dacia/` has one rule outcome.

## 12. Verification ledger

| Date | What | Result |
|---|---|---|
| 2026-10-20 | Slice 2 (#108): 51 tests written first; `essay:reconcile` tried on the real data | 47 of 52 cells agree, 5 differ, 2 CSV rows unclaimed; suite 2505 tests green |
| 2026-11-16 | Slice 3: T012 red then green; the fixture build red (components undefined) then green; the e2e spec red then green in light, dark and no-JavaScript | `npm test` 2574 tests in 219 files; `test:e2e:essays` 74 tests; lint and typecheck clean; one shell test (no `style` attributes) caught the Timeline's first form and the positions moved to a per-instance stylesheet |
| 2026-11-17 | Slice 4: the radar geometry red then green; the bespoke build cases red (components undefined) then green; the squeeze and legend cases red then green in light, dark and no-JavaScript | `npm test` 2619 tests in 221 files; `test:e2e:essays` 93 tests, axe clean on both fixture pages; lint and typecheck clean; the squeeze had to be rebuilt on tokens because the shell forbids the CSS `filter` the legacy used, and the built fixture page is 3.6 KB gzipped with no script |
| 2026-11-17 | Slices 5 to 7 (#115 to #117): the record, the twelve evidence records, the interaction, section and fidelity checks, each test written first and seen red by mutating the record | The essay reached Research with six licensed maps and thirteen evidence records; three stones were left uncited rather than given placeholder locators, and the fifth interaction left undeclared, because their pointers are unidentified |
| 2026-11-17 | T038 to T040: the body ported hall by hall against the committed paragraph manifest | The Lapidarium is whole: thirteen plates, thirteen stone headings, nine halls, 0 hard-coded colours, 0 legacy paragraphs missing through line 1471. `npm test` 2737 tests in 226 files; typecheck clean. The drawings moved onto tokens by transformation, which grew the plate vocabulary twice (eight classes at T039, `plate-rule-muted` and `plate-paper-rule` at T040). `essay:preview` still stops at the gate before the body, on the maps' and sources' publication readiness and on the four declared interactions the body does not use yet, so the body's compilation was checked by building it with stub components |

## 13. Canonical ownership and propagation

The repository owns the spec, the contracts, the tasks, this dossier, the Build Log draft and the review files; Jira and this page follow it (CLAUDE.md, workflow step 4). The legacy text is owned by the archive and read only from a fresh clone at the pinned SHA.

## 14. Current checkpoint and delivery authority

Checkpoint (17 November 2026, after T040): slices 1 to 7 merged; the record is at Research and the Lapidarium is ported whole, so the body now holds thirteen plates, thirteen stone headings and nine halls with no colour written into a drawing. Open in the current slice: T041 the comparison desk and the trench, T042 the section comparison and the test pits with the 52 cells, T043 the appendix, then T044 the promotion to Draft. One thing is genuinely blocked and it is the author's: three pointers are unidentified (which inscription in Westrem's catalogue for Hereford, the 1835 Russian series and its sheet index, the firing-plan series, sheet and year), the third of which also leaves the fifth interaction, `radar-secretum-satelles`, undeclared. FR-006 wants exactly five, so T035 and the promotion to Outline wait on it. Next: T041 to T043, which do not depend on any of that. Delivery authority: the editor merges each slice; the author signs the four sign-offs at Publish and opens the archive-project pull request for the redirect; the dossier records that no independent review took place.
