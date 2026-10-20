# Research: Migration & Cutover

Decisions not already settled by the grill (ADR 0016), ADR 0001 or ADR 0005.

## R1. Static extraction of a `RAW` array
- **Decision**: parse the legacy `.ts` file with `@babel/parser` and its TypeScript plugin (TypeScript 7, the native port, has no JavaScript compiler API), find the `const RAW` declaration, and evaluate its initialiser as a literal tree: object, array, string, numeric (including a leading `-`), boolean, null and template literals without substitutions; a property whose value is anything else (a call, an identifier, a spread, a template with substitution) fails the import, naming the file, the record and the key. Comments are ignored. Zod schemas and imports in the file are never evaluated.
- **Rationale**: the legacy files import `astro:content` and sibling modules, so they cannot run without the old toolchain; literal data is all the catalogue holds.
- **Alternatives**: transpile and run with stubbed imports (fragile, not deterministic across environments); regular expressions (break on nested quotes).

## R2. Years to EDTF
- **Decision**: a signed integer year `y` becomes a four-digit signed EDTF year: `-600` → `-0600`, `1579` → `1579`, `106` → `0106`. A year the legacy data marks approximate (a `~` or "c." in a sibling label, where present) becomes `<year>~`. Conversions that guess (an approximation read from a label) are logged as lossy in the report with the original value.
- **Rationale**: ADR 0007 makes uncertainty part of the value; a plain integer is exact only by accident.
- **Alternatives**: keep integers (the registry rejects them); invent ranges (not in the data).

## R3. Which routes the inventory contains
- **Decision**: the inventory is built from the snapshot, never the live site: the static page routes in `src/pages` (31 files), the dynamic routes expanded from the registries that feed them (`collection/[id]` from maps, `cartographers/[id]`, `atlas/layers/[layer]` (expanded from the Handbook documents of type `layer`, not from the layers registry), `rooms/[slug]`, `essays/[slug]` from `src/content/essays`, the Handbook `[...path]` from its content), and the data endpoints. Each route is normalised to a trailing-slash path and carries its kind.
- **Rationale**: the snapshot is the pinned input, so the inventory is reproducible; a crawl of the live site would not be.
- **Alternatives**: crawling the live site (non-deterministic, depends on the network).

## R4. Outcome policy for each kind of route
- **Decision**: see [contracts/redirect-inventory.md](./contracts/redirect-inventory.md). In short: a route with a public successor counterpart at cutover gets one rule; a route with none is served in place by the archive; an unrebuilt essay is served in place; a rebuilt essay gets one rule.
- **Rationale**: the archive is the old site (ADR 0005 §4), so the only URLs that need a rule are those whose content moved.
- **Alternatives**: a rule for every URL (rules that point at pages that do not exist); no rules (breaks every migrated link).

## R5. Applying the rule file to the archive project
- **Decision**: `registry archive-redirects` writes `archive/_redirects`; the editor copies it into the archive repository's `public/_redirects` (or merges, keeping rules for other purposes) in a pull request there and signs `redirect_switched` on the essay record (ADR 0010). The command never pushes anywhere.
- **Rationale**: the archive is outside this repository and a wrong rule is user-visible; a person reviews it.
- **Alternatives**: a workflow that pushes to the archive repository (credentials and unreviewed changes).

## R6. How `archive:check` and `baseline` reach the network
- **Decision**: both are plain scripts using `fetch` (Node) and, for `baseline`, `npx @lhci/cli@0.15.1` against live URLs with the same mobile profile as CI; both take URLs as arguments, print a report and write a JSON file; neither runs in CI. Their logic (parsing a response, comparing headers, summarising results) is pure and tested against a local server.
- **Rationale**: the network is outside the deterministic build; keeping the logic pure keeps the tests offline.
- **Alternatives**: running them in CI (flaky and dependent on the archive being up).

## R7. The v1 Dacia records
- **Decision**: the Dacia adapters read `data/dacia/places.csv` and `data/dacia/sources.csv` (CND places and sources) and the Roman Dacia layers' sources (`public/geo/dacia-roman-sites.geojson` and `public/geo/dacia-roman-network.geojson`, corrected at T003) through the `atlas` layer registry; they import only the places and sources referenced by those layers and by the Trench A pilot files (`data/dacia/pilot/`), found by ID. Attestations (`attestations.csv`) are not imported (CND stays unpublished, ADR 0002).
- **Rationale**: the anchor needs the layers and the entities they name, not the whole CND dataset.
- **Alternatives**: all CND places (hundreds of held records with no v1 page).

## R8. Slug collisions
- **Decision**: since a slug equals the legacy local-id, two legacy records of different families may share one (for example a map `babylonian` and a place `babylonian`). Slugs need only be unique within a family's URL space (`/collection/` against `/atlas/`), which the registry's slug rule already enforces per family; the import fails only on a collision inside one family or with a former slug.
- **Rationale**: the registry's `SLUG-UNIQUE` is per family.
- **Alternatives**: prefixing slugs (breaks the one-to-one old path mapping).

## R8. The snapshot re-checked (2026-10-19)
- **Decision**: the contracts are corrected against the legacy repository at `e82afd990fd473a2cdf80896401bc64602a1bd29` (last pushed 2026-10-01). Counts: 59 maps, 19 cartographers, 34 bibliography items, 12 toponyms, 27 layers, 6 collections, 27 release assets, 31 page routes, 22 essays. Differences found: 27 layers, not 16; the toponym keys; layer `lifecycle` is `in-review` on 9 and absent on 18; `custody` is `institutional` on 10 and `unlocated` on 1 (never `held`); `recordScope` is set on 11 (3 object, 6 work, 2 concept); 24 images carry only `src`, `alt`, `credit` and `license`; 79 inline bibliography references are registry keys and 3 are inline objects; uncertainties use `wouldResolve`.
- **Static extraction**: every registry declares `const RAW: unknown[] = [...]` of pure literals (no spread, call, template substitution or computed key); the value imports (`z` from `astro:content`, a room list from a sibling module, `RAW.map(Schema.parse)`) are all outside `RAW`. The extractor reads the initialiser of `RAW` and tolerates the type annotation; a non-literal value inside it fails the import naming the file and key. The fixture includes one deliberate non-literal case, since the real data has none.
- **Private keys**: no price, cost, owner, donor, dealer or auction key in the six registries; `acquisition` is in the schema but set on no record. `data/dacia/reference/acquisition-dossiers.csv` is outside the v1 profile.
- **Rationale**: the contracts were written from a survey; the pinned snapshot is the truth, and T003 repeats this check at the SHA the editor pins.

## R9. The snapshot re-checked at the pinned SHA (T003, 2026-10-20)
- **Decision**: the pinned snapshot for v1 is the legacy repository at `e82afd990fd473a2cdf80896401bc64602a1bd29` (committed 2026-10-01 11:43 UTC; a fresh clone at `/tmp/legacy-snapshot`, clean). It is the same commit as R8, so the counts stand: 59 maps, 19 cartographers, 34 bibliography items, 12 toponyms, 27 layers, 6 collections, 27 release assets, 120 CND places (40 pilot) and 30 CND sources (12 for Trench A). A dry run of `registry import-legacy` on it stages 284 records, the staging gate passes with 0 errors and 167 warnings (80 FAM-REQUIRED, 52 AUTO-UNADJUDICATED, 35 RIGHTS-MISSING), 28 lossy conversions, no unmapped term, and drops the map room fields (59, 51, 3), the same as before spec 008's FR-016 completion.
- **Findings**: every key the importer sets aside from the atlas registries is named in the contract. The Dacia section did not carry its tables: six columns (`external_verified`, `date_label`, `date_precision`, `rights_statement`, `year_from`, `year_to`) were not named, and it said the 40 places come from `pilot-manifest.json` (they come from `pilot-places.csv`; the manifest has the count and a hash). R7 gave the Roman Dacia layer sources as `data/dacia/gis/roman-dacia*.geojson`; they are `public/geo/dacia-roman-*.geojson`. The contract now has both Dacia tables and R7 is corrected. One adapter change: `witness`, `edition_state`, `repository`, `repository_object_id` and `scope` of a CND source (all filled in the 12 Trench A rows) were listed as mapped but written nowhere, so they were dropped without being reported; they are now report-only, like the other columns a source has no field for.
- **Rationale**: the contracts were written from a survey, so the pinned snapshot is the truth; this check repeats R8 at the SHA the editor pins for T028.
