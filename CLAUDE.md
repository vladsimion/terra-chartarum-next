# CLAUDE.md

## Project
Terra Chartarum successor: a fresh, spec-driven build of the digital historical atlas and scholarly cartographic publication. It will be served at terra-chartarum.org; the old terra-chartarum.pages.dev becomes the frozen archive (ADR 0001, ADR 0005). Specs are the source of truth; code is derived from them.

## Read first
- `.specify/memory/constitution.md`: non-negotiable principles. Every plan must pass its Constitution Check.
- `GLOSSARY.md`: shared domain language. Use these terms exactly in code, tests, specs and tickets.
- `docs/adr/`: decisions 0001–0017 (successor and cutover, v1 anchor, shared contracts, experience contract, stack/hosting/repo, registry identity and record model, EDTF dates, colour schemes and accents, licensing, the editorial pipeline, the map record model, hosting as a Worker, the Atlas contracts (0013: strict public listing, the address as the only saved state, derived rooms, assets built from sources), the bibliography model (0014: a Source points at one entry, citations are derived and never stored, an entry is public only when a public record cites it), rooms (0015: rooms are public by rule, one page each, membership derived once in `src/rooms/membership.ts`), migration, 0017: the anchor essay is rebuilt whole as a faithful port with no JavaScript, releasing only what it uses).

## Stack (ADR 0005)
Astro + TypeScript strict + content collections/Zod; MapLibre; GeoJSON/FlatGeobuf/PMTiles/COG; IIIF + OpenSeadragon; Allmaps. Tests: Vitest, Playwright, axe, Lighthouse CI against the ADR 0004 budgets. Data-prep pipelines may be R (`sf`, `targets`) with `testthat`; their outputs are validated by the TypeScript integrity gate.

## Workflow
1. `/grill-with-docs` on any new idea or change before specifying. It updates `GLOSSARY.md` and adds ADRs to `docs/adr/` as decisions crystallise.
2. `/speckit-specify` → `/speckit-clarify` (repeat until no `[NEEDS CLARIFICATION]`) → `/speckit-plan` → `/speckit-tasks` → `/speckit-analyze`.
3. `/speckit-implement`, always with the `tdd` skill: agree the seams first, then one user story (vertical slice) at a time, red → green. Refactoring happens in review (`code-review`), not inside the loop.
4. **Keep Jira and Confluence in step, every time, without being asked.** Whenever you implement anything tracked in Jira (a task, a story or an epic), update both in the same piece of work, and say what you changed in the report:
   - **Jira:** move the ticket to the status the facts support (In Progress when started, In Review when a PR is open; Done only when the Definition of Done below is met and the PR is merged), tick or append its Spec Kit checklist, link the PR, and keep the parent epic's description current (merged PRs, counts, decisions, what is open).
   - **Confluence:** update the programme's dossier (spec 001: page `36569092`; spec 002: page `37617686`; repository source `docs/confluence/<spec>.md`; keep the two identical), the Build Log for shipped work, and the Decision Log for cross-programme decisions. Counts (rules, mutations, tests) and open items must match `main`.
   - **Drafts when Confluence cannot be written:** put them in `docs/confluence/` and follow `docs/confluence/README.md`. A pending Decision Log entry never carries a number: name the file `decision-log-pending-<slug>.md` and head the entry `TC-D??? — …`. The number is the next free one on the live page, assigned when it is published; the file is then renamed `decision-log-tc-dNNN.md`. Parallel sessions otherwise pick the same number.
   - State only what is true: do not mark a PR merged or a story Done before it is, and do not touch shared pages beyond the entries you add.

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
- Jira board and Confluence dossier brought up to date (workflow step 4).
