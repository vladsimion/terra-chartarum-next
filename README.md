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
                                  0012 hosting as a Worker · 0013 Atlas contracts · 0014 bibliography
                                  0015 rooms · 0016 migration
src/registry/                     the registry module and integrity gate (spec 001)
src/shell/, src/pages/            the shell, design tokens and pages (spec 002)
src/integrations/                 the Astro integration that runs the gate in the build
tests/registry/                   unit, integration, fixtures, mutation and timing tests
tests/shell/                      unit, build-output and Playwright tests for the shell
src/atlas/, src/atlas-client/     the Atlas: pure modules, the build step, and the browser code (spec 005)
src/bibliography/                 the bibliography: who cites what, the public entries, the search index, the citations (spec 006)
src/rooms/                        the seven rooms: who belongs to a room, its page models, its introduction renderer (spec 007)
content/room/                     the seven room records and their Markdown introductions (draft copy until the author finalises it)
tests/atlas/                      unit, build-output, Playwright and performance tests for the Atlas
tests/rooms/                      unit, build-output and Playwright tests and the fixture registry for the Rooms (spec 007)
tests/bibliography/               unit, build-output and Playwright tests, the fixture registry and the import samples (spec 006)
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

## The Atlas (spec 005)

A time-aware map: pick a year, switch on layers from the catalogue (by theme, collection or room), and see only what was valid then, each line drawn by how it is known (documentary, reconstruction, generalised, present-day reference) and each uncertain date drawn paler. A layer is a record under `content/layer/` with a GeoJSON or PMTiles source; the build converts each public layer to FlatGeobuf with year bounds in every feature. Decisions: [ADR 0013](docs/adr/0013-atlas-contracts.md).

```bash
npm run registry -- check --dir tests/atlas/fixtures/registry         # the Atlas fixtures pass the gate
REGISTRY_ROOT=tests/atlas/fixtures/registry npm run build              # pages, then the Atlas files under data/
npm run test:e2e:atlas                                                 # year, lens, inspector, share, place search, overlay, no WebGL, keyboard, no outside requests
npm run test:e2e:atlas-perf                                            # timings on a seeded 200-layer catalogue (registry synth --atlas)
```

- **Pages**: `/atlas/` (the Atlas) and `/atlas/handbook/` with five topics (draft skeleton copy until the author releases them). The address (`/atlas/?y=150&l=slug,slug&lens=collection&c=slug`) is the only saved state and carries public slugs only.
- **Rules**: seven registry rules (`LAYER-THEME`, `LAYER-TIME`, `LAYER-FACET`, `LAYER-GEOREF`, `LAYER-ASSET-SIZE`, `PLACE-NAMES`, `PLACE-LOCATION`) in `src/registry/rules/atlas.ts`, plus build-time checks (`ATLAS-*`) in `src/atlas/build/`.
- **Loading**: the page script is about 91 KB; MapLibre (served unbundled from `vendor/maplibre/`), the FlatGeobuf reader and, for a map overlay, the Allmaps plugin load only when a layer needs them. Without WebGL the page shows a build-written SVG overview and a table of features per layer instead.
- **Never published**: a layer or collection that is not both published and released, and any private value; the output scan covers the Atlas files too. No third-party tile service is called.
- Walkthrough: [`specs/005-atlas/quickstart.md`](specs/005-atlas/quickstart.md).

## The bibliography (spec 006)

The works the publication rests on, and where each is used. An entry is a record under `content/bibliography_entry/` plus a CSL-JSON file beside it that holds its citation fields and identifiers (DOI, ISBN, keywords); a Source points at exactly one entry. Citations are never stored: they are derived at build time, by two routes (a record lists the entry in `bibliography[]`, or an essay's evidence rests on a Source that points at it). An entry is public only when it is published, released, in one of the seven sections and cited by a public record. Decisions: [ADR 0014](docs/adr/0014-bibliography-model.md).

```bash
npm run registry -- import-bib export.bib --dir . --dry-run   # bring in a Zotero or Mendeley export (.bib, .ris or CSL-JSON): new works become held entries, ones the registry already has are reported and never written
REGISTRY_ROOT=tests/bibliography/fixtures/registry BUILD_DATE=2026-10-17 npm run build   # build the site from the bibliography fixtures
npm run test:e2e:bibliography                                 # filters with and without JavaScript, entry pages, axe, on the same fixtures
```

- **Pages**: `/bibliography/` (the entries as their Chicago form under the seven sections, with search and filters by section and essay that work without JavaScript) and `/bibliography/<slug>/` (identifiers, other editions and translations, a Finding aid badge, and Cited in as two labelled groups: *cited as evidence*, with the locator and whether it is verified, and *listed in bibliography*). `/data/bibliography-index.json` feeds the filters. A held entry, one cited only by held content and one nobody cites have no page.
- **Citing**: every public entry, dataset and layer, and the site itself, has BibTeX, RIS and CSL-JSON files (`cite.bib`, `cite.ris`, `cite.json`, or `/data/cite/<kind>/<slug>.*`), made by citation-js from the CSL item with the canonical URL and one access date for the whole site (`BUILD_DATE`, then `SOURCE_DATE_EPOCH`, then today). The Atlas inspector links a layer's and its dataset's.
- **Rules**: four registry rules (`SRC-ENTRY`, `BIB-CSL`, `BIB-EDITION`, `BIB-LISTED-HELD`) in `src/registry/rules/bibliography.ts`, listed in [`rule-ids.md`](specs/001-scholarly-registry/contracts/rule-ids.md).
- **Import**: duplicates match on DOI, then ISBN, then first author + year + the first six title words; a file that does not parse is rejected whole with its line.
- Walkthrough: [`specs/006-bibliography/quickstart.md`](specs/006-bibliography/quickstart.md).

## The rooms (spec 007)

Seven curatorial paths (Earth, Map, City, Border, Road, Archive, Theatre). A room is metadata, never a folder: its record (`content/room/<name>.yaml`) holds `order`, `short_description` and `copy_status`, and its introduction is the Markdown file beside it. What belongs to a room is derived, once, in `src/rooms/membership.ts`, from the public essays that name it as primary or secondary room; a map or layer is in a room only through those essays. All seven rooms are public by rule (`ROOM-PUBLIC`); unfinished prose is marked `copy_status: draft`, which `shell:check --cutover` refuses. Decisions: [ADR 0015](docs/adr/0015-rooms.md).

```bash
REGISTRY_ROOT=tests/rooms/fixtures/registry npm run build   # build the site from the rooms fixtures
npm run test:e2e:rooms                                      # keyboard, no JavaScript, touch targets and axe on the Rooms pages
npm run shell:check                                         # lists the draft room introductions until they are final
```

- **Pages**: `/rooms/` (the seven in order, with their short descriptions) and `/rooms/<slug>/` (the introduction, then Essays with Primary and Secondary, Maps linking to the Collection, and Layers linking to an Atlas view; a group with nothing in it is hidden, and a room with no public essay says essays are in preparation). The pages ship no script. A former room slug redirects.
- **Rules**: `ROOM-PUBLIC` and `ROOM-COPY` in `src/registry/rules/rooms.ts` (beside `ROOM-SET`), listed in [`rule-ids.md`](specs/001-scholarly-registry/contracts/rule-ids.md).
- **The link check**: `tests/shell/support/links.ts` resolves every internal link and `#fragment` in a built site, counting a path in `_redirects` as resolved; `npm test` runs it over the shell, collection, Atlas, bibliography and rooms fixture sites.
- Walkthrough: [`specs/007-rooms/quickstart.md`](specs/007-rooms/quickstart.md).

## Migration and cutover (spec 008)

Moves the legacy site's canonical data in with its identities intact, freezes the old site as an archive and checks the switch. Everything imported is `held`; nothing is ever overwritten; the legacy repository and live site are never modified from here. Decisions: [ADR 0016](docs/adr/0016-migration.md). The editor's list is [docs/cutover.md](docs/cutover.md).

```bash
npm run registry -- import-legacy --snapshot <legacy-clone> --profile v1 --out <stage>            # stage held records and import-report.json; offline and deterministic
npm run registry -- import-legacy --snapshot <legacy-clone> --profile v1 --out <stage> --apply   # add only the records that do not exist yet
npm run registry -- inventory --snapshot <legacy-clone>      # migration/redirect-inventory.json: every old URL, one outcome (in place, or one rule)
npm run registry -- archive-redirects                        # archive/_redirects: the rule file, applied to the archive project by pull request
npm run cutover:check                                        # the six automated steps over a production build; exits 1 and names each failure
npm run archive:check -- <url> ...                           # by hand, network: the archive banner, noindex header and link
npm run baseline -- <url> ...                                # by hand, network: Lighthouse mobile numbers of the live site, before the freeze
```

- **The archive is the old site itself.** An old URL whose content has not moved keeps working in place; only a moved page (a public record, a rebuilt essay, `/atlas/` with a query) gets a rule. `archive/` holds the patch for the archive project: `banner.html`, `_headers` and a README saying where each goes.
- **The real snapshot is a fresh pinned clone**, never your working copy; read `import-report.json` before `--apply`.
- **`cutover:check` is expected to fail** on the real registry until the room introductions are final and the anchor essay (`--anchor <slug>`, default `terra-sigillata-trench-a`) is published.

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
