# Confluence entry: Build Log (page 2490370)

Draft, not yet published. To publish: add as section Z, directly after section Y and before "2. In progress", and extend the header pointer "sections U to Y" to "sections U to Z"; leave the rest of the page unchanged and check by reading the page back.

## Z. The successor build: the bibliography (spec 006)

Merged to `main` of [github.com/vladsimion/terra-chartarum-next](https://github.com/vladsimion/terra-chartarum-next), 19 October 2026. Jira epic TCX-7. Working detail is in the [spec 006 programme dossier](DOSSIER_URL).

| PR | Scope | Jira |
|---|---|---|
| #65 | Setup and Foundation: entry schema, `entry` on Source, `bibliography[]` on datasets and layers, four rules (`SRC-ENTRY`, `BIB-CSL`, `BIB-EDITION`, `BIB-LISTED-HELD`) with a named mutation each, the public allowlist, fixtures and a seeded generator (T001 to T017) | TCX-39 |
| #68 | US1: browse the bibliography as evidence: the index by the seven sections with filters and search (working without JavaScript), the entry page with "Cited in" by both routes (T018 to T028) | TCX-39 |
| #69, #70 | US3 (sections and finding aids) and US2 (cite the site and its parts) merged into stacked base branches and did not reach `main`; their commits arrived through #71 | TCX-41, TCX-40 |
| #71 | US3, US2 and US4 to `main`: finding aids and sections; BibTeX, RIS and CSL-JSON exports for entries, datasets, layers and the site, and a Cite section in the Atlas inspector; `registry import-bib` (T029 to T039) | TCX-41, TCX-40, TCX-50 |
| #72 | Cross-cutting checks: the leak test with eleven named leaks, and every citation resolves (T040, T041). It found that the leak scan skipped `.bib` and `.ris`, fixed test-first | TCX-39 |
| #73 | Polish: `data/relations.json` names only entries the site lists; quickstart and README; code-review fixes (an import stops before its first write when a target exists; an entry's exported URL is its page address; a layer falls back to its own attribution) (T042, T043, T045) | TCX-7 |

State: 86 registry rules and 108 named mutations; 2142 Vitest tests in 171 files; Bibliography Chromium e2e 26. GATE_BL The stories are In Review, not Done; the epic TCX-7 is In Progress. Not verified locally: Firefox, WebKit and Lighthouse (CI runs them).
