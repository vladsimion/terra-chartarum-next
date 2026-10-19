# Feature Specification: Historical Atlas

**Feature Branch**: `005-atlas`
**Created**: 2026-10-15
**Status**: Clarified (2026-10-17)
**Input**: "The Atlas is a historical argument-building instrument, not a file manager: Atlas → Collection → Layer, with a persistent Active Layers composition." (Constitution III, IV, V, VII)

**Historical question served**: How did places, networks, territories and names change over time — and how sure can we be about each line on the map?

## Clarifications

### Session 2026-10-17 (grill, ADR 0013)
- Q: Are unpublished layers listed publicly? → A: No. Public means published and released (TC-D019); the Atlas, its catalogue index and every payload list only published, released layers with a runnable asset. There is no "data catalogue view" of unpublished layers; CND is mentioned only in prose. This amends the earlier edge case and ADR 0002.
- Q: Does spec 005 change the registry? → A: Yes, in its Foundation phase it amends spec 001's data model: layers gain `theme`, `tags[]`, `synonyms[]`, `envelope`, `time_mode` and `facets[]`; places gain `names[]` and `location`; map-overlay layers gain `georef`. Collection fields keep the registry's names (`members`, `default_layers`), and a layer's collections are derived.
- Q: How are a layer's rooms known? → A: Derived from the rooms of the public essays that list the layer in `layers[]`; no room is stored on a layer or collection. Curated membership, if wanted, is spec 007's decision.
- Q: How does the year select features? → A: A feature renders when the year is inside its earliest-start to latest-end interval (EDTF). A feature that is only possibly valid at that year renders flagged "date uncertain". A feature without dates inherits the layer's envelope; an `envelope_only` layer shows while the year is inside the envelope. An active layer outside its envelope stays active and is marked "out of range". BCE years work.
- Q: Where does layer data live? → A: Sources (GeoJSON or GeoPackage from the R pipelines) are committed under `data/`; the build converts them to FlatGeobuf (range-requested) or PMTiles. An asset over the host's per-file limit (believed 25 MiB, to be confirmed in research) is a build error. No storage bucket in v1.
- Q: Basemap? → A: Self-hosted Natural Earth for the present-day reference; no third-party tile service at runtime. Revised 2026-10-18 (research R11): v1 is the country outlines as FlatGeobuf, because the build has no tiling tool; PMTiles can replace it.
- Q: What is the view address? → A: The query string of `/atlas/`: `y` (year), `l` (active layers), `f` (focused layer), `lens`, `c` (collection) and `facet.<layer>`. Layers are public slugs; a retired slug resolves through slug history, an unknown one is skipped and reported. No `localStorage`. One module builds and reads these addresses.
- Q: What is a facet? → A: A feature property a layer declares in `facets[]` (property, label, kind `category` or `range`). Values are computed at build time; applying a facet filters that layer's features in the browser; each layer has its own reset.
- Q: How is reconstruction shown? → A: By pattern as well as legend and inspector text, never colour alone: solid for documentary geometry, dashed for scholarly reconstruction, dash-dot for generalised editorial, thin dotted grey for present-day reference; hatching for polygons. Confidence is shown in the inspector only.
- Q: No WebGL? → A: The build generates a static SVG overview of each collection's default layers (a pure-JavaScript projection, no headless browser), plus text lists of layers and per-layer feature tables. WebGL is detected before MapLibre loads.
- Q: Place search? → A: Exact and prefix match, ignoring case and diacritics, over `names[]`, from a build-time index. A result recentres the map at a fixed zoom and shows a labelled marker that is not a layer and never changes Active Layers. Place-to-layer links are out of v1.
- Q: Georeferenced overlays (US6)? → A: In v1, built last. A `map-overlay` layer carries `georef` (the map record it shows, the Allmaps annotation file, transformation, residual error, control-point count, confidence); the inspector shows them; opacity is a slider; rendering uses the Allmaps MapLibre plugin; tested with a fixture overlay.
- Q: The Handbook? → A: A content collection, one Markdown entry per topic, at `/atlas/handbook/` and `/atlas/handbook/<slug>/`, with stable anchors for the inspector and landing links. Topics: reading the time control, provenance and reconstruction, themes and collections, sharing a view, keyboard and accessibility. The v1 text is skeleton copy marked `draft: true`; the author writes the final text and `shell:check --cutover` fails until then.
- Q: UI architecture? → A: No UI framework. A typed store is the single source of truth; the catalogue, inspector and drawers are Astro-rendered HTML enhanced by small TypeScript modules; MapLibre loads on the Atlas page only. The first task measures the compressed size of MapLibre, the PMTiles protocol and the app against the 350 KB budget; if over, the map loads after the catalogue is interactive.
- Q: Catalogue index and search? → A: One build-time `atlas-index.json` of public layers' metadata (title, slug, role, theme, collections, derived rooms, tags, synonyms, envelope, time mode); a hand-written ranker applies the order in US2; layer data is fetched only on activation.
- Q: How do essays link in? → A: The inspector's related-essays list is derived from essays' `layers[]` (public only). An essay's "Open in Atlas" link is built by the same view-address module as the Atlas. Embedded maps in essays are out of this spec.
- Q: What is spec 005 accepted on? → A: Fixtures: a seeded generator for a 200-layer catalogue plus a small hand-authored set (a per-feature layer, an envelope-only layer, a present-day context layer, a reconstructed feature, a retired slug, a collection with defaults, a held layer that must not appear). Spec 008 imports the real Roman Dacia layers; CND stays unpublished.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Compose a historical map at a chosen year (Priority: P1)
**Audience**: all four.
As a reader, I pick a year on a time control, switch on historical layers and see only features valid at that year, over clearly labelled physical/modern context.

**Independent Test**: with two fixture layers (one per-feature time, one envelope-only), setting the year to 1400 shows the expected features; modern boundaries are labelled as present-day reference.

**Acceptance Scenarios**:
1. **Given** a layer with per-feature time, **When** the year changes, **Then** only features whose interval contains the year render, and a feature only possibly valid at that year renders flagged "date uncertain".
2. **Given** a modern reference layer, **When** active, **Then** it is labelled present-day and styled distinctly from historical evidence.
3. **Given** a reconstructed feature, **When** rendered, **Then** its reconstruction state is distinguishable by pattern and text, not by colour alone.
4. **Given** an active layer whose envelope excludes the year, **When** the year is set, **Then** the layer stays active and is marked out of range.

### User Story 2 — Discover layers through Themes, Collections and Rooms (Priority: P1)
**Audience**: general readers; students.
As a reader, I browse layers by Theme (what the layer means), Collection (curated bundle answering a question) or Room, and search by name; discovery never changes what is on the map until I activate something.

**Independent Test**: switching lens three times leaves the Active Layers set unchanged; search narrows results without activating anything.

**Acceptance Scenarios**:
1. **Given** a Collection, **When** I choose "activate defaults", **Then** its default member layers are added to Active Layers (no synthetic collection layer).
2. **Given** "only show layers relevant to this year", **When** enabled, **Then** the catalogue narrows but active out-of-year layers stay active and are marked out of range.
3. **Given** search text, **When** entered, **Then** ranking is exact title → title prefix → tag/synonym → collection/theme/room → description.
4. **Given** the Room lens, **When** browsed, **Then** a layer appears under the rooms of the public essays that list it, and a layer no public essay lists has none.

### User Story 3 — Inspect provenance of any layer (Priority: P1)
**Audience**: researchers; GIS developers; historians.
As a reader, one inspector shows a layer's description, role, theme, temporal extent, source, licence, methodology docs, related released essays, rooms, collections and facets.

**Independent Test**: focusing a fixture layer shows all fields from its canonical record; facets apply and reset per layer.

### User Story 4 — Share an exact view (Priority: P2)
**Audience**: students; researchers.
As a reader, "Copy this view" produces a URL that restores year, active layers, focused layer and lens/collection context; unknown IDs in a URL degrade gracefully.

**Independent Test**: round-trip a view URL; the restored state equals the original; a URL with a retired slug loads the rest, resolves the retired slug through slug history, and reports a slug that resolves to nothing.

### User Story 5 — Learn to read the Atlas (Atlas Handbook) (Priority: P2)
**Audience**: general readers; students.
As a newcomer, I find the Handbook from the Atlas landing ("New to the Atlas? Read the Handbook"), a labelled entry next to the layer controls, contextual deep links from the inspector, the home page and the footer.

### User Story 6 — Georeferenced historical map overlays (Priority: P3)
**Audience**: collectors; historians of cartography.
As a reader, I overlay a georeferenced historical map with adjustable opacity and see its control-point quality (residual error, transformation, confidence).

### User Story 7 — Find a place by name (Priority: P2)
**Audience**: all four.
As a reader, I type a historic or modern place name and the map recentres on it with a labelled marker, without changing which layers are active.

**Acceptance Scenario**: **Given** the name "Sarmizegetusa" or a modern equivalent in a place's `names[]`, **When** I search by its prefix, **Then** the place is offered, choosing it recentres the map and shows a marker, and Active Layers is unchanged.

### Edge Cases
- No WebGL: a static SVG overview and a full textual layer/feature list remain usable.
- 200+ layers: discovery stays usable and performant (synthetic fixture).
- Layers not both `published` and `released`: never listed, never in a payload or URL (ADR 0013).
- Published layer with missing asset, or an asset over the host's per-file limit: build/release fails.
- Collection with zero runnable public members: no activation action shown.
- Held essay metadata: never present in Atlas payloads or URLs.
- A shared URL naming a retired slug: resolved through slug history; naming a held or unknown layer: skipped and reported, without confirming that the layer exists.

## Requirements *(mandatory)*
- **FR-001**: Each layer MUST declare role (`context`, `historical`, `evidence`, `map-overlay`), theme (one of seven), tags and synonyms, temporal envelope, time mode, facets, source and licence (its dataset and rights), lifecycle. Its collections and rooms are derived, never stored on the layer.
- **FR-002**: Collections MUST hold `members` and `default_layers ⊆ members`; layers MUST NOT carry a global default flag.
- **FR-003**: There MUST be one source of truth (a typed store) for active layers, focused layer, lens, year, year-relevance toggle, collection context and per-layer facets; map visibility derives from it.
- **FR-004**: Changing year MUST NEVER silently deactivate a layer.
- **FR-005**: Geometry MUST NOT be duplicated to serve collections, rooms or essays.
- **FR-006**: Assets MUST be static, built from sources in the repository, lazily or range-requested; catalogue browsing MUST NOT fetch layer binaries; an asset over the host's per-file limit MUST fail the build.
- **FR-007**: Mobile MUST be map-first with drawers/sheets for catalogue, active layers and inspector.
- **FR-008**: A keyboard-only user MUST be able to switch lens, activate collection defaults, inspect a layer, apply/reset a facet, remove a layer and copy the view.
- **FR-009**: Historical place search MUST be available in v1 as exact and prefix match over historic and modern `names[]`, with results recentring the map on a labelled marker. Fuzzy matching, concordance views and place-to-layer links are deferred (ADR 0004).
- **FR-010**: The v1 anchor collection is Corpus Chartarum Daciae with the Roman Dacia layers (limites, roads, principal sites) runnable once spec 008 imports them. The CND attestation layer is registered held at lifecycle `in_build` and is not listed anywhere public (ADR 0002 amended, ADR 0013). Other migrated layers keep their imported lifecycle, mapped to the shared vocabulary at import. Spec 005 itself is accepted on fixtures.
- **FR-011**: Only published, released layers with a runnable asset MUST appear in the Atlas, its catalogue index or any payload or URL (ADR 0013).
- **FR-012**: The Atlas view MUST live in the query string of `/atlas/` using public slugs, with slug-history resolution and graceful skipping; nothing is saved in `localStorage`; one module MUST build and read view addresses for the Atlas and for every "Open in Atlas" link.
- **FR-013**: A feature MUST render when the year is inside its earliest-start to latest-end interval; possibly valid features MUST be flagged "date uncertain"; undated features inherit the layer envelope; BCE years MUST work.
- **FR-014**: Facets MUST be declared in the layer record (property, label, kind), their values computed at build time, applied per layer and reset per layer, and part of the view address.
- **FR-015**: Geometry provenance MUST be shown by line and fill pattern plus legend and inspector text, never colour alone; present-day reference MUST be labelled and styled distinctly.
- **FR-016**: Without WebGL the Atlas MUST show a build-generated SVG overview, text lists and per-layer feature tables; WebGL MUST be detected before MapLibre loads.
- **FR-017**: Physical geography and present-day reference MUST come from self-hosted Natural Earth data; no third-party tile service may be called at runtime. In v1 this is the country outlines as FlatGeobuf (research R11); PMTiles when a tiling step exists.
- **FR-018**: The Handbook MUST be a content collection with stable anchors, linked from the Atlas landing, next to the layer controls, from the inspector, the home page and the footer.
- **FR-019**: A `map-overlay` layer MUST carry `georef` (map, annotation file, transformation, residual error, control-point count, confidence), shown in the inspector, with an opacity control.
- **FR-020**: The Atlas MUST use no UI framework; MapLibre MUST load on the Atlas page only; the Atlas page MUST meet ≤ 350 KB compressed JavaScript and map interactive ≤ 4.5 s (ADR 0004).
- **FR-021**: The catalogue MUST be served from one build-time index of public layers' metadata, searched by a ranker applying the US2 order.
- **FR-022**: A layer's rooms MUST be derived from the rooms of public essays that list it; the inspector's related essays MUST be derived from essays' `layers[]`, public only.
- **FR-023**: Spec 005 MUST amend the spec 001 data model (layer, place and overlay fields) in its Foundation phase; `FAM-UNKNOWN` stays strict.

### Key Entities
- **GeoLayer**: see FR-001; **GeoCollection**: `members`, `default_layers`; **Theme**; **Room** (derived); **Place** (with `names[]`, `location`); **Atlas view** (year, lens, active slugs, focused slug, collection, facets); **Georef** (overlay quality fields).

## Success Criteria *(mandatory)*
- **SC-001**: On a 200-layer synthetic catalogue, lens switch, search and year filter each stay within the INP budget (≤ 200 ms); the Atlas page meets its JS (≤ 350 KB) and time-to-interactive (≤ 4.5 s) budgets (ADR 0004).
- **SC-002**: 100% of runnable published layers are discoverable by Theme and Search.
- **SC-003**: View URLs round-trip deterministically in 100% of fixture tests.
- **SC-004**: The keyboard scenario in FR-008 passes end-to-end.
- **SC-005**: A held layer, held essay or non-public id appears in no Atlas page, index, payload or URL (named-mutation test over the built output).
- **SC-006**: No layer is distinguishable from another by colour alone (reconstruction, present-day reference and uncertain-date states each have a non-colour cue).
