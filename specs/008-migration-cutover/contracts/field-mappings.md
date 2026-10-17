# Contract: legacy field mappings

The v1 profile reads the legacy repository (github.com/vladsimion/terra-chartarum) at the pinned snapshot. Counts are from the snapshot surveyed on 2026-10-17. Every field not listed as mapped stays in the snapshot (its SHA is in the manifest) and is named in the import report as report-only, so nothing is lost permanently. A first task re-reads each registry's source against this table and corrects it before any adapter is written.

Boundary form of every legacy ID: `tc:atlas:<family>:<local-id>`, verbatim; the slug equals the local-id (research R8). Every record: `origin: legacy`, `release: held`, `lifecycle: researching` unless stated, `editor_confirmed` absent (TC-D024).

## Maps — `src/lib/corpus.ts` `RAW` (59) → family `map`

| Legacy key | Successor | Notes |
|---|---|---|
| `id` | `id`, `slug` | |
| `title` | `title` | the normalised title; `title_original` is left unset with status `not_yet_verified` |
| `year` | `date_published` | signed integer → four-digit signed EDTF (research R2); lossy conversions logged |
| `blurb` | `significance` | |
| `recordScope` | `record_scope`, `legacy_record_scope` | `object` (default when absent), `work`, `concept` |
| `custody` | `witness_kind`, `legacy_custody` | `held`, `institutional`, `unlocated`; absent on an `object` → `witness_kind` unset and `field_status.witness_kind: not_yet_verified`; not set for `work` and `concept` |
| `cartographerId` | `makers[]` | resolved to the imported cartographer record |
| `cartographer`, `engraver`, `publisher` | `edition_state` text | only when no `cartographerId` matches; `field_status.makers: not_yet_verified`; no cartographer is invented |
| `edition`, `state` | `edition_state` | joined as "Edition: …; State: …" |
| `dimensions` | `dimensions` | parsed when it matches `N × N mm|cm`; otherwise `field_status.dimensions: not_yet_verified` and the text reported |
| `provenance` | `provenance` | |
| `repository`, `repositoryId`, `sourceObjectId`, `sourceUrl` | `repository` | one text: "Repository (id, object id) URL"; logged as lossy |
| `bibliography[]` | `bibliography[]` | a registry key resolves to the entry minted for that Source; an inline citation becomes an entry through the `import-bib` matcher |
| `images[]` | `images[]` | `src` → archive address (`https://terra-chartarum.pages.dev/…`) as `static_url` and `url`; `alt` kept; `credit` → `attribution`; `license` → `licence`; `dziTileSource` → `type: deepzoom`; `iiif` → `type: iiif`; `reproduction_cleared: false`; nothing copied |
| `rightsStatement`, `attribution` | `rights.attribution` | `rights.licence` from the image `license` when all images agree |
| `uncertainties[]` | `open_questions[]` | `{ field, question, would_resolve }` |
| `relatedMapIds[]` | `relations[]` | map to map |
| `publicationStatus` | `legacy_publication_status` | |
| `essaySlug`, `relatedEssaySlugs`, `room`, `secondaryRooms`, `roomAnchor` | `migration/essay-links.json` | not stored on the map |
| `coords`, `region`, `coveragePath`, `condition`, `medium`, `scale`, `objectType`, `tags`, `physicalObservation` | report-only | coverage needs place IDs; `field_status.coverage: not_yet_verified` |
| `acquisition` and any key matching a private word | dropped | reported by name and count (FR-006) |

## Cartographers — `src/lib/cartographers.ts` (19) → family `cartographer`

`id`, `name` → `title`; `sortName` → `names[]`; `born`/`died` → `life_dates`; `bio` → the Markdown body; `kind: person` (the editor sets `workshop` where it applies); `essaySlugs`, `room`, `secondaryRooms`, `roomAnchor` → essay-links; `places`, `links` → report-only.

## Bibliography — `src/lib/bibliography.ts` (34) → family `source` plus `bibliography_entry`

Each item: a Source with the legacy `id` (`is_finding_aid: false`) and a minted entry. CSL-JSON: `title`, `author` as `literal`, `issued` from `year`, `URL` from `url`, `note` from `citation`, `type: document`; `section` unset (a mapping table in the importer assigns one only where the citation text makes the type unambiguous, otherwise none).

## Toponyms — `src/lib/toponyms.ts` (12) → family `place`

`id`, `title`; `type` → `place_type`; `coords`/`coordinates` `[lng, lat]` → `location`; `modern`, `medieval`, `variants` → `names[]` (`modern` or `historic`, language `und` until set); `pleiadesId`, `whgId`, `cndPlaceId` → `same_as[]`; `mapIds` → `relations[]`; `essaySlugs` → essay-links; `features`, `format`, `reconciliation`, `version`, `_terraChartarum`, `source_id` → report-only.

## Layers — `src/lib/geo.ts` (16) → family `layer`

`id`, `title`; `role`; `lifecycle` → `lifecycle` through `LEGACY_LAYER_LIFECYCLE_MAP`, the original as `legacy_layer_status`; `yearFrom`/`yearTo` → `envelope`; `perFeatureTime` → `time_mode`; `category`/`subcategory` → `theme` through a table (unmapped → none, a warning); `tags`; `facets` → `facets[]`; `documentationLinks` → `documentation[]`; `license`, `attribution` → `rights`; `url`/`source`/`format` → the layer source copied into `data/layers/` and the dataset link; `collectionIds` → checked against the collections (derived, not stored); `color`, `dash`, `width`, `graduate`, `fitBounds`, `featured`, `defaultOn`, `sortWeight`, `revealYear` → report-only (styling follows geometry provenance, spec 005); `essayLinks`, `essaySlugs`, `room`, `secondaryRooms` → essay-links. Layer sources are our data and are copied (subject to the size gate); images are not.

## Collections — `src/lib/geo-collections.ts` (6) → family `collection`

`id`, `title`; `description`/`summary` → `description`; `layerIds` → `members[]`; `defaultLayerIds` → `default_layers[]`; `tags`; `temporalNote`, `yearFrom`, `yearTo`, `from`, `to` → report-only; `featured`, `sortWeight`, `room`, `secondaryRooms`, `essaySlugs` → essay-links.

## Geo release assets — `data/geo/catalog.json` `assets` (27) → family `dataset`

`id`; `file`, `format`, `crs`, `featureCount`, `geometry` → report-only; `license`, `attribution`, `source` → `rights`; `yearFrom`/`yearTo` → dates; `version`: `legacy-<snapshot short SHA>`.

## Dacia profile — `data/dacia/places.csv`, `data/dacia/sources.csv`, pilot files

Mapping tables for these CSVs are written by the first Dacia task from the real headers, test-first with trimmed real rows, together with `vocab-mappings/cnd.yaml`. Only the places and sources referenced by the Roman Dacia layers and the Trench A pilot files are imported (research R7); `attestations.csv` is not.

## Essay links — `migration/essay-links.json`

`{ essays: { "<legacy essay slug>": { maps: [id], layers: [id], places: [id], cartographers: [id], rooms: { primary, secondary: [] } } } }`, built from every `essaySlug`, `essaySlugs`, `relatedEssaySlugs`, `room`, `secondaryRooms` found, sorted by key. It seeds `registry new essay` when an essay is rebuilt; it is not read by the build.
