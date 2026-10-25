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
0. **Claim before you build.** Before `/speckit-specify` or `/speckit-implement`, look for work already under way on the same spec number: `git ls-remote --heads origin '*<NNN>*'` and `gh pr list --state open --search '<NNN> in:title'`. If anything turns up, stop and ask; two implementations of spec 001 were written in parallel because nobody looked (spec 001 dossier §10.2). Right after `/speckit-tasks`, open a draft PR titled `<NNN>: <spec title>` and assign the spec's Jira epic, so the next session finds the claim.
1. `/grill-with-docs` on any new idea or change before specifying. It updates `GLOSSARY.md` and adds ADRs to `docs/adr/` as decisions crystallise.
2. `/speckit-specify` → `/speckit-clarify` (repeat until no `[NEEDS CLARIFICATION]`) → `/speckit-plan` → `/speckit-tasks` → `/speckit-analyze`.
3. `/speckit-implement`, always with the `tdd` skill: agree the seams first, then one user story (vertical slice) at a time, red → green. Refactoring happens in review (`code-review`), not inside the loop.
4. **The repository is canonical; Jira and Confluence follow it.** A fact a spec, ADR or test owns has one home, here. Whenever you implement anything tracked in Jira, update the repository copies in the same PR, and say what you changed in the report:
   - **Confluence:** edit `docs/confluence/<spec>.md` (the dossier), `build-log-*.md` and the Decision Log drafts in the PR itself. Publishing copies the merged file to its page (pages listed in `docs/confluence/README.md`) and never edits the page by hand; a page that differs from its file at `main` is wrong, not the file.
   - **Counts are generated, never typed.** Rules, mutations, entities, errors and warnings appear only inside the `<!-- status:begin -->` … `<!-- status:end -->` block, which `npm run status -- --write` fills from `main`; `npm run status -- --check` fails CI when a block is stale. Historical counts in a reconciliation history stay as written, marked with the SHA they were true at.
   - **Jira:** move the ticket to the status the facts support (In Progress when started, In Review when a PR is open, Done when the PR is merged with `gate` green). Link the PR and point the description at `specs/<NNN>/tasks.md` instead of copying its checklist; the epic's description says what is open and links the dossier file for the rest.
   - **Drafts when Confluence cannot be written:** put them in `docs/confluence/` and follow `docs/confluence/README.md`. A pending Decision Log entry never carries a number: name the file `decision-log-pending-<slug>.md` and head the entry `TC-D??? — …`. The number is the next free one on the live page, assigned when it is published; the file is then renamed `decision-log-tc-dNNN.md`. Parallel sessions otherwise pick the same number.
   - State only what is true: do not mark a PR merged or a story Done before it is, and do not touch shared pages beyond the entries you add.

Do not use Matt Pocock's `/to-spec`, `/to-tickets` or `/implement` here: Spec Kit owns specs, tasks and implementation. Vendored from mattpocock/skills (MIT, see `docs/vendor/`): `grill-with-docs`, `grilling`, `domain-modeling`, `tdd`, `codebase-design`, `code-review`.

## Agent skills
### Issue tracker
Jira Cloud, site `vladsimion.atlassian.net`, project key `TCX`. TCX-1 is the ratification gate; epics: TCX-2 (001 registry), TCX-3 (002 shell), TCX-4 (003 essays), TCX-5 (004 catalogue), TCX-6 (005 Atlas), TCX-7 (006 bibliography), TCX-8 (007 rooms), TCX-44 (008 migration and cutover), TCX-52 (009 anchor essay). One story per spec user story; Spec Kit task IDs (T001…) go in the story description as a checklist. Do not use `/speckit-taskstoissues` (it targets GitHub Issues).

### Domain docs
`GLOSSARY.md` (single context) and `docs/adr/NNNN-slug.md`.

## v1 scope
Specs 001–005, 007-US1 (rooms) and 008, anchored on Terra Sigillata (Trench A) and the Corpus Chartarum Daciae collection (Roman Dacia layers). CND attestations deferred to pilot acceptance.

## Essays
One essay rebuilt on the existing framework is not a programme. Start it with `.specify/templates/essay-spec-template.md` (one page; the editorial stage machine and the `ESSAY-*` rules are its acceptance), not a full spec, grill and dossier. Use the full workflow only for a new capability or a multi-essay corpus with research depth comparable to Corpus Chartarum Daciae.

## Definition of Done (per user story)
- Every acceptance scenario covered by a passing automated test written first.
- Integrity gate, accessibility and performance checks pass.
- No `[NEEDS CLARIFICATION]` left in the story's spec section.
- The repository copies of the dossier, Build Log section and any Decision Log draft are updated in the same PR (workflow step 4).
- The PR is merged with `gate` green. The story moves to Done at that point; publishing to Confluence follows the merge and does not hold the story open.
