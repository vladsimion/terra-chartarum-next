# Confluence entry: Build Log (page 2490370)

DRAFT, not published. Drafted 2026-10-18 and refreshed the same day after PR #38 merged. W is the next free letter (the live Build Log is at version 126 and ends with section V); when it is published it goes directly after V and before "2. In progress", the header pointer "sections U and V" becomes "sections U, V and W", and the page version is filled in here. Like sections U and V, it records only what has merged to the successor's `main`.

## W. The successor build: essay framework and editorial pipeline (spec 003)

Merged to `main` of [github.com/vladsimion/terra-chartarum-next](https://github.com/vladsimion/terra-chartarum-next), 16 to 18 October 2026. Jira epic TCX-4. Reconciled on 18 October 2026 against `main` at `a14c40c`. Working detail is in the spec 003 programme dossier (draft in `docs/confluence/spec-003-essays.md`).

| PR | Scope | Jira |
|---|---|---|
| #16, #17 | Grill outcome (ADR 0010 and amendments to ADR 0006 and ADR 0002) and the Spec Kit artefacts | TCX-4 |
| #35 | Foundation: essay schema, stage table, body scanner, public allowlist (T003 to T010) | TCX-4 |
| #36 | US2: fifteen `ESSAY-*` rules with a named mutation each, `registry promote`, `registry new essay` (TCX-24); US3 registry half: the leak scan catches a held essay's title and plural page address (TCX-25); US1: essay pages, Chicago notes, bibliography, rooms, related essays, exports (TCX-23); the Source field `entry` pulled forward from spec 006 | TCX-23, TCX-24, TCX-25 |
| #37 | US4: the `Interaction` wrapper, component documentation with a test, an interaction in the fixture essay (TCX-26); US3 site half: a held essay in the fixtures leaves no page and no trace in the build (TCX-25) | TCX-25, TCX-26 |
| #38 | Polish (T040 to T045): the Trench A cell helper (a `corpus: none` cell reads "not yet corpus-backed"; a CND retrofit changes only its `attestation` ID); the editorial-pipeline README section; the spec 008 note that archive redirects come from `legacy_url`; the quickstart walked and corrected; the Terra Sigillata epic TCX-51, related to TCX-4. Code-review fixes: `ESSAY-BODY-PUBLIC` now follows a citation to its source and bibliography entry and checks interaction evidence; `ESSAY-RESEARCH` rejects an empty locator | TCX-4 |

State on `main`: 1245 Vitest tests in 90 files, all passing (run on `a14c40c`); the essay Playwright suites pass 58 runs (chromium dark and light, no JavaScript) as reported on PR #38. CI on `a14c40c` is green: the `gate` check passed, including the Firefox, WebKit and 360 px end-to-end specs and the Lighthouse budgets, and the Workers deploy succeeded. Stories TCX-23 to TCX-26 are In Review; the epic TCX-4 is In Progress.
