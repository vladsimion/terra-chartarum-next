# Implementation Plan: Essay Framework & Editorial Pipeline

**Branch**: `003-essay-framework` | **Date**: 2026-10-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-essay-framework/spec.md`, clarified on 2026-10-16 after the grill (ADR 0010, ADR 0006 and ADR 0002 amendments).

## Summary

The mechanism that turns a record into a published argument and keeps it honest on the way. Two halves. **Registry side** (framework-free, in `src/registry/`): the essay schema grows the fields of the clarified FR-001; a set of `ESSAY-*` rules checks each stage's cumulative exit checks, the stage history, sign-offs, rooms, interaction declarations and that everything the body shows is public; `registry promote` and `registry new essay` are the only ways to scaffold an essay and to advance a stage. **Site side** (Astro, on top of spec 002's shell): an essay page rendered from an MDX body beside the record, with a map figure whose caption and rights come from the canonical record, claim citations that point at Evidence records, the evidence panel, the seven-section bibliography, the room and related lists, and build-time Chicago notes plus BibTeX, RIS and CSL-JSON exports. A held essay generates no page. Only one fixture essay ships here; the Terra Sigillata rebuild is its own epic.

## Technical Context

**Language/Version**: TypeScript strict, Node 24; Astro 7 with `@astrojs/mdx` for the site side (exact versions pinned at the task, at least two weeks old).

**Primary Dependencies**: existing `yaml` (its Document API rewrites a record and keeps comments), `zod`; new: `@astrojs/mdx`, `@citation-js/core` with `@citation-js/plugin-csl`, `@citation-js/plugin-bibtex` and `@citation-js/plugin-ris`, plus the official Chicago notes-bibliography CSL style and locale files vendored under `src/essays/csl/` with their CC BY-SA attribution. No runtime citation library reaches the browser.

**Storage**: Files. One record per essay at `content/essay/<id>.yaml` with its body at `content/essay/<id>.mdx`; bibliography entries are CSL-JSON files the entries point at.

**Testing**: Vitest for the registry rules, stages, commands, body scan and citation rendering (valid and invalid fixtures, named mutations for every new rule); Playwright and axe for the essay pages through spec 002's setup; the fixture essay joins the CI template list.

**Target Platform**: Build time and CI for the registry side; static HTML for Cloudflare Pages on the site side.

**Project Type**: Library and CLI (registry side) plus site pages (site side), in the existing single project.

**Performance Goals**: ADR 0004 for essay pages: ≤ 100 KB compressed JavaScript on first load, LCP ≤ 2.5 s, CLS ≤ 0.1, INP ≤ 200 ms, accessibility 100. The framework's own components ship no JavaScript (a citation opens to a note in the page and the evidence panel is native HTML), so only an essay's bespoke interactions spend the budget.

**Constraints**: Deterministic and offline (no network at build); the gate stays pure; held essays leak nothing; no dynamic infrastructure.

**Scale/Scope**: One fixture essay now; about 5 to 10 essays in v1; 15 new rules (see [contracts/essay-rule-ids.md](./contracts/essay-rule-ids.md)); 2 new commands.

## Constitution Check

*GATE: passes before Phase 0 and again after Phase 1 design.*

- [x] **Historical question (I)**: "How can a visual essay make a cartographic argument whose every claim is traceable, while keeping its own narrative form?" (spec header).
- [x] **No duplicated canonical records or private geometry (II, V)**: an essay references maps, places, sources, layers and evidence by ID; captions, attribution and rights are read from the canonical record, never retyped. The Trench A cells that CND will later own are marked `corpus: none` so the retrofit adds an ID instead of moving data.
- [x] **Uncertainty and provenance as fields (III, VI)**: every claim citation resolves to an Evidence record carrying locator, verification state and confidence; a pending locator is visibly marked and cannot carry a `secure` claim; sign-offs are named people.
- [x] **Bespoke interactions (IV)**: each interaction declares question, evidence and expected interpretation in the record before Build, and the gate checks the declaration both ways (`ESSAY-INTERACTION`).
- [x] **No dynamic infrastructure (VII)**: build-time rendering and static files only.
- [x] **Accessibility and performance impact (IX)**: framework components add no JavaScript; essay pages are in the CI template list and Publish requires a green `gate` (ADR 0010).
- [x] **Test strategy (X)**: every acceptance scenario maps to a named test (table below), written first under the `tdd` skill.

**Result**: no violations; Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/003-essay-framework/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── cli-additions.md          # registry promote, registry new essay
│   ├── essay-rule-ids.md         # the ESSAY-* rules, thresholds, spec links
│   ├── mdx-body.md               # the components an essay body may use and how they are scanned
│   └── citations-and-exports.md  # Chicago notes, evidence panel, BibTeX/RIS/CSL-JSON
└── tasks.md                      # /speckit-tasks
```

### Source code (repository root)

```text
src/registry/
├── schemas/essay.ts              # extended: the clarified FR-001 fields
├── schemas/bibliography-section.ts   # the seven section values (shared with spec 006)
├── accent-slots.ts               # the accent slot names (checked against the token file by spec 002's test)
├── stages.ts                     # stage order, derived lifecycle, the cumulative exit-check table
├── essay-body.ts                 # scans an .mdx body for the framework tags and their static props
├── rules/essay.ts                # ESSAY-* rules
├── promote.ts                    # registry promote
├── new-essay.ts                  # registry new essay
└── cli.ts                        # + promote, new
src/essays/                       # site side
├── components/                   # MapFigure, Cite, EvidencePanel, Interaction, Bibliography, CitationExport, RoomLinks, RelatedEssays
├── layouts/EssayLayout.astro     # through spec 002's Base layout; thesis up front
├── citations.ts                  # CSL rendering and the three exports (build time)
└── csl/                          # vendored Chicago notes-bibliography style and locale
src/pages/essays/[slug].astro     # one page per public essay
content/essay/                    # records and bodies (empty in v1 until a real essay exists)
tests/registry/{unit,integration}/ # new rule, stage, promote, new-essay and body-scan tests
tests/essays/{unit,e2e,fixtures}/  # site-side tests and the fixture essay registry
```

**Structure Decision**: the registry half stays framework-free so `promote`, `new essay` and every rule run without Astro, in CI and from R pipelines. Everything that needs Astro or the citation library lives under `src/essays/`. The record schema is the single source for both.

## Acceptance-scenario → test map

| Story | Scenarios | Test |
|---|---|---|
| US1 read an essay | 1 (caption, attribution, rights from the map's record) | `tests/essays/unit/figure.test.ts`, `e2e/essay-page.spec.ts` |
| | 2 (seven bibliography sections in order, empty ones hidden) | `unit/bibliography.test.ts`, `e2e/essay-page.spec.ts` |
| | 3 (rooms and related essays and layers) | `unit/related.test.ts`, `e2e/essay-page.spec.ts` |
| | 4 (activating a citation shows source, locator, state) | `unit/citations.test.ts`, `e2e/citation.spec.ts` (also with JavaScript off) |
| US2 stages | 1 (Concept to Corpus needs question and primary room) | `tests/registry/unit/essay-stages.test.ts` |
| | 2 (Research to Outline needs corpus with rights state) | `essay-stages.test.ts` |
| | 3 (Build to Design QA: every interaction declared) | `essay-interactions.test.ts` |
| | 4 (Design QA to Publish: sign-offs, `design_qa_passed`, template listed) | `essay-signoffs.test.ts` |
| | 5 (Cross-link: reverse links, `redirect_switched`) | `essay-crosslink.test.ts` |
| | 6 (`registry promote` appends history; a hand edit that skips fails) | `integration/promote.test.ts`, `essay-history.test.ts` |
| | 7 (Publish requirements, CI template list) | `essay-signoffs.test.ts`, `tests/essays/unit/ci-templates.test.ts` |
| US3 held essay | independent test (no title or slug in output) | `tests/essays/e2e/held-essay.spec.ts` plus the registry leak scan |
| US4 components | declaration contract, citation/export control, evidence panel | `essay-interactions.test.ts`, `unit/citations.test.ts`, `e2e/citation-export.spec.ts` |
| FR-004 IDs only | | `unit/essay-body.test.ts` (a literal map title or caption in the body fails) |
| FR-005 seven sections | | `unit/bibliography.test.ts` |
| FR-009 exports | | `unit/exports.test.ts` (BibTeX, RIS, CSL-JSON with stable URL and access date) |
| FR-014 rooms | | `essay-rooms.test.ts` |
| FR-015 scaffold | | `integration/new-essay.test.ts` |
| FR-016 Trench A cells | | `tests/essays/unit/cells.test.ts` (a `corpus: none` cell is marked; adding an `attestation` ID changes nothing else) |
| FR-017 body entities public | | `essay-body-public.test.ts` |
| SC-001 zero held strings | | `tests/essays/e2e/held-essay.spec.ts` |
| SC-002 complete history | | `essay-history.test.ts` |
| SC-003 captions generated | | `figure.test.ts` |
| SC-005 named mutations | | `tests/registry/mutations.test.ts` (one per new rule) |

## Complexity Tracking

Empty: no constitution violations.
