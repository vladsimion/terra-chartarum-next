Programme dossier for spec 007, written against the fourteen-point contract in [Programme Dossier Contract & Reconciliation Register](https://vladsimion.atlassian.net/wiki/spaces/~7012186ee7d7085f34fff9bc2bf8fbe8de309/pages/18481169), as the dossiers for specs 001 to 006 are.

## 1. Programme metadata

| | |
|---|---|
| Programme type | Instrument: the seven rooms as reader-facing paths through the material, and the site-wide link check |
| Status | **Code complete and polished.** The refreshed documents (#74), Setup and Foundation (#75), User Story 1 with the link check (#78), the cross-cutting checks with the Atlas agreement (#79) and Polish (#80: README, quickstart, code-review fixes) are merged to `main`, all on 19 October 2026. The stories stay In Review until Vlad moves them to Done. |
| Jira | **TCX-8** epic (In Progress); stories **TCX-42** (US1 walk through a room; also holds Setup, Foundation, the link check and the cross-cutting checks) and **TCX-43** (US2 Rooms as an Atlas lens, delivered by spec 005, with the cross-test here) |
| Canonical parent | A standalone page at the root of the space, as for specs 001 to 006 |
| Repository | https://github.com/vladsimion/terra-chartarum-next (public). Spec `specs/007-rooms/`; code `src/rooms/` (membership, views, the introduction renderer, `RoomGroups.astro`), `src/pages/rooms/`, `src/registry/rules/rooms.ts`, `content/room/`; the link check `tests/shell/support/links.ts`; decision `docs/adr/0015` |
| Successor relationship | Replaces the live site's room pages at cutover; spec 008 does not import room prose (the seven are written in the successor repository) |
| Last reconciliation | 2026-10-19 against `main` at `eec1428` (#80 merged; the same tree as the reviewed branch): 88 registry rules and 115 named mutations; 2249 Vitest tests in 188 files, all passing; Rooms Chromium Playwright 9 passing locally. CI `gate` green on the polish branch (run 39307923721) and on `main` at `eec1428` (run 39314300228), Lighthouse budgets, accessibility and the leak scan included |

## 2. Purpose / thesis

What kinds of human relationship to space (earth, map, city, border, road, archive, theatre) do maps record? The falsifiable claim: **a reader can open any of the seven rooms and find its idea, the essays that take it up (primary first, then secondary), the maps and the Atlas layers those essays use, derived from metadata alone; and nothing held, and no internal link or fragment on any built page, is wrong.**

## 3. Scope and non-goals

### In scope
- The room record: `order`, `short_description`, `copy_status`, and the long description as Markdown beside it; `ROOM-PUBLIC` and `ROOM-COPY`; the repository's own `content/room/` with seven draft rooms.
- `src/rooms/membership.ts`: one derivation of a room's essays, maps and layers (and `roomsOf`, its inverse), used by the pages, the Collection index and the Atlas.
- `/rooms/` and `/rooms/<slug>/`, the home page's room links, and a former room slug redirecting.
- The site-wide internal link and fragment check.

### Non-goals
- The Atlas Room lens itself (spec 005); room prose (draft placeholder copy for the author to write); per-room accent or imagery in v1; an "open this room in the Atlas" link.

## 4. Outputs / deliverables

`src/registry/rules/rooms.ts` (`ROOM-PUBLIC`, `ROOM-COPY`, a named mutation each, beside `ROOM-SET`), `schemas/families.ts` (`RoomSchema`), `load.ts` (a room's `.md` as its `body`), `project.ts` (the room allowlist); `src/rooms/{membership,views,body}.ts` and `components/RoomGroups.astro`; `src/pages/rooms/{index,[slug]}.astro`; `content/room/*.yaml` and `*.md`; `tests/shell/support/links.ts`; `playwright.rooms.config.ts` and `npm run test:e2e:rooms`.

## 5. Research, sources and rights framework

Rooms carry no rights: they are the site's own words. The seven introductions are placeholder prose marked `copy_status: draft`; `shell:check --cutover` fails until the author finalises each. A room's introduction is rendered by a small escaping renderer (paragraphs, emphasis, links to a site path or an https address) so a body can never inject markup.

## 6. Evidence and data architecture

ADR 0015. A room is a record; membership is never stored. A room's essays are the public essays naming it as primary or secondary room; its maps and layers are those the same essays list. A map or layer no public essay uses is in no room. All seven rooms are public by rule. The schema takes types only and `ROOM-COPY` judges values, as for every family.

## 7. Essay and editorial architecture

An essay declares one primary room and up to two secondary rooms (spec 003). An essay page links its rooms to `/rooms/<slug>/`; a room page links back to its essays.

## 8. Interaction and technical implementation

### 8.1 Seams (where tests live)
1. The registry through `validateRegistry` and the CLI (room schema, two rules, projection).
2. The pure module `src/rooms/membership.ts`.
3. The built site through build-output tests (a fifth Vitest global setup on the rooms fixture registry), the link checker and Playwright with axe (own config, port 4327).

### 8.2 Rules that tests enforce
- The pages ship no script; they work with JavaScript off; touch targets are 44 px at 360 px; axe finds nothing in either colour scheme.
- No held essay, and no layer or map only a held record uses, is on any room page, redirect or relation (seven named leaks, `tests/rooms/build/leak.test.ts`).
- The layers on each room page equal the layers in the Atlas index for that room.
- No module outside the registry and the essay modules that show an essay's own rooms reads the room selection.
- No internal link or fragment is dead on any of the five fixture sites.

### 8.3 CI and repository
The Rooms index and a room page are in the CI template list and the Lighthouse URLs. `npm run test:e2e:rooms` is a CI step.

## 9. Implementation phases and dependency model

Foundation, US1, link check, US2 cross-test, cross-cutting checks, Polish. Spec 005 (view addresses, the Atlas index) and spec 004 (`roomsOf`, Collection pages) were merged first, so the Layers group shipped with US1.

## 10. Jira hierarchy and reconciliation history

TCX-8 holds TCX-42 and TCX-43. The 2026-10-17 documents were refreshed on 2026-10-19 against specs 004 to 006 (`/speckit-analyze`): the repository had no `content/` directory, so Foundation creates `content/room/`; `membership.ts` was extended, not created. Departures recorded in `tasks.md`: the schema takes types only; breadcrumbs read Rooms › Earth because the shell starts a trail at the lens; the leak mutations live in the test; the link check is proved able to fail on small folders, not a broken page in the fixtures.

## 11. Programme acceptance criteria

- Every acceptance scenario of US1 and US2 has a passing automated test written first (the code-review fixes were written with their tests in the same step).
- `gate` is green: accessibility 100 and the ADR 0004 budgets on the Rooms page types, passed on #78, on the polish branch and on `main` at `eec1428`.
- No `[NEEDS CLARIFICATION]` remains in the spec.

## 12. Verification ledger

| Claim | Evidence |
|---|---|
| Room schema, `ROOM-PUBLIC`, `ROOM-COPY` with a mutation each | `tests/registry/unit/room-schema.test.ts`, `room-public.test.ts`, `room-copy.test.ts`, `mutations.ts`, `rule-coverage.test.ts` |
| Public projection of a room; the loader reads the `.md` | `room-project.test.ts`, `tests/registry/integration/room-body-load.test.ts` |
| Membership and `roomsOf` | `tests/rooms/unit/membership.test.ts`, `roomsof.test.ts` |
| Index and room pages, groups, empty states, breadcrumbs, former slug | `tests/rooms/build/rooms-index.test.ts`, `room-page.test.ts`, `unit/views.test.ts` |
| Home and essay links | `tests/rooms/build/room-links.test.ts`, `tests/shell/build/home.test.ts` |
| Keyboard, no JavaScript, touch targets, axe | `tests/rooms/e2e/rooms.spec.ts` |
| No dead link or fragment | `tests/shell/build/links.test.ts`, `tests/shell/unit/links.test.ts` |
| Room pages agree with the Atlas | `tests/rooms/unit/atlas-agreement.test.ts` |
| Nothing held leaks | `tests/rooms/build/leak.test.ts` |
| One primary room per essay; one derivation | `tests/rooms/build/rooms-primary.test.ts`, `unit/one-derivation.test.ts` |
| Not verified | Firefox, WebKit and Lighthouse (CI runs them); Rooms Playwright was run locally on an older headless Chromium |

## 13. Canonical ownership and propagation

Owned here: the room fields, the two rules, `membership.ts`, the Rooms pages and the link check. Spec 001 owns the registry and its rule table (two rows added); spec 002 owns the shell and the destinations list (`rooms` is now built); spec 004 and spec 005 call `roomsOf`; spec 003 owns the essay page's room links. The Build Log carries the shipped work; the Decision Log carries the rooms decision (ADR 0015) as [TC-D038](https://vladsimion.atlassian.net/wiki/spaces/~7012186ee7d7085f34fff9bc2bf8fbe8de309/pages/12648509).

## 14. Current checkpoint and delivery authority

**Counts on `main`** (generated by `npm run status -- --write` from the repository; never edit by hand):

<!-- status:begin -->
- Registry rules: 93
- Named mutations: 121
- Entities: 294 (0 errors, 131 warnings)
<!-- status:end -->

Everything is merged, Polish (#80) last: quickstart run and corrected, README and Read-first, and the code review with its fixes. Left for the author: the seven introductions (placeholder copy) and each room's `copy_status`. Open follow-ups from the code review (judgement calls, listed in `tasks.md` T032): a shared `roomRecordId` helper, the duplicated lookups in `roomsOf` and `membership`, a smaller `RoomGroups.astro`, splitting `ROOM-COPY`. Delivery authority: Vlad merges; no story is marked Done until this page is published.
