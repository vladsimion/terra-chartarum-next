# Confluence entry: Build Log (page 2490370)

Not yet published. To go in as section AB, directly after section AA and before "2. In progress"; the header pointer "sections U to AA" becomes "sections U to AB". The text below is what is to be published.

## AB. The successor build: migration and cutover (spec 008)

Merged to `main` of [github.com/vladsimion/terra-chartarum-next](https://github.com/vladsimion/terra-chartarum-next), 19 and 20 October 2026. Jira epic TCX-44. Working detail is in the spec 008 programme dossier.

| PR | Scope | Jira |
|---|---|---|
| #83 | The spec 008 documents refreshed after a grill against the real legacy snapshot and specs 004 to 007: 27 layers, not 16; the toponym mapping rewritten from the real keys; the Dacia scope; the legacy layer pages stay in place | TCX-44 |
| #84 | Setup and Foundation: the import-only `legacy_*` fields; `MIG-SLUG`, `MIG-LEGACY`, `MIG-IMAGE-CLEARED` with named mutations (T005 to T013) | TCX-45 |
| #85 | US1 part one: static TypeScript extraction (the legacy files are read, never executed), CSV, the pinned snapshot, year to EDTF, vocabulary mapping (T002 to T004, T014 to T017) | TCX-45 |
| #86 | US1 part two: one adapter per legacy registry, the v1 profile, staging, add-only apply and `registry import-legacy` (T018 to T027) | TCX-45 |
| #87 | US3: the redirect inventory, the rule file for the archive project and the Atlas `from=legacy` notice (T029 to T034) | TCX-47 |
| #88 | US2: the archive patch (banner, `noindex`, link back) and `archive:check` (T035 to T038) | TCX-46 |
| #89 | US4: `cutover:check`, `docs/cutover.md` and the `baseline` script (T039 to T042) | TCX-48 |
| #90 | Polish: the quickstart run, the README, the code review and its fixes (the archive banner is found by its id) (T043 to T045) | TCX-44 |
| #91 | FR-016: a CND place keeps its original geometry term beside `vocabulary: cnd`; the staging gate sees the root's vocabulary mappings | TCX-45 |
| #92 | T003: the legacy registries re-read at the pinned SHA; the Dacia mapping tables added to the contract; five CND source columns that were dropped unreported are now reported | TCX-45 |
| #93 | T028: the real import, 285 held records from `e82afd9`; two defects found on the real data and fixed first | TCX-45 |

The two defects the fixture could not show. First, an inline citation with no year matches nothing in the matcher, so the importer minted a new entry for it on every run and a re-apply moved the citing records; it now recognises the site's own citation text as the entry it made before. Second, a journal article and its replication data (Marczinek, Maurer and Rauch, 2025) were merged into one entry by the weak key; the importer now keeps a doi.org address as the entry's DOI and the matcher never weak-matches two works with different DOIs. The lesson: run an import twice on the real data before applying it, and compare identifiers, not titles.

State: 91 registry rules and 120 named mutations; 2449 Vitest tests in 209 files; `registry check` passes with 0 errors and 167 warnings (the editor's remediation list); `gate` is green on #93. Imported: 59 maps, 19 cartographers, 27 layers, 27 datasets, 6 collections, 52 places, 46 sources, 49 bibliography entries, all held. Pinned snapshot `e82afd990fd473a2cdf80896401bc64602a1bd29`. The cutover has not happened; the date is not yet set. TCX-44 is In Progress; the live-site baseline (T042), the manual cutover steps and the author's copy are open.
