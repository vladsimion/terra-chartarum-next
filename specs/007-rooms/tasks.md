---

description: "Task list for 007 Rooms (Curatorial Paths)"
---

# Tasks: Rooms (Curatorial Paths)

**Input**: Design documents from `/specs/007-rooms/`

**Prerequisites**: plan.md, spec.md (clarified 2026-10-17), research.md, data-model.md, contracts/ (room-rule-ids.md, membership.md, room-pages.md), quickstart.md. Decision: ADR 0015.

**Tests**: REQUIRED (Constitution X). Every acceptance scenario has an automated test written first, and each story is built red → green with the `tdd` skill: in every phase the test tasks come first and must be seen failing before the task that makes them pass. Refactoring happens in review, not inside the loop. Every new rule gets a named mutation in the same task that adds it (the rule-coverage test fails otherwise).

**Seams** (to confirm with Vlad at T001): (1) the registry through `validateRegistry` and the CLI `main` (the room schema and the two rules); (2) the pure module `src/rooms/membership.ts` (public records in, plain data out); (3) the built site through build-output tests (`node-html-parser`), the link checker and Playwright. No test reaches inside a component.

**Organization**: Grouped by user story. Slice order: **Foundation → US1 → link check → US2 → cross-cutting → Polish**. The registry half (Foundation, membership) needs no Astro. Spec 005 is merged, so the Layers group on a room page uses its view-address module (`viewUrl`) from the start and US1 ships Essays, Maps and Layers together. `src/rooms/membership.ts` already exists with `roomsOf` (spec 004); this spec extends it.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1–US2, matching `spec.md`
- Paths are relative to the repository root. Registry tests are under `tests/registry/`, room tests under `tests/rooms/`.
- Jira: each story's checklist is copied into its TCX story under epic TCX-8 (TCX-42 US1, TCX-43 US2; Setup, Foundation and the cross-cutting checks sit in TCX-42); Jira and Confluence are updated after each story (workflow step 4); `/speckit-taskstoissues` is not used.

---

## Phase 1: Setup

- [x] T001 Agree the three seams above with Vlad (tdd skill) and record any change here Done 2026-10-19: agreed as written.
- [x] T002 [P] Create `tests/rooms/fixtures/registry/` with the seven room records (published, released, with `order`, `short_description`, `copy_status` and a body file each) and a small hand-authored set: a room with one primary and one secondary essay, two maps and a layer; a room with no public essay; essays in several rooms; a map used by essays in two rooms; a map and a layer used only by a held essay; a held essay. Add invalid variants named for the rule they trip Done: `tests/rooms/fixtures/registry/` is the Atlas fixture with essay 2 moved to primary Road and secondary Map and Border, and a map only the held essay uses; the Map room has a primary and a secondary essay, two maps and four layers, Road and Border have essays, the other four rooms none, and the held essay, held layer, in-build layer and held-only map must appear nowhere. The Earth room carries a former slug.
- [x] T003 Update every existing room fixture in `tests/registry/fixtures/` and `tests/shell/fixtures/registry/` to `published`, `released`, with `order`, `short_description` and `copy_status`, in the same change as T007, so the existing suites stay green (research R3)

---

## Phase 2: Foundation (registry; blocks the stories)

**Goal**: the room schema, the two rules and the public allowlist (FR-011).

- [x] T004 [P] Write failing `tests/registry/unit/room-schema.test.ts`: a room with `order`, `short_description` and `copy_status` loads. Departure, as for every family: the schema takes types only (`order` a number, the others text) and `ROOM-COPY` judges the values, so an early record loads and a bad value is a named rule; an absent `copy_status` reads as draft. Original wording: the loader reads `content/room/<id>.md` as the computed `body`; `FAM-UNKNOWN` still rejects an unlisted field
- [x] T005 Implement `RoomSchema` in `src/registry/schemas/families.ts` and, if no sibling spec has yet, the generic Markdown body loading for the `room` family in `src/registry/load.ts`
- [x] T006 [P] Write failing `tests/registry/unit/room-public.test.ts` for `ROOM-PUBLIC` (a room that is held, or not published, at any lifecycle, is an error) with a named mutation
- [x] T007 Implement `ROOM-PUBLIC` in `src/registry/rules/rooms.ts` and register it (with T003)
- [x] T008 [P] Write failing `tests/registry/unit/room-copy.test.ts` for `ROOM-COPY` (a wrong `order` for the room; duplicate orders; a bad `copy_status`; an empty `short_description` (warn from `ready_for_build`, error at `publishable`); a missing body file (same); `final` with an empty body) with a named mutation for each check
- [x] T009 Implement `ROOM-COPY`
- [x] T010 [P] Write failing `tests/registry/unit/room-project.test.ts`: the public projection of a room carries `order`, `short_description`, `copy_status` and the body, and nothing else
- [x] T011 Extend `src/registry/project.ts` with the room allowlist
- [x] T012 Register the two rules in `src/registry/rules/index.ts`, make the rule-coverage test pass, and add them to `specs/001-scholarly-registry/contracts/rule-ids.md`; update spec 001's `data-model.md` room row to point at spec 007's; create the repository's `content/room/` with the seven `*.yaml` records (published, released, `order`, `short_description`, `copy_status: draft`) and their `*.md` bodies (draft copy, research R6); the repository root has no `content/` today, so without these the site has no room pages and every link to one is dead. Confirm that the repository's own `registry check` passes with only the rooms present

---

## Phase 3: User Story 1 — Walk through a room (P1)

**Goal**: open a room and find its idea, essays, maps and layers, derived from metadata, with nothing held.

**Independent Test**: one room fixture with one primary and one secondary essay, two maps and one layer lists all of them in the correct groups; held content is absent.

- [x] T013 [P] [US1] Write failing `tests/rooms/unit/membership.test.ts`: the seven rooms in canonical order; primary and secondary essays in title order; a map or layer used by an essay in either role appears once; used in several rooms it appears in each; used by no public essay it appears in none; used only by a held essay it appears nowhere; `roomsOf` (already tested in `tests/rooms/unit/roomsof.test.ts`; keep those tests) returns canonical-ordered rooms for a map, layer or essay; an essay in both lists of one room appears once under primary; determinism
- [x] T014 [US1] Extend `src/rooms/membership.ts` (pure) with `membership(room, records)` beside the existing `roomsOf`, so both share one rule for "in a room" Done: `membership(records)` beside `roomsOf`, tested in `tests/rooms/unit/membership.test.ts`.
- [x] T015 [P] [US1] Write failing `tests/rooms/build/rooms-index.test.ts` and `room-page.test.ts`: the index lists all seven in canonical order with short descriptions, each linking to `/rooms/<slug>/`; the room page shows the heading, the introduction, then Essays (Primary then Secondary), Maps, each hidden when empty and in title order; the empty room shows "Essays for this room are in preparation." and no link; a draft room has `data-draft`; breadcrumbs read Rooms › Earth; a former slug redirects
- [x] T016 [US1] Implement `src/pages/rooms/index.astro`, `[slug].astro`, `RoomCard.astro` and `RoomGroups.astro` on spec 002's Base layout; set the `rooms` destination to `built` (it is `stub` in `src/shell/destinations.ts` today), and update the stub tests and page-type lists that treat `/rooms/` as a stub (`tests/shell/e2e/stubs.spec.ts`, `tests/shell/support/page-types.ts`), test first; the Layers group is part of this task, each layer linking to `viewUrl` Done: `src/rooms/views.ts` (plain data for the pages), `src/rooms/body.ts` (a small escaping Markdown renderer for the introduction: paragraphs, emphasis, links; no dependency, research R7) and `RoomGroups.astro`; `PAGE_ROUTES` gains `room: 'rooms'` so a former slug redirects. There is no `RoomCard.astro`: the index list is short enough to stay in the page. Breadcrumbs read Rooms › Earth, as the shell starts a trail at the lens (the contract said Home › Rooms; corrected).
- [x] T017 [P] [US1] Update `tests/shell/build/home.test.ts` and write `tests/rooms/build/room-links.test.ts`: the home page's rooms list links to `/rooms/<slug>/` (not `/rooms/#<id>`); the room pages are linked from the Rooms destination
- [x] T018 [US1] Change the home page rooms list in `src/pages/index.astro` to the room pages, built from the room records' `slug` and `title` (not from `ROOM_IDS` with hard-coded labels and `#<id>` fragments)
- [x] T019 [P] [US1] Write failing `tests/rooms/e2e/rooms.spec.ts` (CI-verified): keyboard reach of the index and a room page; no-JavaScript rendering (`@nojs`); touch targets at 360 px (`@phone`); no sideways scroll Done: `playwright.rooms.config.ts` (port 4327, Chromium dark and light, phone, no JavaScript), `npm run test:e2e:rooms` and a CI step; 9 tests pass locally with `PW_CHROMIUM_PATH` (the shell config now honours it too). Firefox and WebKit are CI-only.
- [x] T020 [US1] Add the Rooms index and room page types to `tests/shell/ci-templates.json` and `lighthouserc.json`; axe on both in both colour schemes
- [x] T021 [US1] Cover the Layers group in `room-page.test.ts` (written with T015): a layer used by a public essay of the room links to an Atlas view with that layer active, built by `viewUrl`; a layer used only by a held essay is absent (US1 scenarios 4 and 5)

**Checkpoint**: a reader can walk through every room; TCX-42 checklist updated.

---

## Phase 4: The site-wide link check (SC-002)

- [x] T022 [P] Write failing `tests/shell/build/links.test.ts` and the helper's own tests: `checkLinks` returns nothing for the real build; for a deliberately broken fixture page it reports a missing page, a missing fragment and a malformed address; external, `mailto:`, `tel:` and `data:` links are ignored; a path covered by `_redirects` counts as resolved (research R2) Done: `tests/shell/support/links.ts` and `tests/shell/build/links.test.ts` over all five fixture sites (shell, collection, Atlas, bibliography, rooms): no dead link or fragment in any. The check is proved able to fail by `tests/shell/unit/links.test.ts` on small folders written in the test, not by a broken page in the shell fixtures; no existing page needed a fix.
- [x] T023 Implement `tests/shell/support/links.ts`, fix any dead link the check finds in the existing pages (list each fix in the PR; if the list is long, land the checker and the fixes as their own PR), and add the broken fixture page behind `SHELL_FIXTURES`

---

## Phase 5: User Story 2 — Rooms as an Atlas lens (P2; delivered by spec 005)

- [x] T024 [P] [US2] Write failing `tests/rooms/unit/atlas-agreement.test.ts`: for the fixture registry, the layers on each room page equal the layers spec 005's `atlas-index.json` lists under that room; spec 005's index builder (`src/atlas/index-data.ts`) is merged Done: it compares the built room pages with the built `data/atlas-index.json` of the rooms fixture site, for each of the seven rooms (rooms with layers and rooms without).
- [x] T025 [US2] Confirm that spec 005's and spec 004's `index-data.ts` already call `roomsOf` from `src/rooms/membership.ts` (they do; note it in their tasks files), and make T024 pass; TCX-43 is Done when spec 005's lens tests and this cross-test pass Done: specs 004 and 005 already note the call in their tasks files, and `tests/rooms/unit/one-derivation.test.ts` asserts that the Collection and Atlas indexes and the Rooms views import the shared module.

---

## Phase 6: Cross-cutting checks

- [x] T026 [P] Write failing `tests/rooms/build/leak.test.ts` (SC-003): no id, slug or title of the held essay, or of the map and layer used only by it, appears on any room page, in any room URL or in the link check's inputs; add the named mutation to `tests/registry/mutations.test.ts`; make it pass Done: seven named leaks seen in real built files (the held essay's title, a link to it, a held layer's title and address, the held essay's id in the relations file, a redirect naming it) and reported without repeating the value; the mutations live in the test, as for specs 003 to 006. A map that is itself public but used only by the held essay is not held, so the registry scan cannot call it a leak: that it is on no room page is asserted in `room-page.test.ts`.
- [x] T027 [P] Write failing `tests/rooms/build/rooms-primary.test.ts` (SC-001): every released fixture essay appears in exactly one primary room across the seven pages
- [x] T028 [P] Write failing `tests/rooms/unit/one-derivation.test.ts` (FR-007): no module under `src/` other than `src/rooms/membership.ts` reads an essay's `rooms` field to derive membership; make it pass Done: the allowed readers are the registry and the three essay modules that show an essay's own declared rooms, primary first (`page-model.ts`, `related.ts`, `RoomLinks.astro`); a style block's `.primary` class and comments are not reads.

---

## Phase 7: Polish & cross-cutting concerns

- [x] T029 [P] Run the quickstart end to end and fix anything it exposes Done: every command run on the fixtures and on the repository's own rooms (38 and 7 entities, no errors or warnings; 0 leaks; `shell:check` lists the index and seven rooms as draft). The old quickstart named a broken fixture page and a generic `test:e2e`; both corrected.
- [x] T030 [P] Update `README.md` and `docs/` for the rooms and the link check; add ADR 0015 to the Read-first list in `CLAUDE.md` Done: README (a Rooms section, repo map rows) and quickstart; ADR 0015 is spelled out in `CLAUDE.md`'s Read-first list.
- [x] T031 Confirm the accessibility and performance gates on the new page types in CI (Lighthouse CI budgets and axe) Done: `gate` passed on #78 (run 39289832478, 15 min 52 s) with the Rooms page types in the template list and the Lighthouse URLs; #79 changed no product code. `gate` also passed on the polish branch (#80, run 39307923721, 15 min 55 s) before it was merged.
- [x] T032 Run the `code-review` skill against the commit before this work began (standards and spec axes) and address findings Done: reviewed `869e132...HEAD`. Fixed: a body link can no longer carry a backslash or an emphasis mark (`/\evil.example` was a protocol-relative address in a browser); a room whose long description is missing shows its short description and counts as draft, as the spec's edge case says (it showed an empty introduction); the link check refuses a path outside the built folder and says what it covers. Left as follow-ups (judgement calls, no defect): one `roomRecordId(name)` helper for the `tc:tc:room:` template; the `present` and `essays` lookups built in both `roomsOf` and `membership` (and rebuilt per call in `roomsOf`); `RoomGroups.astro` writing its list twice; `rooms(e)` renamed `selectionOf`; a room with no `order` sorting first before `publishable`; splitting `ROOM-COPY` into three rules.
- [x] T033 Update Jira (TCX-8 description, story checklists, statuses), the Confluence dossier for spec 007, the Build Log and the Decision Log (workflow step 4); record that the seven room introductions are draft copy for the author to finalise Done: Jira TCX-8, TCX-42 and TCX-43 brought up to date after #80 merged; published 2026-10-19 from the reconciled drafts (against `main` at `eec1428`, `gate` green there): Decision Log TC-D038 (`decision-log-tc-d038.md`, page version 16), the dossier as page 38928393 (`spec-007-rooms.md`), Build Log section AA (`build-log-spec-007.md`, page version 133). The seven room introductions remain draft copy for the author to finalise.

---

## Dependencies & Execution Order

- Setup → Foundation → US1 → link check → US2 → cross-cutting → Polish. The link check (T022 to T023) needs only the shell and can be built any time after US1's pages exist; it should land early because it protects every spec.
- The site half needs spec 002's shell and registry integration (merged). Essay `RoomLinks` (spec 003) and the Collection room filter (spec 004) use the room addresses and `roomsOf`.
- T021 needs spec 005's `viewUrl`; T024 needs spec 005's `atlas-index.json`.
- Spec 008's importer does not touch rooms; the seven records are authored in the successor repository.

## Implementation Strategy

MVP is Foundation plus US1: seven honest, public room pages with essays, maps and layers (spec 005 is merged), the repository's own `content/room/` records, and a link check that protects the whole site. The Atlas cross-test closes the story. Ship one story per PR, red tests pushed first for the browser specs, verified in CI.
