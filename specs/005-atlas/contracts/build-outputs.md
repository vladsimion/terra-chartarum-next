# Contract: what the Atlas build writes

The Atlas build is an Astro integration (`src/integrations/atlas.ts`) that runs in `astro:build:done`, after the registry gate and the registry's own outputs. It reads public records only (published and released) and writes into the static output. It fails the build, writing nothing, on any build-time check of [atlas-rule-ids.md](./atlas-rule-ids.md).

## Outputs

| File | Content |
|---|---|
| `data/layers/<slug>.fgb` | a GeoJSON source converted to FlatGeobuf, each feature with `_from_min`, `_from_max`, `_to_min`, `_to_max`, `_from_unc` and `_to_unc` added |
| `data/layers/<slug>.pmtiles` | a pre-tiled source copied unchanged |
| `data/layers/<slug>.facets.json` | per declared facet: category values with counts, or the range minimum and maximum |
| `data/overlays/<slug>.json` | the georeferencing annotation of an overlay layer, copied |
| `vendor/maplibre/*` | MapLibre as it ships: `maplibre-gl.mjs`, `maplibre-gl-shared.mjs`, `maplibre-gl-worker.mjs`, `maplibre-gl.css`, copied unchanged from the pinned package |
| `data/basemap.pmtiles` | the Natural Earth basemap and present-day reference (copied from `data/basemap/`) |
| `data/atlas-index.json` | metadata of public layers and collections for the catalogue (FR-021) |
| `data/atlas-slugs.json` | live slugs and slug histories of public layers and collections |
| `data/place-index.json` | normalised names and locations of public places (research R5) |
| `data/overview/<collection-slug>.svg` | the no-WebGL overview of a collection's default layers (research R6) |

## `atlas-index.json`

`{ layers: [ { slug, title, role, theme, provenance, collections: [slug], rooms: [room name], tags, synonyms, envelope: { from, to }, time_mode, description } ], collections: [ { slug, title, description, members: [slug], default_layers: [slug] } ] }`, ordered by title. Nothing else: no stable id of a layer, no source path, no field of a held entity. `provenance` is the layer-level geometry provenance. The description is the plain first paragraph of the layer's `description` (a field spec 005 adds to layers and collections, spec 001 amendment).

## Feature property conventions

`valid_from` and `valid_to` (EDTF), `geometry_provenance`, `name`, `place` (a place ID), plus the properties named in `facets[]`. The build-added `_from_min`, `_from_max`, `_to_min`, `_to_max` are years (integers, negative for BCE); an undated feature takes the layer envelope's bounds. `_from_unc` and `_to_unc` are 1 when that endpoint carries `?`, `~` or `%` and 0 otherwise: such an endpoint is only possibly valid on its own boundary year, and no width is invented for it (`src/atlas/time.ts`).

## Leak rule

No output may contain the id, slug or title of a held layer, collection, place or essay, or a private value; the registry leak scan runs over these outputs in CI (SC-005, `ATLAS-LEAK`).
