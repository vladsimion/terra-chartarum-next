# Confluence entry: Build Log (page 2490370)

Published 2026-10-19 as section X (page version 129), directly after section W and before "2. In progress"; the header pointer "sections U, V and W" became "sections U, V, W and X". The rest of the page was left unchanged (checked by reading the page back). The text below is what was published.

## X. The successor build: map collection and cartographers catalogue (spec 004)

Merged to `main` of [github.com/vladsimion/terra-chartarum-next](https://github.com/vladsimion/terra-chartarum-next), 18 October 2026 (#47 fixed the gate before #45, #46 and #48 merged; `gate` green on `7977b49`). Jira epic TCX-5. Working detail is in the [spec 004 programme dossier](https://vladsimion.atlassian.net/wiki/spaces/~7012186ee7d7085f34fff9bc2bf8fbe8de309/pages/37617788).

| PR | Scope | Jira |
|---|---|---|
| #42 | Foundation: map and cartographer schemas, ten registry rules with a named mutation each, the public allowlist, `generateMapRegistry` for 60 and 500 records; spec 001's data model and rule table amended (T001 to T022) | TCX-28 |
| #43 | US1: fixtures, pure record view, `/collection/<slug>/` pages, the lazily loaded OpenSeadragon 6.1.1 viewer, citation and exports (CSL type map); maps exempt from `RIGHTS-CLEARED` (the page withholds an uncleared image) | TCX-28 |
| #44 | US2: filter index, pure filter and sort, the static `/collection/` list with a GET form, in-place filters, `roomsOf` | TCX-29 |
| #47 | The gate was red on `main` from the merge of #44: the shell's no-JavaScript spec asserted zero scripts on every page. Fixed for the collection pages; the collection browser specs added to CI (they had not been a CI step) | TCX-29 |
| #45 | US4: where a map is used (essays, layers, places), and the leak guarantee: nothing held or private in any built file | TCX-31 |
| #46 | US3: cartographer list and profiles; a held maker has no page and no link | TCX-30 |
| #48 | US5: `registry completeness`, a per-record report and a ranked enrichment queue, never published | TCX-32 |
| #49 | Polish: quickstart and README, code-review fixes (an unresolved workshop attribution is no longer an exact maker in the lists; shared value helpers) (T049 to T053) | TCX-5 |

State on `main`: see the dossier; stories TCX-28 to TCX-32 are In Review, not Done; the epic TCX-5 is In Progress. Not verified locally: Firefox, WebKit, Lighthouse (CI runs them).
