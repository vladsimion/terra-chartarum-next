# Research: Map Collection & Cartographers Catalogue

Decisions not already settled by the grill (ADR 0011), ADR 0004 or ADR 0005.

## R1. Viewer library and loading
- **Decision**: OpenSeadragon, imported dynamically by `viewer.client.ts` when the reader activates "Open viewer". Until then the page shows one static image. Institutional witnesses use the institution's IIIF image endpoint (a IIIF Image API `info.json` URL); a held witness uses a static or DeepZoom source we host.
- **Rationale**: ADR 0005 names OpenSeadragon; loading it on activation keeps the catalogue page inside the 100 KB first-load budget (ADR 0004); the static image gives a first paint and the fallback.
- **Alternatives**: Mirador or Universal Viewer (full viewers, far over the budget); Leaflet with image tiles (no IIIF).
- **Note**: pinning a version is the first viewer task; its measured gzip size is recorded in the task.

## R2. Where the filter index comes from
- **Decision**: an Astro endpoint `src/pages/data/collection-index.json.ts` builds the index from the public records at build time. Each entry holds id, slug, title, maker ids and names, the EDTF date plus the derived `[from, to]` year interval, coverage region ids, derived rooms, witness kind, and nothing else. The list page renders the same records as HTML, so the index is only an accelerator.
- **Rationale**: the spec requires the list to work without JavaScript; one small JSON file keeps filtering client-side with no server (Constitution VII). At 500 entries the index is a few tens of kilobytes compressed.
- **Alternatives**: filtering by hiding DOM nodes (no index, but slow at 500 and hard to test purely); a search library (text search is out of v1).

## R3. EDTF to a comparable interval
- **Decision**: the pure `filter.ts` converts a record's EDTF date to a year interval using spec 001's `dates.ts` (`1595?` is 1595 to 1595 flagged uncertain, `159X` is 1590 to 1599, `1595/1602` is that range, a negative year is BCE). A date filter matches when the intervals overlap, so an uncertain date matches any range that touches it. A record with no date never matches a date filter and sorts last.
- **Rationale**: ADR 0007 makes uncertainty part of the value; hiding an uncertain map from a range it may belong to would be a silent exclusion.
- **Alternatives**: exact-year match only (excludes uncertain maps); midpoint (invents precision).

## R4. Room facet without a stored room
- **Decision**: a map's rooms are derived from `rooms.primary` and `rooms.secondary[]` of the public essays that list the map in `maps[]`. No room is stored on a map. Assumed during the grill; see spec FR-019.
- **Rationale**: spec 003 made `rooms` essay-only and Constitution II forbids a second copy; the derived value updates itself when an essay is released.
- **Alternatives**: a `rooms` field on the map (a second place to keep in step); dropping the facet (the spec asks for it).

## R5. Field status and the empty-value rule
- **Decision**: the displayed fields are a fixed list (`DISPLAYED_FIELDS` in `schemas/map-values.ts`): title_original, makers, date_published, publication_place, edition_state, atlas_context, dimensions, language, coverage, significance, provenance, georeferencing_status, images. For each, the pure view-model returns `{ value, status }`: `recorded` when it has a value; the stated status from `field_status` otherwise; and an empty unstated field is reported to the rule as a gap. The page never renders a bare blank.
- **Rationale**: one list drives the rule, the view and the completeness report, so they cannot drift.
- **Alternatives**: deriving the list from the schema (optional fields that are never displayed would be flagged).

## R6. Private field names
- **Decision**: `MAP-PRIVATE-FIELD` rejects, at any depth in any family, a key matching `price`, `paid`, `cost`, `negotiation`, `vendor`, `dealer_contact`, `invoice`, `receipt` (case-insensitive, whole words split on `_` and `-`). `FAM-UNKNOWN` already rejects unknown top-level fields; the new rule adds a named reason and covers nested keys inside value objects such as `images[]` or `physical`.
- **Rationale**: ADR 0011; a clear message ("private acquisition data never enters the repository") is what the editor needs when it trips.
- **Alternatives**: scanning values (too many false positives: "paid" in a quotation).

## R7. Enrichment scoring
- **Decision**: impact 1 to 3 from how many essays cite the map (0 → 1, 1 → 2, 2 or more → 3, counting held essays too, because they are the work ahead); risk 1 to 3 from the count of gaps and `not_yet_verified` or `unknown` statuses (0 to 1 → 1, 2 to 4 → 2, 5 or more → 3); reuse 1 to 3 from how many layers and places reference the map (same bands as impact). Score is the product (1 to 27); ties sort by id. The report shows all three parts with the product.
- **Rationale**: ordinal bands are explainable and testable; the spec asks for the three named factors and no formula.
- **Alternatives**: weighted sums or unbounded counts (opaque, dominated by one factor).

## R8. Cartographer biography
- **Decision**: `content/cartographer/<id>.md` beside the record, rendered as released prose only when the cartographer is public. Plain Markdown, no components.
- **Rationale**: prose does not belong in YAML; the pattern matches the essay `.mdx` body; the body is excluded from the leak surface because it is read only for public records.
- **Alternatives**: a `biography` YAML string (awkward to edit, no paragraphs).
