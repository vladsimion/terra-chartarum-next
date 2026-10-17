# Data Model: Historical Atlas

Extends the layer and place rows of spec 001's data model ("Family fields"). Fields are those of the clarified FR-001, FR-009 and FR-019; `FAM-UNKNOWN` rejects anything not listed. Collections keep their existing fields (`members[]`, `default_layers[]`, `default_layers ⊆ members`).

## Layer record (`content/layer/<id>.yaml`)

| Field | Rule |
|---|---|
| Entity base | `id`, `family: layer`, `origin`, `title`, `slug`, `slug_history`, `lifecycle`, `release`, `relations[]`, `private`, `rights` |
| `role*` | `context`, `historical`, `evidence`, `map-overlay` (existing) |
| `asset*` | path of the committed source under `data/layers/`: a `.geojson`, or a pre-tiled `.pmtiles`; the built asset path is derived (`/data/layers/<slug>.fgb` or `.pmtiles`) and never stored. Must exist (availability, existing rule) and be within the size limit (`LAYER-ASSET-SIZE`) |
| `dataset*` | dataset ID (existing); the layer's source and licence come from its dataset and `rights` |
| `geometry_provenance` | existing; the layer-level default, which a feature may override with its own property |
| `theme*` | one of the seven canonical themes (below); required from `ready_for_build` (`LAYER-THEME`) |
| `tags[]`, `synonyms[]` | free strings used by search; trimmed, non-empty, no duplicates |
| `envelope*` | an EDTF interval `from/to` (four-digit signed years) covering the whole layer; required from `ready_for_build` (`LAYER-TIME`) |
| `time_mode*` | `per_feature` or `envelope_only`; required from `ready_for_build` (`LAYER-TIME`) |
| `facets[]` | list of `{ property*, label*, kind* }`; `kind` is `category` or `range`; `property` unique within the layer (`LAYER-FACET`) |
| `georef` | present only when `role = map-overlay` and required then (`LAYER-GEOREF`): `{ map*, annotation*, transformation*, residual_error_m*, control_points*, confidence* }` |

The seven themes, in order, with their stored values: `territories-boundaries` (Territories & Boundaries), `networks-circulation` (Networks & Circulation), `places-settlements` (Places & Settlements), `names-peoples-attestations` (Names, Peoples & Attestations), `conflict-campaigns-frontiers` (Conflict, Campaigns & Frontiers), `cartographic-evidence` (Cartographic Evidence), `historical-map-overlays` (Historical Map Overlays).

### Georef (overlay layers)

| Field | Rule |
|---|---|
| `map*` | a map record ID (typed reference to family map, spec 004) |
| `annotation*` | path of the Allmaps georeferencing annotation JSON under `data/layers/` |
| `transformation*` | `polynomial1`, `polynomial2`, `polynomial3`, `helmert`, `projective` or `thin-plate-spline` |
| `residual_error_m*` | number ≥ 0, metres |
| `control_points*` | integer ≥ 3 |
| `confidence*` | the shared confidence values (`secure`, `probable`, `possible`, `conjectural`) |

### Feature property conventions (checked at build, not by the gate)

A feature in a layer asset may carry `valid_from` and `valid_to` (EDTF, required on every feature when `time_mode = per_feature`), `geometry_provenance` (one of the five values, overriding the layer's), `name` (shown in the inspector), `place` (a place ID, optional), and any properties named by the layer's `facets[]`. The build adds `_from_min`, `_from_max`, `_to_min` and `_to_max` (years, from `time.ts`). See [contracts/build-outputs.md](./contracts/build-outputs.md).

## Place record (`content/place/<id>.yaml`)

| Field | Rule |
|---|---|
| Entity base | as above |
| `place_type*`, `location_status` | existing |
| `names*` | list of `{ name*, language*, kind*, valid_from?, valid_to? }`; `kind` is `historic` or `modern`; `language` a BCP 47 tag; `valid_from` and `valid_to` EDTF dates; at least one name from `ready_for_build` (`PLACE-NAMES`) |
| `location` | `{ lon*, lat* }` WGS84 decimal degrees (`lon` in -180 to 180, `lat` in -90 to 90); required from `ready_for_build` (`PLACE-LOCATION`) |

## Derived values (never stored)

| Value | Derived from |
|---|---|
| Collections of a layer | the public collections that list it in `members[]` |
| Rooms of a layer | the rooms of the public essays that list it in `layers[]` (primary and secondary) |
| Related essays of a layer | the public essays that list it in `layers[]` |
| Built asset path | the layer's slug and source type |
| Facet values | the features of the layer's asset, at build time |
| Slug resolution table | public layers' live slugs and their slug histories |

## Public projection

The allowlist adds, for layer: `theme`, `tags`, `synonyms`, `envelope`, `time_mode`, `facets`, `georef` (including `annotation`); for place: `names`, `location`. The layer's source path (`asset`) is not projected; only the derived built path reaches a page. A layer or place that is not published and released is not projected at all.

## Atlas view (browser state; see [contracts/view-address.md](./contracts/view-address.md))

`{ year: integer, lens: 'theme' | 'collection' | 'room', collection?: slug, active: slug[] (in activation order), focused?: slug, relevantOnly: boolean, facets: { [slug]: { [property]: selection } } }`.
