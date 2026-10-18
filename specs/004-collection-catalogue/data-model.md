# Data Model: Map Collection & Cartographers Catalogue

Extends the map and cartographer rows of spec 001's data model ("Family fields") and replaces the placeholder `images: string[]` on the map schema. Fields are those of the clarified FR-001; `FAM-UNKNOWN` rejects anything not listed.

## Map record (`content/map/<id>.yaml`)

| Field | Rule |
|---|---|
| Entity base | `id`, `family: map`, `origin`, `title` (the normalised title), `slug`, `slug_history`, `lifecycle`, `release`, `relations[]` (a second witness of the same edition is joined here), `private`, `rights` |
| `record_scope` | `object` (default), `work` or `concept` (ADR 0016); `work` and `concept` are not a single witness |
| `witness_kind` | `held`, `institutional` or `unlocated` (ADR 0011, widened by ADR 0016); required from `ready_for_build` when `record_scope` is `object`, and absent otherwise (`MAP-SCOPE`) |
| `open_questions[]` | list of `{ field, question, would_resolve }`: what a record has been looked at for and still cannot answer; shown on the page |
| `makers[]*` | cartographer IDs (existing); required |
| `title_original` | the title as printed |
| `date_published` | EDTF date; precision derived (ADR 0007) |
| `publication_place` | place ID (typed reference) |
| `edition_state`, `repository` | existing free text |
| `atlas_context` | prose: the atlas or series the sheet comes from |
| `dimensions` | `{ height_mm, width_mm }` of the sheet, positive numbers |
| `language` | BCP 47 tag |
| `coverage[]` | place IDs (typed references); the region facet reads those of type region or country |
| `significance`, `provenance` | prose; public |
| `attribution` | `exact` (default) or `unresolved`; `unresolved` is required when any maker is a `workshop` (`MAP-ATTRIBUTION`) |
| `attribution_evidence[]` | Evidence IDs supporting the attribution (typed reference); shown on the page (US1.3) |
| `georeferencing_status` | `none`, `in_progress`, `georeferenced` (Allmaps link is spec 005) |
| `bibliography[]` | bibliography-entry IDs (typed reference) |
| `verification` | `unverified` (default), `checked_online`, `inspected` (held witnesses only); `MAP-VERIFICATION` |
| `last_verified` | ISO date `YYYY-MM-DD`; required unless `unverified`; also the existing evidence-style field name |
| `field_status` | map from a displayed field name to `recorded`, `not_applicable`, `not_yet_verified` or `unknown`; a field with a value is `recorded` and needs no entry; `MAP-FIELD-STATUS` |
| `basis` | `{ provenance, atlas_context }`, each `observed` or `inferred`; required for a held witness when the field has a value |
| `images[]` | list of **Image source** (below) |
| `physical` | optional value object for held sheets: `platemark`, `fold`, `verso`, `colour_status`, `repairs`, `watermark`, each `{ value, basis: observed \| inferred }`. Schema-only in v1 (FR-007, ADR 0002): validated, never projected or displayed |

`collection_status` from the draft FR-001 is `witness_kind` plus `repository`; there is no separate field.

### Image source (embedded in `images[]`)

| Field | Rule |
|---|---|
| `type*` | `iiif`, `deepzoom` or `static` |
| `url*` | `https` URL: the IIIF `info.json` for `iiif`, the tile descriptor for `deepzoom`, the image for `static` |
| `static_url` | the still shown before the viewer opens and on failure; required for `iiif` and `deepzoom`; `https` |
| `attribution*` | text shown with the image, naming the holder |
| `licence` | the licence line shown with the image; defaults to the record's `rights.licence` (ADR 0009) |
| `alt` | authored description; required from `publishable` (`MAP-IMAGE`) |
| `witness_kind*` | `held`, `institutional` or `unlocated`; equals the record's (`MAP-IMAGE`); an image on a `work` or `concept` record is rejected |

An image is shown only when the record's `rights.reproduction_cleared` is true. Otherwise the page shows the metadata and says the image is withheld (US1.5); this is behaviour, not a gate error.

## Cartographer record (`content/cartographer/<id>.yaml`, biography in `<id>.md`)

| Field | Rule |
|---|---|
| Entity base | as above |
| `kind*` | `person` or `workshop`; required from `ready_for_build` (`CART-KIND`) |
| `names[]` | variant names, strings |
| `roles[]` | each of `cartographer`, `engraver`, `publisher` |
| `life_dates` | existing free text for a person; a workshop uses `active` |
| `active` | EDTF interval when a workshop or publisher was active |
| `bibliography[]` | bibliography-entry IDs (typed reference) |

Workshop and publisher relations use `relations[]`.

## Derived values (never stored)

| Value | Derived from |
|---|---|
| Rooms of a map | `rooms.primary` and `rooms.secondary[]` of the public essays that list the map in `maps[]` |
| Where used | public essays (`maps[]`), public layers and overlays (`relations[]` to the map), public places (`relations[]` or `coverage[]`) |
| Maps by a cartographer | public maps whose `makers[]` include the cartographer and whose `attribution` is `exact` |
| Year interval | the EDTF `date_published` |
| Completeness and enrichment score | the displayed-field list, `field_status`, and the counts above |

## Public projection

The allowlist adds, for map: `record_scope`, `open_questions`, `witness_kind`, `title_original`, `date_published`, `publication_place`, `atlas_context`, `dimensions`, `language`, `significance`, `provenance`, `attribution`, `georeferencing_status`, `verification`, `last_verified`, `field_status`, `basis`, `images` (including `alt`), with list references `coverage`, `attribution_evidence`, `bibliography`. For cartographer: `kind`, `names`, `roles`, `life_dates`, `active`, `bibliography`. `physical` is not projected. Anything in a record that is not on the allowlist is dropped before a page or payload sees it.
