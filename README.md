# Terra Chartarum (successor build)

A digital historical atlas and scholarly cartographic publication, rebuilt from scratch with spec-driven development. It succeeds terra-chartarum.pages.dev and will be served at **terra-chartarum.org**; the old site becomes the frozen archive at cutover.

Specs come first; code is derived from them. Requirements are distilled from the Terra Chartarum Confluence handbook (Volumes I, IV–VIII, Decision Log) and settled through grilling sessions recorded as ADRs.

## Repository map

```
.specify/memory/constitution.md   10 principles, editorial governance, Constitution Check
GLOSSARY.md                       shared domain language (maintained by /grill-with-docs)
CLAUDE.md                         agent instructions: workflow, stack, Jira, v1 scope
GRILL-AGENDA.md                   decisions settled and still open
docs/adr/                         0001 successor & cutover · 0002 v1 anchor (Dacia)
                                  0003 shared contracts · 0004 experience · 0005 stack/hosting/repo
                                  0006 registry identity & record model
src/registry/                     the registry module and integrity gate (spec 001)
tests/registry/                   unit, integration, fixtures, mutation and timing tests
docs/vendor/                      licence + pinned commit for vendored skills
specs/
  001-scholarly-registry/         IDs, evidence/provenance, lifecycle, integrity gate
  002-shell-and-design-system/    header, tokens, accessibility & performance gates
  003-essay-framework/            essays, nine editorial stages, held/released
  004-collection-catalogue/       map objects, cartographers, deep zoom
  005-atlas/                      time, Themes/Collections/Rooms, inspector, deep links, Handbook
  006-bibliography/               canonical entries, Cited in, citation export
  007-rooms/                      the seven curatorial paths
  008-migration-cutover/          ID-preserving import, frozen archive, redirect map
.claude/skills/                   Spec Kit (speckit-*) + grill-with-docs, grilling,
                                  domain-modeling, tdd, codebase-design, code-review
```

## Build order

```
001 registry ──┬──> 003 essays ──> 007 rooms
002 shell ─────┤──> 004 catalogue
               ├──> 005 atlas
               ├──> 006 bibliography
               └──> 008 migration & cutover
```

**v1** = 001–005, 007-US1 (rooms) and 008, anchored on Terra Sigillata (Trench A) and the Corpus Chartarum Daciae collection. Tracked in Jira project **TCX**.

## Working in this repo (Claude Code)

```text
/grill-with-docs        stress-test an idea; updates GLOSSARY.md and docs/adr/
/speckit-constitution   ratify or amend the constitution
/speckit-clarify        per spec, until no [NEEDS CLARIFICATION] remain
/speckit-plan           start with 001 (and 002 in parallel)
/speckit-tasks          then /speckit-analyze
/speckit-implement      with the tdd skill, one user story at a time
```

## Registry and integrity gate (spec 001)

The scholarly registry is a framework-free TypeScript module in `src/registry/`: one file per entity under `content/<family>/`, validated by a pure `validateRegistry` and wrapped by the `registry` command.

```bash
npm ci                                     # Node 24, see .nvmrc
npm test && npm run typecheck              # unit, integration, mutation and timing tests
npm run registry -- check --dir <root>     # validate <root>/content, write reports/integrity-report.{json,html}
npm run registry -- build --out dist       # run the gate; only if it passes, write _redirects and data/relations.json for the site
npm run registry -- mint place             # next unused local-id for a family
npm run registry -- scan dist              # fail if built output leaks a private value or a non-public id
```

Walkthrough: [`specs/001-scholarly-registry/quickstart.md`](specs/001-scholarly-registry/quickstart.md). Decisions: [ADR 0006](docs/adr/0006-registry-identity-and-record-model.md).

## Why each tool

- **Spec Kit** owns the artefacts: constitution, spec, plan, tasks, analyze, implement.
- **grill-with-docs** interviews in rounds until every branch of a decision is settled, leaving behind glossary entries and ADRs.
- **tdd** makes implementation test-first in vertical slices at agreed seams.
- **Jira** tracks delivery only: epic per spec, story per user story. It never overrides a spec.
