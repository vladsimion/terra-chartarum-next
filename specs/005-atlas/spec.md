# Feature Specification: Historical Atlas

**Feature Branch**: `005-atlas`
**Created**: 2026-10-15
**Status**: Draft
**Input**: "The Atlas is a historical argument-building instrument, not a file manager: Atlas → Collection → Layer, with a persistent Active Layers composition." (Constitution III, IV, V, VII)

**Historical question served**: How did places, networks, territories and names change over time — and how sure can we be about each line on the map?

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Compose a historical map at a chosen year (Priority: P1)
**Audience**: all four.
As a reader, I pick a year on a time control, switch on historical layers and see only features valid at that year, over clearly labelled physical/modern context.

**Independent Test**: with two fixture layers (one per-feature time, one envelope-only), setting the year to 1400 shows the expected features; modern boundaries are labelled as present-day reference.

**Acceptance Scenarios**:
1. **Given** a layer with per-feature time, **When** the year changes, **Then** only features with `valid_from ≤ year ≤ valid_to` render.
2. **Given** a modern reference layer, **When** active, **Then** it is labelled present-day and styled distinctly from historical evidence.
3. **Given** a reconstructed feature, **When** rendered, **Then** its reconstruction state is visually and textually distinguishable (not by colour alone).

### User Story 2 — Discover layers through Themes, Collections and Rooms (Priority: P1)
**Audience**: general readers; students.
As a reader, I browse layers by Theme (what the layer means), Collection (curated bundle answering a question) or Room, and search by name; discovery never changes what is on the map until I activate something.

**Independent Test**: switching lens three times leaves the Active Layers set unchanged; search narrows results without activating anything.

**Acceptance Scenarios**:
1. **Given** a Collection, **When** I choose "activate defaults", **Then** its default member layers are added to Active Layers (no synthetic collection layer).
2. **Given** "only show layers relevant to this year", **When** enabled, **Then** the catalogue narrows but active out-of-year layers stay active and are marked out of range.
3. **Given** search text, **When** entered, **Then** ranking is exact title → title prefix → tag/synonym → collection/theme/room → description.

### User Story 3 — Inspect provenance of any layer (Priority: P1)
**Audience**: researchers; GIS developers; historians.
As a reader, one inspector shows a layer's description, role, theme, temporal extent, source, licence, methodology docs, related released essays, rooms, collections and facets.

**Independent Test**: focusing a fixture layer shows all fields from its canonical record; facets apply and reset per layer.

### User Story 4 — Share an exact view (Priority: P2)
**Audience**: students; researchers.
As a reader, "Copy this view" produces a URL that restores year, active layers, focused layer and lens/collection context; unknown IDs in a URL degrade gracefully.

**Independent Test**: round-trip a view URL; the restored state equals the original; a URL with a retired ID loads the rest and reports the missing layer.

### User Story 5 — Learn to read the Atlas (Atlas Handbook) (Priority: P2)
**Audience**: general readers; students.
As a newcomer, I find the Handbook from the Atlas landing ("New to the Atlas? Read the Handbook"), a labelled entry next to the layer controls, contextual deep links from the inspector, the home page and the footer.

### User Story 6 — Georeferenced historical map overlays (Priority: P3)
**Audience**: collectors; historians of cartography.
As a reader, I overlay a georeferenced historical map with adjustable opacity and see its control-point quality (residual error, transformation, confidence).

### Edge Cases
- No WebGL: a static map image and a full textual layer/feature list remain usable.
- 200+ layers: discovery stays usable and performant (synthetic fixture).
- Planned / in-preparation layers: shown in a data catalogue view, not as disabled rows in the live browser.
- Published layer with missing asset: build/release fails.
- Collection with zero runnable public members: no activation action shown.
- Held essay metadata: never present in Atlas payloads or URLs.

## Requirements *(mandatory)*
- **FR-001**: Each layer MUST declare role (`context`, `historical`, `evidence`, `map-overlay`), theme (one of seven), collections, rooms, tags, temporal envelope, per-feature time flag, source, licence, lifecycle, facets.
- **FR-002**: Collections MUST hold `layerIds` and `defaultLayerIds ⊆ layerIds`; layers MUST NOT carry a global default flag.
- **FR-003**: There MUST be one source of truth for active layers, focused layer, lens, year, year-relevance toggle, collection context and per-layer facets; map visibility derives from it.
- **FR-004**: Changing year MUST NEVER silently deactivate a layer.
- **FR-005**: Geometry MUST NOT be duplicated to serve collections, rooms or essays.
- **FR-006**: Assets MUST be static/CDN, lazily or range-requested; catalogue browsing MUST NOT fetch layer binaries.
- **FR-007**: Mobile MUST be map-first with drawers/sheets for catalogue, active layers and inspector.
- **FR-008**: A keyboard-only user MUST be able to switch lens, activate collection defaults, inspect a layer, apply/reset a facet, remove a layer and copy the view.
- **FR-009**: Historical place search MUST be available in v1 as exact and prefix match over historic and modern names, with results focusing the Atlas. Fuzzy matching and concordance views are deferred (ADR 0004).
- **FR-010**: The v1 anchor collection MUST be Corpus Chartarum Daciae, with the Roman Dacia layers (limites, roads, principal sites) runnable. The CND attestation layer is registered as `in-preparation` and is not shown in the live browser until CND pilot acceptance (ADR 0002). Other migrated layers keep their imported lifecycle.

### Key Entities
- **GeoLayer**, **GeoCollection**, **Theme**, **Room**, **Atlas view state** (year, lens, active IDs, focused ID, collection, facets).

## Success Criteria *(mandatory)*
- **SC-001**: On a 200-layer synthetic catalogue, lens switch, search and year filter each stay within the INP budget (≤ 200 ms); the Atlas page meets its JS (≤ 350 KB) and time-to-interactive (≤ 4 s) budgets (ADR 0004).
- **SC-002**: 100% of runnable published layers are discoverable by Theme and Search.
- **SC-003**: View URLs round-trip deterministically in 100% of fixture tests.
- **SC-004**: The keyboard scenario in FR-008 passes end-to-end.
