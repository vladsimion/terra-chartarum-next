# Implementation Plan: The Anchor Essay

**Branch**: `009-anchor-essay` | **Date**: 2026-10-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/009-anchor-essay/spec.md`, clarified on 2026-10-20 after the grill (ADR 0017).

## Summary

Publishing the legacy essay "Terra Sigillata · Lapidarium Dacicum" natively, so that spec 008's `cutover:check` passes. Mostly content and review, and four pieces of code. **The essay** is a registry record, an MDX body, a cell file and seventeen evidence records (twelve for the stones' sources, five for the declared interactions), taken through the nine stages. **The interactions** are rebuilt without script: three shared components that spec 003 planned (`Timeline`, `CompareSlider`, `Scrollytelling`) and four essay-specific ones (a squeeze toggle, a stone plate, a section radar, a pit table), all styled from the token file. **The review tooling** is three small scripts: a preview build (a temporary registry copy in which the essay and what it uses are marked released), a changed-claim ledger check and a pit-cell reconciliation. **Publishing** releases exactly the records the essay uses, commits the first redirect inventory and rule file, and signs the redirect. The critical path is the author's: the question and thesis, four licence statements, the open review answers for five maps, twelve locators and the approval of each ledger entry.

## Technical Context

**Language/Version**: TypeScript strict, Node 24; Astro 7 with MDX; CSS with the shell tokens.

**Primary Dependencies**: none new. The existing `yaml`, `zod`, `csv-parse` (reconciliation reads the legacy CSV), `node-html-parser` (build-output tests) and Playwright with axe. No JavaScript library enters the page.

**Storage**: Files. `content/essay/<id>.yaml`, `.mdx` and `.cells.json`; `content/evidence/*.yaml`; the ledger, the reconciliation report and a paragraph-hash manifest of the legacy prose under `docs/review/`; at Publish, `migration/redirect-inventory.json` and `archive/_redirects`.

**Testing**: Vitest for the pure parts (the cell file, the ledger, the reconciliation, the paragraph comparison, the preview script's record selection, the timeline scale); the existing registry rules through the gate; a build-output test over the preview build (no `<script>`, structure, citations, no Atlas link, the leak scan); Playwright with axe on the preview build, both colour schemes, JavaScript off, keyboard, reduced motion; Lighthouse CI on the preview build.

**Target Platform**: the static site on Cloudflare Workers (ADR 0012); the editor's machine and CI.

**Project Type**: content plus a small addition to the existing Astro project and its scripts.

**Performance Goals**: the essay page meets LCP at most 2.5 s, CLS at most 0.1, accessibility 100 (ADR 0004); the legacy essay is 33 KB gzipped and its 16 inline drawings 8.8 KB gzipped, so the page weight is not the risk.

**Constraints**: no JavaScript on the page; every colour from `tokens.css` (the token lint covers `.css` and `.astro`); no held record reachable from a built page; the framework's existing rules unchanged; the legacy text changes only through the approved ledger.

**Scale/Scope**: one essay of 14,988 words; 13 stones (12 with a source), 4 pits × 13 strata = 52 cells, 16 drawings, 12 distinct hex colours and 29 inline styles to move onto tokens; 17 evidence records; 5 declared interactions; 6 maps to release (up to), 12 sources and 12 bibliography entries.

## Constitution Check

*GATE: passes before Phase 0 and again after Phase 1 design.*

- [x] **Historical question (I)**: the essay's own framing (nineteen centuries of mapping Dacia and Romania staged as an excavation); the author writes the formal `question` and `thesis`, and the process cannot pass Concept or Outline without them.
- [x] **No duplicated canonical records or private geometry (II, V)**: maps, sources and evidence are referenced by id; a map's title and caption come from its record (the literal-copy rule enforces it); the cells are the essay's own data and live once, in the cell file.
- [x] **Uncertainty and provenance as fields (III, VI)**: each cell is marked not yet corpus-backed; "(uncertain)" and "absent" are kept as the author wrote them; each locator starts `pending` and is verified by a person; the licence statements are the author's.
- [x] **Evidence before interaction (IV)**: each of the five interactions declares a question, an interpretation and evidence before it is built. The timeline and the squeeze toggle are not declared interactions: they change only how already-evidenced content is navigated or viewed and ask the reader to interpret nothing (ADR 0017); they are held to the same keyboard, focus and reduced-motion rules.
- [x] **No dynamic infrastructure, static first (VII)**: the page ships no script; every interaction is native HTML and CSS with its static form always present.
- [x] **One publication, bespoke interiors (VIII)**: the interactions sit inside the shared shell and `Interaction` wrapper, using tokens.
- [x] **Accessibility and performance impact (IX)**: axe 100 in both colour schemes, keyboard, reduced motion, and the ADR 0004 budgets on the essay's page type, which joins the CI template lists; the drawings are moved onto tokens so they pass contrast in both schemes.
- [x] **Test strategy (X)**: every acceptance scenario maps to a named test (table below), written first under the `tdd` skill.

**Result**: no violations. One deviation to record: the spec's "no new framework components" line was corrected, because spec 003 planned `Timeline`, `CompareSlider` and `Scrollytelling` to be built by the first essay that needs them (see Complexity Tracking).

## Project Structure

### Documentation (this feature)

```text
specs/009-anchor-essay/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── essay-record.md          # the record, the cell file and the evidence records
│   ├── components.md            # the three shared and four essay-specific components
│   └── review-tooling.md        # preview build, ledger and reconciliation: commands, files, exit codes
├── checklists/requirements.md
└── tasks.md                     # /speckit-tasks
```

### Source Code (repository root)

```text
content/essay/<id>.yaml, <id>.mdx, <id>.cells.json     # the essay (id minted by `registry new essay`)
content/evidence/evidence-NNNNNN.yaml                  # 17 records
src/essays/components/{Timeline,CompareSlider,Scrollytelling}.astro   # shared, each a section of docs/essay-components.md
src/essays/bespoke/{StoneGallery,StonePlate,SectionRadar,PitTable}.astro   # essay-specific
src/pages/essays/[slug].astro                          # passes the new components to the body
scripts/{essay-preview,essay-ledger,essay-reconcile}.ts
docs/review/{anchor-essay-changes.md,pit-cells-reconciliation.md,anchor-essay-legacy-paragraphs.json}
tests/essays/{unit,build,e2e}/...                      # see the traceability table
tests/shell/ci-templates.json, lighthouserc.json       # the essay's page type
playwright.anchor.config.ts                            # the preview build, npm run test:e2e:anchor
migration/redirect-inventory.json, archive/_redirects  # first committed at Publish
```

**Structure Decision**: the essay is content in the registry and its body collection; the code is the smallest set the essay needs, in the existing places. Shared interaction components follow spec 003's own convention (`src/essays/components/`, documented, tested); the four that serve only this essay sit beside them in `src/essays/bespoke/` so a second essay never inherits them by accident. The review tooling is three scripts, kept out of CI's required path except for the ledger and cell checks, which run as Vitest tests.

## Delivery: twelve small pull requests

The grill said "about ten"; the shared components earned their own slice, so twelve. Each is merged by the editor, and the essay stays held until the last.

| # | Slice | Spec stories | Needs from the author |
|---|---|---|---|
| 1 | Spec, plan, tasks, analysis | all | none |
| 2 | Review tooling: preview script, ledger check, reconciliation, paragraph-hash manifest | US5, US6 | the legacy clone path |
| 3 | Shared components: `Timeline`, `CompareSlider`, `Scrollytelling`, with docs and tests | US2 | none |
| 4 | Essay-specific components and the cell-file validator: `StoneGallery`, `StonePlate`, `SectionRadar`, `PitTable` | US2, US1 | none |
| 5 | Concept and Corpus: the record, the six maps' rights, `witness_kind` and `makers` | US3, US6 | question; four licence statements; five maps' review answers |
| 6 | Research: the twelve stone-source evidence records | US3 | twelve locators |
| 7 | Outline: thesis, the five interaction declarations (and their five evidence records) and a `section` for each of the twelve bibliography entries | US2, US3 | thesis; interpretations; the twelve sections |
| 8 to 10 | Draft: the text ported section by section with the ledger (introduction and brief; the museum; comparison desk, trench, section, pits and appendix) | US1, US5 | approval of each ledger entry |
| 11 | Build and Design QA: the preview build in CI, axe, Lighthouse, template lists, theming of the drawings, the author's QA read | US1, US2 | the Design QA read; the Vesconte naming decision |
| 12 | Publish and Cross-link: releases, sign-offs, inventory and rule file, `redirect_switched`, `cutover:check` | US4, US6 | the four sign-offs; the archive redirect pull request |

## Traceability: acceptance scenario to test

| Story and scenario | Test |
|---|---|
| US1.1 sections, stones and pits present | `tests/essays/build/anchor-essay.test.ts` (over the preview build) |
| US1.2 every difference is on the ledger | `tests/essays/unit/port-fidelity.test.ts` (paragraph hashes of the legacy prose against the rebuilt text and the ledger) |
| US1.3 listed under Border and Archive | `tests/essays/build/anchor-essay.test.ts`, `tests/rooms` (membership) |
| US1.4 complete with no script | the same build test (no `<script>`, no JavaScript reference) |
| US2.1 to 2.6 each interaction | `tests/essays/e2e/anchor-essay.spec.ts` (keyboard, no script, reduced motion, both schemes, axe), `tests/essays/unit/timeline.test.ts`, `component-docs.test.ts`, `tests/essays/unit/progressive-css.test.ts` (US2.5: the enhancements sit inside `@supports`) |
| US3.1 to 3.5 citations, figures, notes | `tests/essays/build/anchor-essay.test.ts`, the gate rules `ESSAY-*`, `tests/essays/unit/page-model.test.ts` |
| US4.1 inventory rule | `tests/migration/unit/inventory.test.ts` (an essay with `legacy_url`), `tests/migration/integration/anchor-redirect.test.ts` (the committed files) |
| US4.2 archive redirect applied | a signed step in `docs/cutover.md`, not automated |
| US4.3 `cutover:check` step | `tests/migration/unit/cutover-check.test.ts` (exists), run on the real registry at Publish |
| US5.1 and 5.2 ledger entries approved | `tests/essays/unit/ledger.test.ts` (fails once the stage is Build or later with an entry pending) |
| US5.3 reconciliation | `tests/essays/unit/reconcile.test.ts` |
| US6.1 to 6.3 release exactly what is used | `tests/essays/unit/release-list.test.ts`, the leak scan, `ESSAY-BODY-PUBLIC` |
| SC-002 zero JavaScript | `tests/essays/build/anchor-essay.test.ts` |
| SC-003 budgets | Lighthouse CI on the preview build |

## Complexity Tracking

| Departure | Why | Simpler alternative rejected because |
|---|---|---|
| The spec's out-of-scope line is corrected: three shared components are built | Spec 003 planned them "when an essay's Outline needs one"; this essay does | Essay-local copies of a slider, a timeline and a scroll layout would be reusable code nobody could reuse |
| A preview script that fabricates a published state in a temporary copy | The build runs the full gate, a held essay renders nothing, and the author and the checks must see the page before Publish | A held-records switch in the site build (rejected in the grill: it creates the path the leak guarantees rule out) |
| Twelve slices, not ten | The shared components are independently testable and unblock the Draft slices | Folding them into the Build slice would leave the Draft slices unable to render |
