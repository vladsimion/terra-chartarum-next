# Confluence entry: Build Log (page 2490370)

DRAFT, not published. Drafted 2026-10-18 for the next free section letter after W; the letter and page version are filled in when it is published. Like the earlier sections, it records only what has merged to the successor's `main`: the entries for #45, #46, #48 and the polish pull request are added when they merge.

## X. The successor build: map collection and cartographers catalogue (spec 004)

Merged to `main` of [github.com/vladsimion/terra-chartarum-next](https://github.com/vladsimion/terra-chartarum-next), 18 October 2026. Jira epic TCX-5. Working detail is in the spec 004 programme dossier (draft in `docs/confluence/spec-004-collection.md`).

| PR | Scope | Jira |
|---|---|---|
| #42 | Foundation: map and cartographer schemas, ten registry rules with a named mutation each, the public allowlist, `generateMapRegistry` for 60 and 500 records; spec 001's data model and rule table amended (T001 to T022) | TCX-28 |
| #43 | US1: fixtures, pure record view, `/collection/<slug>/` pages, the lazily loaded OpenSeadragon 6.1.1 viewer, citation and exports (CSL type map); maps exempt from `RIGHTS-CLEARED` (the page withholds an uncleared image) | TCX-28 |
| #44 | US2: filter index, pure filter and sort, the static `/collection/` list with a GET form, in-place filters, `roomsOf` | TCX-29 |
| #47 | The gate was red on `main` from the merge of #44: the shell's no-JavaScript spec asserted zero scripts on every page. Fixed for the collection pages; the collection browser specs added to CI (they had not been a CI step) | TCX-29 |

State on `main`: see the dossier; stories TCX-28 and TCX-29 are In Review, not Done; the epic TCX-5 is In Progress. Not verified locally: Firefox, WebKit, Lighthouse (CI runs them).
