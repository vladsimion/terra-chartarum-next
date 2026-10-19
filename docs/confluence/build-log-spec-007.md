# Confluence entry: Build Log (page 2490370)

Draft, not yet published. To publish: add as section AA, directly after section Z and before "2. In progress", and extend the header pointer "sections U to Z" to "sections U to AA"; leave the rest of the page unchanged and check by reading the page back. (Read the live page first for the next section letter.)

## AA. The successor build: the rooms (spec 007)

Merged to `main` of [github.com/vladsimion/terra-chartarum-next](https://github.com/vladsimion/terra-chartarum-next), 19 October 2026 (polish open). Jira epic TCX-8. Working detail is in the spec 007 programme dossier (page to be published).

| PR | Scope | Jira |
|---|---|---|
| #74 | The spec 007 documents refreshed against specs 004 to 006: Layers ship with US1, `membership.ts` is extended, the repository's own `content/room/` is created in Foundation | TCX-8 |
| #75 | Setup and Foundation: `order`, `short_description` and `copy_status` on a room with the long description as a Markdown file beside it; `ROOM-PUBLIC` and `ROOM-COPY` with seven named mutations; the public projection; the repository's seven draft rooms (T001 to T012) | TCX-42 |
| #78 | US1 and the link check: `membership` beside `roomsOf`; `/rooms/` and `/rooms/<slug>/` with Essays, Maps and Layers, the home links, the retired stub, a former slug redirecting; the internal link and fragment check over five fixture sites, with no dead link found (T002, T013 to T023) | TCX-42 |
| #79 | Cross-cutting checks and the Atlas agreement: seven named leaks, one primary room per essay, one derivation of membership, the room pages against the Atlas index (T024 to T028) | TCX-42, TCX-43 |
| Polish (open) | Quickstart run and corrected, README and Read-first, code-review fixes (a body link can no longer carry a backslash or an emphasis mark; a room with no long-description file shows its short description and counts as draft; the link check stays inside the built folder) (T029 to T032) | TCX-8 |

State: 88 registry rules and 115 named mutations; 2249 Vitest tests in 188 files; Rooms Chromium e2e 9. `gate` passed on #78; the polish branch's run had not finished when this was written. The stories are In Review, not Done; the epic TCX-8 is In Progress. The seven introductions are draft placeholder copy for the author to finalise. Not verified locally: Firefox, WebKit and Lighthouse (CI runs them).
