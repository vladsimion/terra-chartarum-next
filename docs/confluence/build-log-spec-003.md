# Confluence entry: Build Log (page 2490370)

DRAFT, not published. Drafted 2026-10-18 for the next free section letter after V; the letter and page version are filled in when it is published. Like sections U and V, it records only what has merged to the successor's `main`, so it covers PRs #35 to #37 and not the open polish PR #38.

## W. The successor build: essay framework and editorial pipeline (spec 003)

Merged to `main` of [github.com/vladsimion/terra-chartarum-next](https://github.com/vladsimion/terra-chartarum-next), 16 to 18 October 2026. Jira epic TCX-4. Reconciled on 18 October 2026 against `main` at `5954629`. Working detail is in the spec 003 programme dossier (draft in `docs/confluence/spec-003-essays.md`).

| PR | Scope | Jira |
|---|---|---|
| #16, #17 | Grill outcome (ADR 0010 and amendments to ADR 0006 and ADR 0002) and the Spec Kit artefacts | TCX-4 |
| #35 | Foundation: essay schema, stage table, body scanner, public allowlist (T003 to T010) | TCX-4 |
| #36 | US2: fifteen `ESSAY-*` rules with a named mutation each, `registry promote`, `registry new essay` (TCX-24); US3 registry half: the leak scan catches a held essay's title and plural page address (TCX-25); US1: essay pages, Chicago notes, bibliography, rooms, related essays, exports (TCX-23); the Source field `entry` pulled forward from spec 006 | TCX-23, TCX-24, TCX-25 |
| #37 | US4: the `Interaction` wrapper, component documentation with a test, an interaction in the fixture essay (TCX-26); US3 site half: a held essay in the fixtures leaves no page and no trace in the build (TCX-25) | TCX-25, TCX-26 |

State on `main`: 1218 Vitest tests; essay Playwright suites 58 runs (chromium dark and light, no JavaScript). Stories TCX-23 to TCX-26 are In Review; the epic TCX-4 is In Progress. Not verified locally: Firefox, WebKit and Lighthouse (CI runs them).
