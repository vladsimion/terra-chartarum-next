DRAFT, not published to Confluence. Drafted 2026-10-18 against `main` at `5954629`; the polish pull request (#38) is open. The Atlassian connector cannot write Confluence pages (see README), so publishing needs a signed-in browser. When published, the page gets a page id and version in this line and the README table.

Programme dossier for spec 003, written against the fourteen-point contract in [Programme Dossier Contract & Reconciliation Register](https://vladsimion.atlassian.net/wiki/spaces/~7012186ee7d7085f34fff9bc2bf8fbe8de309/pages/36569092) as spec 002's dossier is.

## 1. Programme metadata

| | |
|---|---|
| Programme type | Editorial framework: the essay record, the nine-stage pipeline, the essay page and its components |
| Status | **Implemented on `main` except Polish's last item** (these records, T046). Foundation, User Stories 1 to 4 and US3's site half are merged; Polish is in PR #38. User Story 5 is out of v1. |
| Jira | **TCX-4** epic (In Progress); stories **TCX-23** (US1 read an essay), **TCX-24** (US2 nine stages), **TCX-25** (US3 hold an essay safely), **TCX-26** (US4 shared components), **TCX-27** (US5, out of v1). Related, not a child: **TCX-51** (Terra Sigillata rebuild). |
| Canonical parent | A standalone page at the root of the space, as for specs 001 and 002 |
| Repository | https://github.com/vladsimion/terra-chartarum-next (public). Spec `specs/003-essay-framework/`; code `src/registry/` (rules, stages, promote, new essay, body scanner), `src/essays/`, `src/pages/essays/`; decisions `docs/adr/0010`; components `docs/essay-components.md` |
| Last reconciliation | 2026-10-18 (1218 Vitest tests on `main` at `5954629`; 1245 on the polish branch) |

## 2. Purpose / thesis

An essay is an argument over shared evidence, and the system will not publish one that has not earned it. The falsifiable claim: **an essay cannot reach Publish unless every stage's checks hold, and an essay that is not public leaves no trace in any built output.**

## 3. Scope and non-goals

### In scope
- The essay record (question, thesis, rooms, layers, bibliography, accent, authors, interactions, sign-offs, history) and an MDX body that takes only record ids.
- Nine stages (Concept, Corpus, Research, Outline, Draft, Build, Design QA, Publish, Cross-link), each adding checks; `registry promote` and `registry new essay`.
- The essay page at `/essays/<slug>/`: thesis first, figures from map records, numbered Chicago notes with source, locator and verification state (also without JavaScript), seven-section bibliography, rooms and related essays, BibTeX/RIS/CSL-JSON exports.
- The `Interaction` wrapper, the citation/export control and the evidence panel, each documented; held-essay leak guarantees.

### Non-goals
- US5 (research-gated, outcome-dependent paths), and the timeline, compare slider, scrollytelling and map-linked annotation components (built when an essay's Outline needs one).
- The Terra Sigillata essay itself (TCX-51).

## 4. Outputs / deliverables

`src/registry/rules/essay.ts` (fifteen `ESSAY-*` rules, one named mutation each), `stages.ts`, `promote.ts`, `new-essay.ts`, `essay-body.ts`; `src/essays/` (citations, exports, bibliography, figure, related, page model, cells, components); `src/pages/essays/`; `docs/essay-components.md`; the fixture registry `tests/essays/fixtures/registry`; the Chicago notes-bibliography style, vendored unmodified.

## 5. Research, sources and rights framework

A claim citation points at an Evidence record, never at free text; finding aids cannot be cited. A locator is `verified` only if read by this project (who and when shown) and otherwise marked pending in words. Captions, credits and rights come from the map's record. The vendored Chicago style is CC BY-SA 3.0 and stays separate from the MIT code; its colophon credit is still open. At Publish, everything the body embeds or cites, down to the source and bibliography entry, must be published and released (FR-017).

## 6. Evidence and data architecture

The page reads the registry only through the public projection, so a held essay, map or source cannot reach a page. Interaction declarations live in the essay record and are referenced by id; the gate checks both directions. Trench A cells that CND will later own are the essay's local data marked `corpus: none`, and a retrofit adds only an `attestation` ID.

## 7. Essay and editorial architecture

Nine stages with a derived lifecycle (ADR 0003 section 2) and cumulative checks. `promote` moves one stage at a time, writes `stage` and `stage_history`, and refuses a skipped stage, a failing check or an unknown essay. Sign-offs (historical, cartographic, data) name a person and a date. Accessibility and performance are proved by CI on the pull request, not by `promote`; Cross-link needs `redirect_switched` when a rebuilt essay supersedes a `legacy_url` (ADR 0010, spec 008).

## 8. Interaction and technical implementation

### 8.1 Seams (where tests live)
1. Pure modules: `stages`, `essay-body`, the `ESSAY-*` rules, `citations`, `exports`, `bibliography`, `figure`, `related`, `cells`, and `buildEssayPage`.
2. The registry commands, through `main()` in integration tests.
3. The built fixture site, through Playwright (chromium dark and light, no JavaScript) and axe.

### 8.2 Rules that tests enforce
- A body names only record ids; a title or caption typed into the body is a build error.
- A component has a documented question, keyboard model, reduced-motion behaviour and no-JavaScript fallback (`component-docs.test.ts`).
- A held essay has no page and none of its title, slug, id or anchors appears anywhere in the build.

### 8.3 CI and repository
The essay page type is in the CI template list (spec 002). Essay end-to-end specs run with `npm run test:e2e:essays`.

## 9. Implementation phases and dependency model

Foundation (T003 to T010), US2 (rules, promote, new essay), US3 registry half, US1 (pure modules, then the page), US4, US3 site half, Polish. Phases 1 to 4 run without Astro; the page needs spec 002's shell and the registry integration.

## 10. Jira hierarchy and reconciliation history

TCX-4 holds TCX-23 to TCX-27; each story's description carries its Spec Kit checklist. TCX-23 and TCX-24 stay In Review, and TCX-25 and TCX-26 were moved to In Review when PR #37 opened; none is Done until this dossier is published. The Source field `entry` was pulled forward from spec 006 (ADR 0014) without `SRC-ENTRY`.

## 11. Programme acceptance criteria

- Every acceptance scenario of US1 to US4 has a passing automated test.
- The integrity gate, accessibility and performance checks pass on the pull request (`gate`).
- No `[NEEDS CLARIFICATION]` remains in the spec.

## 12. Verification ledger

| Claim | Evidence |
|---|---|
| Fifteen essay rules, each stage-gated, each with a mutation | `tests/registry/unit/essay-*.test.ts`, `mutations.ts` |
| promote and new essay | `tests/registry/integration/{promote,new-essay}.test.ts` |
| Held essay leaves no trace | `tests/registry/integration/held-essay.test.ts`, `tests/essays/e2e/held-essay.spec.ts` |
| Citations, notes and exports | `tests/essays/unit/{citations,exports}.test.ts`, `e2e/citation.spec.ts` |
| Essay page and accessibility | `tests/essays/e2e/essay-page.spec.ts` (axe) |
| Components | `tests/essays/e2e/components.spec.ts`, `unit/component-docs.test.ts` |
| Not verified locally | Firefox, WebKit and Lighthouse (CI runs them); `components.spec.ts` and `cells.ts` were written after, not before, their code |

## 13. Canonical ownership and propagation

Owned here: the essay record, the stage table and the body tags. Spec 001 owns the registry and its rule ID table (the `ESSAY-*` rows are added there); spec 002 owns the shell and the CI template list; spec 008 owns the redirect rules generated from `legacy_url`. The Build Log carries shipped work; no new Decision Log entry is needed (the decisions are in ADR 0010).

## 14. Current checkpoint and delivery authority

Foundation and User Stories 1 to 4 are merged (PRs #35, #36 and #37, with the plan in PR #17 and the grill in PR #16); Polish is PR #38. 1218 Vitest tests on `main`. Open: publishing these records; a decision on page paths (the registry's `pagePath` and `_redirects` use `/<family>/<slug>/`, the site `/essays/<slug>/`, spec 004 `/collection/<slug>/`); whether `promote` should enforce the CI template list as ADR 0010 words it or only print the requirement as the CLI contract says; the colophon credit for the CC BY-SA style; T002 (checked-in fixture tree is in place, the task is not ticked); small refactors the review left (duplicate string helpers, the length of `buildEssayPage`). `main` and the TCX board are the delivery authority; this page summarises them.
