# Feature Specification: Rooms (Curatorial Paths)

**Feature Branch**: `007-rooms`
**Created**: 2026-10-15
**Status**: Clarified (2026-10-17)
**Input**: "Rooms are the reader-facing conceptual architecture — seven medieval-cosmography rooms — represented as metadata, never as folders or a data taxonomy." (TC-D004)

**Historical question served**: What kinds of human relationship to space — earth, map, city, border, road, archive, theatre — do maps record?

## Clarifications

### Session 2026-10-17 (grill, ADR 0015)
- Q: What does a room record hold? → A: `order` (1 to 7), `short_description` and `copy_status` (`draft` or `final`, default `draft`); the name is the record's `title`. The long description is Markdown in `content/room/<id>.md` beside the record. A room whose `copy_status` is `draft` renders `data-draft`, so `shell:check --cutover` fails until all seven are final. This amends spec 001's data model in this spec's Foundation phase.
- Q: What are the room addresses? → A: `/rooms/` for the index and `/rooms/<slug>/` for each room. The home page's room links (`/rooms/#earth`) change to the room pages; essay pages link to their rooms the same way; breadcrumbs read Rooms › Earth; former slugs redirect.
- Q: Who derives room membership? → A: One pure module, `src/rooms/membership.ts`: a room's essays (primary first, then secondary), and the maps and layers used by its public essays in either role. Specs 004 (Collection room filter) and 005 (Atlas Room lens) call it instead of deriving rooms themselves.
- Q: What does a room page show? → A: The introduction, then Essays, Maps and Layers (each hidden when empty, each in title order). Maps link to their Collection records, layers to an Atlas view built by the shared view-address module. A room with no public essay shows "Essays for this room are in preparation." with no link. The index lists all seven in canonical order with short descriptions. No per-room accent or imagery in v1.
- Q: Can a room be held? → A: No. `ROOM-PUBLIC` makes it a registry error for any room not to be `published` and `released`; unfinished prose is marked by `copy_status`, not by holding the room.
- Q: How is "zero dead links" checked? → A: A site-wide internal link and fragment check over the built output, run in Vitest: every internal `<a href>` must resolve to a built page and every `#fragment` to an element id on it; external links are ignored. It lives in `tests/shell/support/` so every spec benefits.
- Q: What about the Atlas lens (US2)? → A: Spec 005 delivers it. Spec 007 builds nothing for it and adds a cross-test: for the fixture registry, the layers on each room page equal the layers the Atlas index lists under that room.
- Q: Room text? → A: Written fresh as neutral placeholder copy with `copy_status: draft`; the author finalises it. No importer for room prose and no migration in spec 008.
- Q: What is spec 007 accepted on? → A: Fixtures: the seven rooms plus a small hand-authored set (a room with one primary and one secondary essay, two maps and a layer; a room with no public essay; a held essay, map and layer that must not appear). Real essays arrive as they are rebuilt (spec 003); real maps and layers via spec 008.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Walk through a room (Priority: P1)
**Audience**: general readers; collectors.
As a reader, I open a room and find its idea explained, its essays (primary first, then secondary), its maps and its Atlas layers.

**Independent Test**: one room fixture with one primary and one secondary essay, two maps and one layer lists all of them in the correct groups; held content is absent.

**Acceptance Scenarios**:
1. **Given** a room, **When** opened, **Then** primary essays appear before secondary ones, each group in title order.
2. **Given** a room with no released essays yet, **When** opened, **Then** it shows its introduction and related maps/layers, a line saying essays are in preparation, and no dead links. All seven rooms are public at v1 (ADR 0003, ADR 0015).
3. **Given** the Rooms index, **When** opened, **Then** all seven rooms appear in canonical order with a short description each, each linking to its page.
4. **Given** a layer used by a public essay of the room, **When** the room is opened, **Then** the layer links to an Atlas view with that layer active.
5. **Given** a map or layer used only by a held essay, **When** any room is opened, **Then** it does not appear.

### User Story 2 — Rooms as an Atlas lens (Priority: P2; delivered by spec 005)
**Audience**: all.
As a reader in the Atlas, I can switch to the Rooms lens to discover layers by room (see spec 005).

**Independent Test**: spec 005's lens tests pass, and for the fixture registry the layers on each room page equal the layers the Atlas index lists under that room.

### Edge Cases
- A room whose long-description file is missing: the page shows the short description and is marked `data-draft`; the gate warns.
- A map or layer used by essays in several rooms: listed in each.
- A map or layer used by no public essay: in no room.
- An essay with the room as secondary only: listed under that room's secondary group.
- A former room slug: redirects to the current room page.

## Requirements *(mandatory)*
- **FR-001**: Exactly seven rooms, in canonical order: Earth, Map, City, Border, Road, Archive, Theatre — each with an ID, name, order, short and long description (ADR 0003).
- **FR-002**: Every essay MUST declare one primary room and zero or more secondary rooms (spec 003).
- **FR-003**: Room pages MUST be derived from metadata; no content is duplicated per room.
- **FR-004**: A room record MUST carry `order`, `short_description` and `copy_status`; its long description MUST be the Markdown file beside it.
- **FR-005**: All seven room records MUST be `published` and `released` (`ROOM-PUBLIC`).
- **FR-006**: The Rooms index MUST be `/rooms/` and each room MUST have a page at `/rooms/<slug>/`; links to rooms from the home page, essays and the Atlas MUST use those addresses.
- **FR-007**: Room membership MUST be derived by `src/rooms/membership.ts` and by nothing else; specs 004 and 005 MUST call it.
- **FR-008**: A room page MUST show its introduction, then Essays (primary then secondary), Maps and Layers, each hidden when empty and in title order, and MUST show an in-preparation line when it has no public essay.
- **FR-009**: A draft room MUST render `data-draft`.
- **FR-010**: The built site MUST pass a site-wide internal link and fragment check.
- **FR-011**: Spec 007 MUST amend the spec 001 data model (room fields) in its Foundation phase; `FAM-UNKNOWN` stays strict.

### Key Entities
- **Room** (record plus Markdown body); **Room membership** (derived: essays, maps, layers); **Room page**.

## Success Criteria *(mandatory)*
- **SC-001**: 100% of released essays appear in exactly one primary room.
- **SC-002**: Zero dead internal links or fragments across the whole built site (link checker in CI).
- **SC-003**: No held essay, map, layer or id appears on any room page or in any room URL (named-mutation test over the built output).
- **SC-004**: The layers on each room page equal the layers the Atlas index lists under that room in 100% of fixture tests.
