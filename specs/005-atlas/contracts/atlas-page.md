# Contract: the Atlas page

## Regions

At wide widths: a left catalogue drawer, the map filling the rest, a right inspector drawer, a time control along the bottom and the active-layers list above the catalogue. At 360 px the map is first and the catalogue, the active layers and the inspector are bottom sheets opened by labelled buttons (FR-007). Every region is rendered as HTML by Astro, then enhanced.

- **Landing**: a short orientation, a link "New to the Atlas? Read the Handbook" (`/atlas/handbook/`), and the collection chooser. The labelled Handbook entry sits beside the layer controls; the inspector links to the Handbook topic for its layer's role and provenance (anchors, research R10).
- **Lens switch**: Themes, Collections, Rooms. Switching never changes Active Layers.
- **Search**: a text field above the catalogue, ranked as in spec US2.3. A separate place-search field recentres the map (FR-009).
- **Year-relevance toggle** ("only show layers relevant to this year"): narrows the catalogue; active out-of-range layers stay and are marked.
- **Active layers**: ordered list with a visibility toggle, an inspect button, a remove button and an "out of range" mark.
- **Inspector**: description, role, theme, temporal envelope, source, licence, methodology documentation links, related released essays, rooms, collections and facets; for an overlay also the `georef` fields and an opacity slider.
- **Copy this view**: copies the address built by `view-url.ts` and announces it.

## Keyboard (FR-008, SC-004)

Every control above is a native button, link, input or details element reachable in a logical order. Within the map, arrow keys pan and `+`/`-` zoom (MapLibre's keyboard handler), `Escape` returns focus to the last control used. The keyboard scenario switches lens, activates collection defaults, opens the inspector, applies and resets a facet, removes a layer and copies the view.

## Provenance and uncertainty styling (FR-015, SC-006)

| Geometry provenance | Line | Polygon fill | Legend text |
|---|---|---|---|
| `source_geometry`, `georeferenced_trace` | solid | solid | "Documentary geometry" |
| `scholarly_reconstruction` | dashed | diagonal hatch | "Reconstruction" |
| `generalized_editorial` | dash-dot | cross hatch | "Generalised (editorial)" |
| `modern_reference` | thin dotted, grey | none | "Present-day reference" |

A feature whose date is only possibly valid at the chosen year is drawn with reduced opacity and a small marker in the legend ("Date uncertain"); the inspector states it in words. Confidence is shown only in the inspector. The legend lists only the classes present among active layers.

## No WebGL (FR-016)

If WebGL context creation fails, MapLibre is not loaded. The page shows the collection's SVG overview, a full list of layers (with role, theme, envelope), and for each layer a feature table (name, dates, provenance) with the same year filter applied as text.

## Performance

MapLibre, the PMTiles protocol and the FlatGeobuf reader load on the Atlas page only. Layer assets are fetched on activation. The first task measures and records the compressed size; the split-load fallback is in research R7.
