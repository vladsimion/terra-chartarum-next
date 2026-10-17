---

description: "Task list for 007 Rooms (Curatorial Paths)"
---

# Tasks: Rooms (Curatorial Paths)

**Input**: Design documents from `/specs/007-rooms/`

**Prerequisites**: plan.md, spec.md (clarified 2026-10-17), research.md, data-model.md, contracts/ (room-rule-ids.md, membership.md, room-pages.md), quickstart.md. Decision: ADR 0015.

**Tests**: REQUIRED (Constitution X). Every acceptance scenario has an automated test written first, and each story is built red → green with the `tdd` skill: in every phase the test tasks come first and must be seen failing before the task that makes them pass. Refactoring happens in review, not inside the loop. Every new rule gets a named mutation in the same task that adds it (the rule-coverage test fails otherwise).

**Seams** (to confirm with Vlad at T001): (1) the registry through `validateRegistry` and the CLI `main` (the room schema and the two rules); (2) the pure module `src/rooms/membership.ts` (public records in, plain data out); (3) the built site through build-output tests (`node-html-parser`), the link checker and Playwright. No test reaches inside a component.

**Organization**: Grouped by user story. Slice order: **Foundation → US1 → link check → US2 → cross-cutting → Polish**. The registry half (Foundation, membership) needs no Astro. The Layers group on a room page depends on spec 005's view-address module (`viewUrl`); everything else does not, so US1 ships Essays and Maps first and adds Layers with T021.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1–US2, matching `spec.md`
- Paths are relative to the repository root. Registry tests are under `tests/registry/`, room tests under `tests/rooms/`.
- Jira: each story's checklist is copied into its TCX story under epic TCX-8 (TCX-42 US1, TCX-43 US2; Setup, Foundation and the cross-cutting checks sit in TCX-42); Jira and Confluence are updated after each story (workflow step 4); `/speckit-taskstoissues` is not used.

---

## Phase 1: Setup

- [ ] T001 Agree the three seams above with Vlad (tdd skill) and record any change here
- [ ] T002 [P] Create `tests/rooms/fixtures/registry/` with the seven room records (published, released, with `order`, `short_description`, `copy_status` and a body file each) and a small hand-authored set: a room with one primary and one secondary essay, two maps and a layer; a room with no public essay; essays in several rooms; a map used by essays in two rooms; a map and a layer used only by a held essay; a held essay. Add invalid variants named for the rule they trip
- [ ] T003 Update every existing room fixture in `tests/registry/fixtures/` and `tests/shell/fixtures/registry/` to `published`, `released`, with `order`, `short_description` and `copy_status`, in the same change as T007, so the existing suites stay green (research R3)

---

## Phase 2: Foundation (registry; blocks the stories)

**Goal**: the room schema, the two rules and the public allowlist (FR-011).

- [ ] T004 [P] Write failing `tests/registry/unit/room-schema.test.ts`: a room with `order`, `short_description` and `copy_status` loads; `copy_status` takes only `draft` or `final` and defaults to `draft`; `order` is an integer 1 to 7; the loader reads `content/room/<id>.md` as the computed `body`; `FAM-UNKNOWN` still rejects an unlisted field
- [ ] T005 Implement `RoomSchema` in `src/registry/schemas/families.ts` and, if no sibling spec has yet, the generic Markdown body loading for the `room` family in `src/registry/load.ts`
- [ ] T006 [P] Write failing `tests/registry/unit/room-public.test.ts` for `ROOM-PUBLIC` (a room that is held, or not published, at any lifecycle, is an error) with a named mutation
- [ ] T007 Implement `ROOM-PUBLIC` in `src/registry/rules/rooms.ts` and register it (with T003)
- [ ] T008 [P] Write failing `tests/registry/unit/room-copy.test.ts` for `ROOM-COPY` (a wrong `order` for the room; duplicate orders; a bad `copy_status`; an empty `short_description` (warn from `ready_for_build`, error at `publishable`); a missing body file (same); `final` with an empty body) with a named mutation for each check
- [ ] T009 Implement `ROOM-COPY`
- [ ] T010 [P] Write failing `tests/registry/unit/room-project.test.ts`: the public projection of a room carries `order`, `short_description`, `copy_status` and the body, and nothing else
- [ ] T011 Extend `src/registry/project.ts` with the room allowlist
- [ ] T012 Register the two rules in `src/registry/rules/index.ts`, make the rule-coverage test pass, and add them to `specs/001-scholarly-registry/contracts/rule-ids.md`; update spec 001's `data-model.md` room row to point at spec 007's; write the seven `content/room/*.yaml` and `*.md` placeholder records for the repository root (draft copy, research R6) when the repository gains a `content/` directory

---

## Phase 3: User Story 1 — Walk through a room (P1)

**Goal**: open a room and find its idea, essays, maps and layers, derived from metadata, with nothing held.

**Independent Test**: one room fixture with one primary and one secondary essay, two maps and one layer lists all of them in the correct groups; held content is absent.

- [ ] T013 [P] [US1] Write failing `tests/rooms/unit/membership.test.ts`: the seven rooms in canonical order; primary and secondary essays in title order; a map or layer used by an essay in either role appears once; used in several rooms it appears in each; used by no public essay it appears in none; used only by a held essay it appears nowhere; `roomsOf` returns canonical-ordered rooms for a map, layer or essay; an essay in both lists of one room appears once under primary; determinism
- [ ] T014 [US1] Implement `src/rooms/membership.ts` (pure)
- [ ] T015 [P] [US1] Write failing `tests/rooms/build/rooms-index.test.ts` and `room-page.test.ts`: the index lists all seven in canonical order with short descriptions, each linking to `/rooms/<slug>/`; the room page shows the heading, the introduction, then Essays (Primary then Secondary), Maps, each hidden when empty and in title order; the empty room shows "Essays for this room are in preparation." and no link; a draft room has `data-draft`; breadcrumbs read Home › Rooms › Earth; a former slug redirects
- [ ] T016 [US1] Implement `src/pages/rooms/index.astro`, `[slug].astro`, `RoomCard.astro` and `RoomGroups.astro` on spec 002's Base layout; set the `rooms` destination to `built`
- [ ] T017 [P] [US1] Update `tests/shell/build/home.test.ts` and write `tests/rooms/build/room-links.test.ts`: the home page's rooms list links to `/rooms/<slug>/` (not `/rooms/#<id>`); the room pages are linked from the Rooms destination
- [ ] T018 [US1] Change the home page rooms list in `src/pages/index.astro` to the room pages
- [ ] T019 [P] [US1] Write failing `tests/rooms/e2e/rooms.spec.ts` (CI-verified): keyboard reach of the index and a room page; no-JavaScript rendering (`@nojs`); touch targets at 360 px (`@phone`); no sideways scroll
- [ ] T020 [US1] Add the Rooms index and room page types to `tests/shell/ci-templates.json` and `lighthouserc.json`; axe on both in both colour schemes
- [ ] T021 [US1] Add the Layers group to `RoomGroups.astro`, each layer linking to `viewUrl` from spec 005, and extend `room-page.test.ts`; blocked until spec 005's view-address module exists, so it can follow the other tasks

**Checkpoint**: a reader can walk through every room; TCX-42 checklist updated.

---

## Phase 4: The site-wide link check (SC-002)

- [ ] T022 [P] Write failing `tests/shell/build/links.test.ts` and the helper's own tests: `checkLinks` returns nothing for the real build; for a deliberately broken fixture page it reports a missing page, a missing fragment and a malformed address; external, `mailto:`, `tel:` and `data:` links are ignored; a path covered by `_redirects` counts as resolved (research R2)
- [ ] T023 Implement `tests/shell/support/links.ts`, fix any dead link the check finds in the existing pages, and add the broken fixture page behind `SHELL_FIXTURES`

---

## Phase 5: User Story 2 — Rooms as an Atlas lens (P2; delivered by spec 005)

- [ ] T024 [P] [US2] Write failing `tests/rooms/unit/atlas-agreement.test.ts`: for the fixture registry, the layers on each room page equal the layers spec 005's `atlas-index.json` lists under that room; blocked until spec 005's index (T034 to T035) exists
- [ ] T025 [US2] Record in `specs/005-atlas/tasks.md` and here that spec 005's `index-data.ts` and spec 004's `index-data.ts` call `roomsOf` from `src/rooms/membership.ts`, and make T024 pass; TCX-43 is Done when spec 005's lens tests and this cross-test pass

---

## Phase 6: Cross-cutting checks

- [ ] T026 [P] Write failing `tests/rooms/build/leak.test.ts` (SC-003): no id, slug or title of the held essay, or of the map and layer used only by it, appears on any room page, in any room URL or in the link check's inputs; add the named mutation to `tests/registry/mutations.test.ts`; make it pass
- [ ] T027 [P] Write failing `tests/rooms/build/rooms-primary.test.ts` (SC-001): every released fixture essay appears in exactly one primary room across the seven pages
- [ ] T028 [P] Write failing `tests/rooms/unit/one-derivation.test.ts` (FR-007): no module under `src/` other than `src/rooms/membership.ts` reads an essay's `rooms` field to derive membership; make it pass

---

## Phase 7: Polish & cross-cutting concerns

- [ ] T029 [P] Run the quickstart end to end and fix anything it exposes
- [ ] T030 [P] Update `README.md` and `docs/` for the rooms and the link check; add ADR 0015 to the Read-first list in `CLAUDE.md`
- [ ] T031 Confirm the accessibility and performance gates on the new page types in CI (Lighthouse CI budgets and axe)
- [ ] T032 Run the `code-review` skill against the commit before this work began (standards and spec axes) and address findings
- [ ] T033 Update Jira (TCX-8 description, story checklists, statuses), the Confluence dossier for spec 007, the Build Log and the Decision Log (workflow step 4); record that the seven room introductions are draft copy for the author to finalise

---

## Dependencies & Execution Order

- Setup → Foundation → US1 → link check → US2 → cross-cutting → Polish. The link check (T022 to T023) needs only the shell and can be built any time after US1's pages exist; it should land early because it protects every spec.
- The site half needs spec 002's shell and registry integration (merged). Essay `RoomLinks` (spec 003) and the Collection room filter (spec 004) use the room addresses and `roomsOf`.
- T021 needs spec 005's `viewUrl`; T024 needs spec 005's `atlas-index.json`.
- Spec 008's importer does not touch rooms; the seven records are authored in the successor repository.

## Implementation Strategy

MVP is Foundation plus US1 without the Layers group: seven honest, public room pages with essays and maps, and a link check that protects the whole site. The Layers group and the Atlas cross-test close the story once spec 005's modules exist. Ship one story per PR, red tests pushed first for the browser specs, verified in CI.
