# Feature Specification: Rooms (Curatorial Paths)

**Feature Branch**: `007-rooms`
**Created**: 2026-10-15
**Status**: Draft
**Input**: "Rooms are the reader-facing conceptual architecture — seven medieval-cosmography rooms — represented as metadata, never as folders or a data taxonomy." (TC-D004)

**Historical question served**: What kinds of human relationship to space — earth, map, city, border, road, archive, theatre — do maps record?

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Walk through a room (Priority: P1)
**Audience**: general readers; collectors.
As a reader, I open a room and find its idea explained, its essays (primary first, then secondary), its maps and its Atlas layers.

**Independent Test**: one room fixture with one primary and one secondary essay, two maps and one layer lists all of them in the correct groups; held content is absent.

**Acceptance Scenarios**:
1. **Given** a room, **When** opened, **Then** primary essays appear before secondary ones.
2. **Given** a room with no released essays yet, **When** opened, **Then** it shows its introduction and related maps/layers, with no dead links. All seven rooms are public at v1 (ADR 0003).
3. **Given** the Rooms index, **When** opened, **Then** all seven rooms appear in canonical order with a short description each.

### User Story 2 — Rooms as an Atlas lens (Priority: P2)
**Audience**: all.
As a reader in the Atlas, I can switch to the Rooms lens to discover layers by room (see spec 005).

## Requirements *(mandatory)*
- **FR-001**: Exactly seven rooms, in canonical order: Earth, Map, City, Border, Road, Archive, Theatre — each with an ID, name, order, short and long description (ADR 0003).
- **FR-002**: Every essay MUST declare one primary room and zero or more secondary rooms.
- **FR-003**: Room pages MUST be derived from metadata; no content is duplicated per room.

## Success Criteria *(mandatory)*
- **SC-001**: 100% of released essays appear in exactly one primary room.
- **SC-002**: Zero dead links on room pages (link checker in CI).
