# Feature Specification: Map Collection & Cartographers Catalogue

**Feature Branch**: `004-collection-catalogue`
**Created**: 2026-10-15
**Status**: Draft
**Input**: "Maps are primary sources with authorship, production context, projection, omissions and agendas. One map/object = one canonical record." (Constitution II, V, VI)

**Historical question served**: What exactly is this map — which maker, edition and state, from which atlas — and how do we know?

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Inspect a map object in detail (Priority: P1)
**Audience**: collectors; historians of cartography; general readers.
As a reader, I open a map record and zoom into a high-resolution image, with title (original and normalised), maker, date, edition/state, atlas context, dimensions, coverage, rights and bibliography.

**Independent Test**: one fixture map with a deep-zoom image source renders its record and a zoomable viewer; with the image source unavailable, the record still renders with a clear fallback.

**Acceptance Scenarios**:
1. **Given** a map record with a deep-zoom/IIIF source, **When** opened, **Then** the reader can pan and zoom by mouse, touch and keyboard.
2. **Given** a field whose value is not established, **When** rendered, **Then** it shows `not yet verified` or `unknown` explicitly, never a blank presented as complete.
3. **Given** an attribution claim, **When** rendered, **Then** its evidence basis (institutional comparanda, bibliography) is shown.
4. **Given** a held physical object, **When** rendered, **Then** direct observation is visibly distinguished from inferred atlas/provenance history.

### User Story 2 — Browse and filter the collection (Priority: P1)
**Audience**: collectors; students.
As a reader, I browse the collection and filter by cartographer, date range, region, room and owned vs institutional witness.

**Independent Test**: a 60-record fixture filters correctly on each facet, and filters combine.

### User Story 3 — Cartographer profiles (Priority: P2)
**Audience**: historians of cartography; students.
As a reader, a cartographer page shows biography, workshop/publisher context, the maps in the collection linked to them and the essays that use those maps.

### User Story 4 — See where a map is used (Priority: P2)
**Audience**: researchers.
As a reader on a map record, I see every released essay, Atlas layer/overlay and place that references it.

### User Story 5 — Completeness and enrichment queue (Priority: P3)
**Audience**: editor.
As the editor, the build emits a completeness report per record and a ranked enrichment queue ordered by publication impact × scholarly risk × reuse value.

### Edge Cases
- Generic family attributions (e.g. "Visscher"): not accepted as exact maker; record shows the unresolved state.
- Dealer or auction descriptions: allowed as discovery/provenance aids, never as sole authority.
- Rights unknown: image withheld from public view; record still public if its metadata is cleared.
- Private purchase/price/negotiation data: never public.

## Requirements *(mandatory)*
- **FR-001**: Each map record MUST include, where applicable: ID, original and normalised title, cartographer/engraver/publisher IDs, place and date of publication, edition/state, atlas context, dimensions/format, language, coverage, significance, provenance and collection status, image/IIIF source, rights/licence, georeferencing status, related entity IDs, bibliography IDs, verification state, last verified.
- **FR-002**: Each field MUST carry a status of `recorded`, `not_applicable`, `not_yet_verified` or `unknown`.
- **FR-003**: Owned/held objects and institutional digital witnesses MUST be distinguishable everywhere.
- **FR-004**: Deep-zoom imagery MUST lazy-load and degrade gracefully when unavailable.
- **FR-005**: Image attribution and rights MUST be shown with every image instance (thumbnail and full).
- **FR-006**: Citation export MUST use canonical record metadata.
- **FR-007**: The schema MUST define extended physical fields for held sheets (platemark, fold, verso, colour status, repairs, watermark, observation vs inference) as optional. Display and enrichment are out of v1 scope and arrive with Trench G (ADR 0002).
- **FR-008**: The initial collection is all 59 records migrated from the live site, IDs preserved (ADR 0001, spec 008).

### Key Entities
- **Map object**: see FR-001.
- **Cartographer**: ID, names (variants), roles, dates, workshop/publisher relations, bibliography.
- **Image source**: ID, type (IIIF/DeepZoom/static), URL, rights, attribution, held vs institutional.

## Success Criteria *(mandatory)*
- **SC-001**: 100% of publicly visible images display correct attribution and rights.
- **SC-002**: 100% of maps used by published essays resolve to a canonical record with no essay-private duplicate description.
- **SC-003**: Deep-zoom viewer reaches first meaningful tile within the ratified budget on the reference mobile profile.
- **SC-004**: Collection filters respond in under 200 ms on a 500-record fixture.
