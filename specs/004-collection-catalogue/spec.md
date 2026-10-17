# Feature Specification: Map Collection & Cartographers Catalogue

**Feature Branch**: `004-collection-catalogue`
**Created**: 2026-10-15
**Status**: Clarified (2026-10-17)
**Input**: "Maps are primary sources with authorship, production context, projection, omissions and agendas. One map/object = one canonical record." (Constitution II, V, VI)

**Historical question served**: What exactly is this map — which maker, edition and state, from which atlas — and how do we know?

## Clarifications

### Session 2026-10-17 (grill, ADR 0011)
- Q: What is one Map object record? → A: One witness: `witness_kind: held | institutional | unlocated`, required when the record's `record_scope` is `object` (the default). Two witnesses of one edition are two records joined by a relation (ADR 0011). *Amended 2026-10-17 by the spec 008 grill (ADR 0016): `record_scope` is `object`, `work` or `concept`; a `work` or `concept` record (an edition known from the literature, or an idea with no artefact) carries no `witness_kind`, is labelled as such on its page, has no viewer, and counts as no witness in the held/institutional filter. `unlocated` is an object whose location is not known.*
- Q: Does spec 004 change the registry schema? → A: Yes. Its Foundation phase amends spec 001's data model with the FR-001 fields and the cartographer fields. Image sources are embedded in the map record (`images[]`), not a new family.
- Q: How is "not established" shown? → A: A `field_status` map (`recorded`, `not_applicable`, `not_yet_verified`, `unknown`); a field with a value is `recorded`; empty and unstated is a warning from `ready_for_build` and an error at `publishable`. Held provenance and atlas context also carry `basis: observed | inferred`.
- Q: What about private purchase data? → A: Never committed. The repository is public, so a gate rule rejects field names such as `price`, `paid` and `negotiation`.
- Q: How is a generic family attribution ("Visscher") modelled? → A: As a `workshop` cartographer, with the map marked `attribution: unresolved`; it never counts as an exact maker. Biography is released prose beside the cartographer record.
- Q: What if a public map's maker is held? → A: Rule `MAP-MAKER-HELD`: warning before `publishable`, error at it. The cartographer listing shows released cartographers only.
- Q: How does the viewer behave? → A: OpenSeadragon loads only on activation; a static image shows first and is the fallback; institutional witnesses use the institution's IIIF endpoint; an image shows only when `rights.reproduction_cleared` is true; `alt` text is authored and required at `publishable`; keyboard, touch, reduced motion and a no-JS link to the institution's viewer.
- Q: How do browse and filters work? → A: The list is static HTML; a build-time JSON index makes filters a progressive enhancement; state lives in the query string; dates filter by EDTF range overlap; region is a place of type region or country in `coverage[]`; sort by date (earliest first, undated last), title or maker; no pagination up to 500 records; no text search in v1.
- Q: Which room does a map belong to? → A: None is stored (`rooms` is essay-only, spec 003). The room facet derives from the rooms of the public essays that use the map. *Assumed during the grill, to be confirmed by the author.*
- Q: How is a map cited? → A: By the shared citation generator and control built in spec 003, with a map-record input (CSL type `map`); Chicago on the page, BibTeX, RIS and CSL-JSON exports with stable URL and access date.
- Q: How is "where used" built? → A: Derived at build from one-way references; public referrers only, grouped as essays, Atlas layers and overlays, and places. A held essay never appears.
- Q: What vocabulary does verification use? → A: `unverified | checked_online | inspected` (held witnesses only); `last_verified` is an ISO date, required when not `unverified`.
- Q: Are dealer or auction descriptions evidence? → A: Aids only: an attribution supported only by a `dealer` or `auction` source fails at `publishable`, warns before.
- Q: What are the enrichment queue and completeness report? → A: An editor CLI report and CI artefact, never a public page; impact, risk and reuse each scored 1 to 3 and multiplied, with the three parts shown.
- Q: How are fixtures and the 59 legacy records handled? → A: Spec 004 is accepted on fixtures: seeded generated sets of 60 and 500 records plus about six committed hand-authored ones. Spec 008 maps the 59 legacy records, with `not_yet_verified` for missing fields; they arrive held and the editor releases them deliberately.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Inspect a map object in detail (Priority: P1)
**Audience**: collectors; historians of cartography; general readers.
As a reader, I open a map record and zoom into a high-resolution image, with title (original and normalised), maker, date, edition/state, atlas context, dimensions, coverage, rights and bibliography.

**Independent Test**: one fixture map with a deep-zoom image source renders its record and a zoomable viewer; with the image source unavailable, the record still renders with a clear fallback.

**Acceptance Scenarios**:
1. **Given** a map record with a deep-zoom/IIIF source, **When** opened and the viewer is activated, **Then** the reader can pan and zoom by mouse, touch and keyboard.
2. **Given** a field whose value is not established, **When** rendered, **Then** it shows `not yet verified` or `unknown` explicitly, never a blank presented as complete.
3. **Given** an attribution claim, **When** rendered, **Then** its evidence basis (institutional comparanda, bibliography) is shown.
4. **Given** a held physical object, **When** rendered, **Then** direct observation is visibly distinguished from inferred atlas/provenance history.
5. **Given** a record whose images are not cleared for reproduction, **When** rendered, **Then** no image is shown, the metadata is, and the page says why.
6. **Given** an unresolved workshop attribution, **When** rendered, **Then** the page says the maker is not individually established.

### User Story 2 — Browse and filter the collection (Priority: P1)
**Audience**: collectors; students.
As a reader, I browse the collection and filter by cartographer, date range, region, room and held vs institutional witness.

**Independent Test**: a 60-record fixture filters correctly on each facet, and filters combine; with JavaScript off the full list still shows.

**Acceptance Scenarios**:
1. **Given** a date range, **When** applied, **Then** records whose (possibly uncertain) date overlaps it are listed.
2. **Given** a filtered view, **When** its address is shared, **Then** the same view opens.
3. **Given** the list, **When** sorted by date, title or maker, **Then** the order is stable and undated records come last.

### User Story 3 — Cartographer profiles (Priority: P2)
**Audience**: historians of cartography; students.
As a reader, a cartographer page shows biography, workshop/publisher context, the maps in the collection linked to them and the essays that use those maps.

### User Story 4 — See where a map is used (Priority: P2)
**Audience**: researchers.
As a reader on a map record, I see every released essay, Atlas layer/overlay and place that references it.

**Acceptance Scenario**: **Given** a held essay that cites a map, **When** the map page is built, **Then** nothing about that essay appears anywhere in the output.

### User Story 5 — Completeness and enrichment queue (Priority: P3)
**Audience**: editor.
As the editor, the build emits a completeness report per record and a ranked enrichment queue ordered by publication impact × scholarly risk × reuse value.

### Edge Cases
- Generic family attributions (e.g. "Visscher"): not accepted as exact maker; record shows the unresolved state.
- Dealer or auction descriptions: allowed as discovery/provenance aids, never as sole authority.
- Rights unknown: image withheld from public view; record still public if its metadata is cleared.
- Private purchase/price/negotiation data: never public, and never committed to the repository.
- A public map whose maker is held: not publishable until the maker is released.
- An institutional witness marked `inspected`: rejected.
- A `work` or `concept` record: shown with its scope label, no viewer and no witness label; it is not offered in the "held" or "institutional" filter values.
- An `unlocated` object: shown with a "location not known" label and the field status for its repository.

## Requirements *(mandatory)*
- **FR-001**: Each map record MUST include, where applicable: ID, `witness_kind`, original and normalised title, cartographer/engraver/publisher IDs, place and date of publication (EDTF), edition/state, atlas context, dimensions/format, language, coverage (place IDs), significance, provenance and collection status, `images[]` (type IIIF/DeepZoom/static, URL, rights, attribution, `alt`), rights/licence, georeferencing status, related entity IDs, bibliography IDs, `verification`, `last_verified`, `record_scope`, `open_questions[]` (field, question, what would resolve it).
- **FR-002**: Each displayed field MUST carry a status of `recorded`, `not_applicable`, `not_yet_verified` or `unknown` (`field_status`); held provenance and atlas context MUST also carry `basis: observed | inferred`.
- **FR-003**: Held, institutional and unlocated witnesses MUST be distinguishable everywhere a map is shown, and a `work` or `concept` record MUST be labelled as not a single object.
- **FR-004**: Deep-zoom imagery MUST load only on activation, show a static image first, and degrade gracefully when unavailable.
- **FR-005**: Image attribution and rights MUST be shown with every image instance (thumbnail and full), generated from the record (ADR 0009).
- **FR-006**: Citation display and export MUST come from canonical record metadata through the shared generator of spec 003.
- **FR-007**: The schema MUST define extended physical fields for held sheets (platemark, fold, verso, colour status, repairs, watermark, observation vs inference) as optional. Display and enrichment are out of v1 scope and arrive with Trench G (ADR 0002).
- **FR-008**: The initial collection is all 59 records migrated from the live site, IDs preserved (ADR 0001, spec 008). Spec 004 is accepted against fixtures; the import and the release of the 59 belong to spec 008.
- **FR-009**: Spec 004 MUST amend the spec 001 data model with the map and cartographer fields in its Foundation phase; `FAM-UNKNOWN` stays strict (ADR 0011).
- **FR-010**: No price, vendor contact or negotiation data may be committed; the gate MUST reject such field names.
- **FR-011**: A cartographer of kind `workshop` MUST mark any map attributed to it `attribution: unresolved`, and an unresolved attribution MUST NOT count as an exact maker in any list.
- **FR-012**: The gate MUST apply `MAP-MAKER-HELD`: every maker of a public map is public (warning before `publishable`, error at it).
- **FR-013**: The collection list MUST be static HTML with a build-time JSON index for filtering; filter state MUST live in the query string; sort options are date, title and maker; there is no pagination up to 500 records and no text search in v1.
- **FR-014**: "Where used" MUST be derived at build from one-way references and list public referrers only.
- **FR-015**: `verification` MUST be one of `unverified`, `checked_online`, `inspected`; `last_verified` is an ISO date required unless `unverified`; `inspected` on an institutional witness is an error.
- **FR-016**: An attribution supported only by `dealer` or `auction` sources MUST fail at `publishable` and warn before; those are `source_kind` values.
- **FR-017**: Every image MUST have authored `alt` text by `publishable`; the viewer MUST be operable by keyboard and touch, honour `prefers-reduced-motion`, and offer a plain link to the institution's viewer without JavaScript.
- **FR-018**: The completeness report and enrichment queue MUST be an editor CLI report and CI artefact, never published; the queue scores impact, risk and reuse 1 to 3 and shows the three parts with the product.
- **FR-019**: The room facet MUST derive from the rooms of the public essays that use a map; no room is stored on a map. *(Assumed; to be confirmed.)*

### Key Entities
- **Map object**: one witness; see FR-001.
- **Cartographer**: ID, kind (`person` or `workshop`), names (variants), roles, dates, workshop/publisher relations, bibliography; biography is released prose beside the record.
- **Image source**: embedded in the map record: type (IIIF/DeepZoom/static), URL, rights, attribution, `alt`, witness kind.

## Success Criteria *(mandatory)*
- **SC-001**: 100% of publicly visible images display correct attribution and rights.
- **SC-002**: 100% of maps used by published essays resolve to a canonical record with no essay-private duplicate description.
- **SC-003**: Deep-zoom viewer reaches first meaningful tile within the ratified budget (first sharp tile ≤ 2.5 s, ADR 0004) on the reference mobile profile.
- **SC-004**: Collection filters respond in under 200 ms on a 500-record fixture.
- **SC-005**: A held essay, held maker or private acquisition field never appears in any built page, payload or URL (named-mutation test).
