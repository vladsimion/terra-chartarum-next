# Implementation Plan: Rooms (Curatorial Paths)

**Branch**: `007-rooms` | **Date**: 2026-10-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-rooms/spec.md`, clarified on 2026-10-17 after the grill (ADR 0015).

## Summary

Seven public rooms, each a page that gathers what the rest of the site already knows. Three parts. **Registry side**: the room record grows `order`, `short_description` and `copy_status` with a Markdown long description beside it (an amendment to spec 001's data model), and two rules, `ROOM-PUBLIC` and `ROOM-COPY`, keep the seven rooms public and their copy honest. **One pure module**, `src/rooms/membership.ts`, derives a room's essays, maps and layers; the Rooms pages, the Collection room filter (spec 004) and the Atlas Room lens (spec 005) all call it. **Site side** (Astro on spec 002's shell): the Rooms index and a page per room, the home and essay links moved to those pages, and a site-wide internal link and fragment check over the built output that answers SC-002 for every page. Spec 007 is accepted on fixtures.

## Technical Context

**Language/Version**: TypeScript strict, Node 24; Astro 7 for the site side.

**Primary Dependencies**: existing `yaml`, `zod`, `node-html-parser` (already used by the shell's build tests). No new runtime dependency.

**Storage**: Files. Rooms at `content/room/<id>.yaml` with `content/room/<id>.md` beside them.

**Testing**: Vitest for the schema, two rules, the membership module, the built room pages and the site-wide link check (valid and invalid fixtures, a named mutation per rule); Playwright and axe for the Rooms pages through spec 002's setup.

**Target Platform**: Build time and CI for the registry side; static HTML for Workers static assets (ADR 0012).

**Project Type**: Library (registry side, membership) plus site pages, in the existing single project.

**Performance Goals**: ADR 0004 for content pages: ≤ 100 KB compressed JavaScript on first load (the pages ship none), LCP ≤ 2.5 s, CLS ≤ 0.1, INP ≤ 200 ms, accessibility 100.

**Constraints**: Deterministic and offline; the gate stays pure; held essays, maps and layers leak nothing; no dynamic infrastructure.

**Scale/Scope**: seven rooms, a handful of fixture essays, maps and layers; 2 new rules (see [contracts/room-rule-ids.md](./contracts/room-rule-ids.md)); one shared test helper.

## Constitution Check

*GATE: passes before Phase 0 and again after Phase 1 design.*

- [x] **Historical question (I)**: "What kinds of human relationship to space do maps record?" (spec header).
- [x] **No duplicated canonical records or private geometry (II, V)**: a room stores no member; membership is derived once from the essays that declare rooms, so nothing is copied per room.
- [x] **Uncertainty and provenance as fields (III, VI)**: not applicable beyond honest copy status: unfinished prose is marked `draft`, never presented as final.
- [x] **Bespoke interactions (IV)**: none; rooms are static pages.
- [x] **No dynamic infrastructure (VII)**: static HTML only.
- [x] **Accessibility and performance impact (IX)**: the room page types join the CI template list; the pages ship no JavaScript.
- [x] **Test strategy (X)**: every acceptance scenario maps to a named test (table below), written first under the `tdd` skill.

**Result**: no violations; Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/007-rooms/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── room-rule-ids.md     # ROOM-PUBLIC, ROOM-COPY
│   ├── membership.md        # the pure module's interface and rules
│   └── room-pages.md        # index, room page, links, link checker
└── tasks.md                 # /speckit-tasks
```

### Source code (repository root)

```text
src/registry/
├── schemas/families.ts      # RoomSchema: order, short_description, copy_status
├── rules/rooms.ts           # ROOM-SET (existing), + ROOM-PUBLIC, ROOM-COPY
└── project.ts               # allowlist grows (room fields and body)
src/rooms/
└── membership.ts            # pure: a room's essays, maps, layers (exists with roomsOf from spec 004; extended here)
src/shell/components/        # RoomCard.astro, RoomGroups.astro
src/pages/rooms/{index,[slug]}.astro
content/room/                # seven records and seven Markdown bodies (draft placeholders); created in Foundation, the repository has no content/ yet
tests/registry/unit/         # room schema and rule tests
tests/rooms/{unit,build,e2e,fixtures}/
tests/shell/support/links.ts # the internal link and fragment checker
tests/shell/build/links.test.ts
```

**Structure Decision**: membership is a pure module over public records so the same function serves the page, the Collection filter, the Atlas lens and the cross-test, and is tested without a browser. The link checker is a shell-level helper because it protects every spec, not only this one. The room body file follows the pattern of the cartographer biography and the essay body.

## Acceptance-scenario → test map

| Story | Scenarios | Test |
|---|---|---|
| US1 walk | 1 (primary before secondary, title order) | `tests/rooms/unit/membership.test.ts`, `build/room-page.test.ts` |
| | 2 (no essays: introduction, maps, layers, in-preparation line) | `build/room-page.test.ts` |
| | 3 (index: seven in order with short descriptions) | `build/rooms-index.test.ts` |
| | 4 (layer links to an Atlas view) | `build/room-page.test.ts` (after spec 005's `viewUrl`) |
| | 5 (held content absent) | `build/leak.test.ts` |
| US2 Atlas lens | room page layers equal the Atlas index's | `unit/atlas-agreement.test.ts` (after spec 005's index) |
| FR-004, FR-011 schema | | `tests/registry/unit/room-schema.test.ts` |
| FR-005 ROOM-PUBLIC | | `tests/registry/unit/room-public.test.ts` |
| FR-004 ROOM-COPY | | `tests/registry/unit/room-copy.test.ts` |
| FR-006 addresses and links | | `build/room-links.test.ts`, `tests/shell/build/home.test.ts` (updated) |
| FR-007 one membership module | | `unit/membership.test.ts`, a grep-style test that no other module derives rooms |
| FR-009 draft marker | | `build/room-page.test.ts`, `tests/shell/unit/shell-check.test.ts` |
| FR-010 link check | | `tests/shell/build/links.test.ts` (with a deliberately broken fixture page proving it can fail) |
| SC-001 one primary room | | `build/rooms-primary.test.ts` |
| SC-003 no leak | | `build/leak.test.ts`, `tests/registry/mutations.test.ts` |

## Complexity Tracking

Empty: no constitution violations.
