# CLAUDE.md

## Project
Terra Chartarum successor: a fresh, spec-driven build of the digital historical atlas and scholarly cartographic publication. It will be served at terra-chartarum.org; the old terra-chartarum.pages.dev becomes the frozen archive (ADR 0001, ADR 0005). Specs are the source of truth; code is derived from them.

## Read first
- `.specify/memory/constitution.md`: non-negotiable principles. Every plan must pass its Constitution Check.
- `GLOSSARY.md`: shared domain language. Use these terms exactly in code, tests, specs and tickets.
- `docs/adr/`: decisions 0001–0005 (successor and cutover, v1 anchor, shared contracts, experience contract, stack/hosting/repo).

## Stack (ADR 0005)
Astro + TypeScript strict + content collections/Zod; MapLibre; GeoJSON/FlatGeobuf/PMTiles/COG; IIIF + OpenSeadragon; Allmaps. Tests: Vitest, Playwright, axe, Lighthouse CI against the ADR 0004 budgets. Data-prep pipelines may be R (`sf`, `targets`) with `testthat`; their outputs are validated by the TypeScript integrity gate.

## Workflow
1. `/grill-with-docs` on any new idea or change before specifying. It updates `GLOSSARY.md` and adds ADRs to `docs/adr/` as decisions crystallise.
2. `/speckit-specify` → `/speckit-clarify` (repeat until no `[NEEDS CLARIFICATION]`) → `/speckit-plan` → `/speckit-tasks` → `/speckit-analyze`.
3. `/speckit-implement`, always with the `tdd` skill: agree the seams first, then one user story (vertical slice) at a time, red → green. Refactoring happens in review (`code-review`), not inside the loop.

Do not use Matt Pocock's `/to-spec`, `/to-tickets` or `/implement` here: Spec Kit owns specs, tasks and implementation. Vendored from mattpocock/skills (MIT, see `docs/vendor/`): `grill-with-docs`, `grilling`, `domain-modeling`, `tdd`, `codebase-design`, `code-review`.

## Agent skills
### Issue tracker
Jira Cloud, site `vladsimion.atlassian.net`, project key `TCX`. TCX-1 is the ratification gate; epics: TCX-2 (001 registry), TCX-3 (002 shell), TCX-4 (003 essays), TCX-5 (004 catalogue), TCX-6 (005 Atlas), TCX-7 (006 bibliography), TCX-8 (007 rooms), TCX-44 (008 migration and cutover). One story per spec user story; Spec Kit task IDs (T001…) go in the story description as a checklist. Do not use `/speckit-taskstoissues` (it targets GitHub Issues).

### Domain docs
`GLOSSARY.md` (single context) and `docs/adr/NNNN-slug.md`.

## v1 scope
Specs 001–005, 007-US1 (rooms) and 008, anchored on Terra Sigillata (Trench A) and the Corpus Chartarum Daciae collection (Roman Dacia layers). CND attestations deferred to pilot acceptance.

## Definition of Done (per user story)
- Every acceptance scenario covered by a passing automated test written first.
- Integrity gate, accessibility and performance checks pass.
- No `[NEEDS CLARIFICATION]` left in the story's spec section.
- Jira story moved to Done with the PR linked.
