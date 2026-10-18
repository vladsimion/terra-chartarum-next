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
                                  0006 registry identity & record model · 0007 EDTF dates
                                  0008 colour schemes & accents · 0009 licensing
                                  0010 editorial pipeline · 0011 map record model
src/registry/                     the registry module and integrity gate (spec 001)
src/shell/, src/pages/            the shell, design tokens and pages (spec 002)
src/integrations/                 the Astro integration that runs the gate in the build
tests/registry/                   unit, integration, fixtures, mutation and timing tests
tests/shell/                      unit, build-output and Playwright tests for the shell
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

## The essay framework and editorial pipeline (spec 003)

An essay is a record in `content/essay/` plus an MDX body beside it, taken through nine stages (Concept, Corpus, Research, Outline, Draft, Build, Design QA, Publish, Cross-link). Each stage adds checks to the integrity gate; a stage is never skipped.

```bash
npm run registry -- new essay "Title" --room map --question "..." --author "Name" --dir <root>   # scaffold at Concept
npm run registry -- promote <essay-id> Corpus --by "Name" --dir <root> [--check]                # one stage forward, if its checks pass
```

The id is the full one the command prints (`tc:tc:essay:essay-000004`) and stage names are capitalised. The body takes only record ids, through `MapFigure`, `Cite`, `EvidencePanel`, `Interaction` and `CitationExport` (contract: [`mdx-body.md`](specs/003-essay-framework/contracts/mdx-body.md)); captions, rights and notes come from the records, never from the body. Components and what each does without JavaScript or with reduced motion: [`docs/essay-components.md`](docs/essay-components.md). Every public essay gets BibTeX, RIS and CSL-JSON at `/essays/<slug>/cite.{bib,ris,json}`. An essay that is not public has no page and appears in no output.

Essay end-to-end specs build the fixture registry: `npm run test:e2e:essays`. Walkthrough: [`specs/003-essay-framework/quickstart.md`](specs/003-essay-framework/quickstart.md).

## The collection and cartographers (spec 004)

One canonical record per map witness (a copy this project holds, or one an institution holds), under `content/map/`, with its makers in `content/cartographer/` and a biography beside each in `<id>.md`. Every field a record page shows has a value or a stated status (`field_status`), so nothing unestablished looks established. Decision: [ADR 0011](docs/adr/0011-map-record-model.md).

```bash
npm run registry -- completeness --dir . --out reports-completeness   # the editor's completeness report and ranked enrichment queue
REGISTRY_ROOT=tests/collection/fixtures/registry npm run build         # build the site from the collection fixtures
npm run test:e2e:collection                                            # viewer, filters, axe, on the same fixtures
```

- **Pages**: `/collection/` (the list and its filters), `/collection/<slug>/` (the record, with a deep-zoom viewer that loads only when asked, its citation and export files, and where the map is used), `/cartographers/` and `/cartographers/<slug>/`. `/data/collection-index.json` feeds the filters. Page addresses come from `src/registry/routes.ts`.
- **Rules**: ten registry rules (`MAP-*`, `CART-KIND`) in `src/registry/rules/map.ts`, listed in [`rule-ids.md`](specs/001-scholarly-registry/contracts/rule-ids.md). A map whose reproduction is not cleared is public but its page shows no image and says why.
- **Never published**: acquisition details (`MAP-PRIVATE-FIELD`), held records, and the editor reports; the output scan (`registry scan`) fails if any reaches the site.
- Walkthrough: [`specs/004-collection-catalogue/quickstart.md`](specs/004-collection-catalogue/quickstart.md).

## The shell and design system (spec 002)

An Astro static site (`output: 'static'`, no adapter): every page is generated at build time. The shell is the header, footer, breadcrumbs and skip link in `src/shell/layouts/Base.astro`; it reads only the registry's public projection, never `content/` directly.

```bash
npm test && npm run typecheck && npm run lint:css   # Vitest, TypeScript, Stylelint
npm run build                                       # registry gate, pages, then _redirects and data/relations.json
npm run shell:check                                 # lists stub pages and draft copy left in the build
npm run shell:check -- --cutover                    # exits 1 while any remain (a required step of spec 008)
npm run test:e2e                                    # Playwright and axe; Lighthouse CI is `npm run lhci`
```

Rules that tests enforce:

- **One token file.** `src/shell/styles/tokens.css` is the only place for colours, type sizes, spacing and motion; Stylelint rejects raw values anywhere else. Dark is the default, light follows the reader's system, and contrast is tested on every declared pair in both schemes (ADR 0008).
- **One destination list.** `src/shell/destinations.ts` drives the header, footer, breadcrumbs, stub pages and the build check. A spec that builds a destination flips its status from `stub` to `built` in the same change.
- **Stub pages and draft copy** are marked (`data-stub`, `data-draft`), listed by `shell:check` and must be gone at cutover.
- **Licences.** Code is MIT (`LICENSE`), original prose and data CC BY 4.0, and every image, dataset and layer shows its own licence from its registry `rights` (ADR 0009).
- **Set `REGISTRY_ROOT`** to read a registry other than the repository root; the tests use `tests/shell/fixtures/registry`.

Walkthrough: [`specs/002-shell-and-design-system/quickstart.md`](specs/002-shell-and-design-system/quickstart.md).

## Why each tool

- **Spec Kit** owns the artefacts: constitution, spec, plan, tasks, analyze, implement.
- **grill-with-docs** interviews in rounds until every branch of a decision is settled, leaving behind glossary entries and ADRs.
- **tdd** makes implementation test-first in vertical slices at agreed seams.
- **Jira** tracks delivery only: epic per spec, story per user story. It never overrides a spec.
