# Research: Historical Atlas

Decisions not already settled by the grill (ADR 0013), ADR 0004 or ADR 0005.

## R1. Time filtering inside the map
- **Decision**: at build time each feature gets four numeric properties from its EDTF dates: `_from_min`, `_from_max`, `_to_min`, `_to_max` (the earliest and latest the start can mean, the earliest and latest the end can mean; an open-ended or undated feature takes the layer envelope). In the browser a MapLibre filter expression selects `_from_min ≤ year ≤ _to_max` (possible) and a `case` expression styles `_from_max ≤ year ≤ _to_min` as certain and the rest as "date uncertain". The pure `time.ts` computes the same values and is the tested rule; the map applies it by expression, not per-feature JavaScript.
- **Uncertain endpoints (T022)**: a `?`, `~` or `%` on an endpoint does not widen the bounds, because no width is known. The build adds `_from_unc` and `_to_unc` (0 or 1), and the year on the boundary of such an endpoint is "possible" rather than "certain".
- **Rationale**: a numeric expression runs on the GPU path and meets the INP budget on a 200-layer catalogue; the pure module is the single definition both the build and the tests use (ADR 0007: uncertainty travels in the value).
- **Alternatives**: filtering features in JavaScript on every year change (slow on dense layers); storing a precision field (ADR 0007 forbids authored precision).

## R2. Default year
- **Decision**: with no `y` in the address, the year is the midpoint of the default collection's combined envelope; failing that, the midpoint of all public layers' envelopes; failing that, 1000. `y` is a signed integer (negative for BCE).
- **Rationale**: opening on a year inside the anchor collection (Roman Dacia, 106 to 271 CE) shows something at once; a fixed year would often show nothing.
- **Alternatives**: always the current year (shows only present-day reference); last year used (needs `localStorage`, ruled out).

## R3. Source and asset formats
- **Decision**: GeoJSON (`.geojson`) and pre-tiled PMTiles (`.pmtiles`) are the accepted sources. The build converts GeoJSON to FlatGeobuf with the `flatgeobuf` library and copies PMTiles unchanged after checking the header. GeoPackage and in-build tiling are deferred; an editor tiles a dense layer offline with pinned tippecanoe and commits the `.pmtiles` (ADR 0005 §2), recording the command in the layer's documentation.
- **Rationale**: the v1 layers are small vector data; avoiding a native tiling dependency in CI keeps the build deterministic and fast; the size gate catches the day a layer outgrows it.
- **Host limit (T003, confirmed 2026-10-18)**: Cloudflare documents an individual static asset limit of 25 MiB (26,214,400 bytes) on both Workers plans, and 20,000 files per Worker version on the free plan (100,000 on paid): https://developers.cloudflare.com/workers/platform/limits/#static-assets. `LAYER-ASSET-SIZE` and `ATLAS-ASSET-SIZE` use the constant `STATIC_ASSET_LIMIT_BYTES = 25 * 1024 * 1024`.
- **Alternatives**: tippecanoe in CI (an install step and version drift for no v1 need); GeoPackage via GDAL (heavy).

## R4. Why FlatGeobuf is fetched whole in v1
- **Decision**: the browser fetches a layer's `.fgb` in full on activation and deserialises it to a GeoJSON source. HTTP range requests with a bounding box are kept in the format choice but not used until a layer is large enough to need them.
- **Rationale**: the anchor layers are well under a megabyte; whole-file fetch is simpler to test and cache; the format leaves the door open.
- **Alternatives**: bbox range requests now (more code, no gain at this size).

## R5. Place index
- **Decision**: `place-index.json` holds, per public place, its id, slug, display name, `location` and every name normalised (lower case, diacritics folded, whitespace collapsed). Search is exact or prefix match on the normalised form; exact matches rank first, then by name kind (historic names whose validity includes the chosen year first), then by title.
- **Rationale**: the spec asks for exact and prefix match only; the year-aware tie-break costs nothing and makes a name valid at the chosen year win.
- **Alternatives**: a fuzzy library (deferred by ADR 0004).

## R6. SVG overview without a browser
- **Decision**: `overview-svg.ts` projects each default layer's GeoJSON with an equirectangular projection fitted to the combined bounds and writes paths with the same pattern conventions as the map (solid, dashed, dash-dot, dotted). It draws no basemap beyond a coastline simplified from the same Natural Earth source.
- **Rationale**: pure JavaScript, deterministic, no headless GL; enough for the "static map plus text" fallback ADR 0004 asks for.
- **Alternatives**: a pre-rendered PNG via headless Chromium (a browser in the build); no image (ADR 0004 asks for a static map).

## R7. Budget measurement before design
- **Decision**: T004 builds a minimal page with MapLibre, the PMTiles protocol and the FlatGeobuf reader and records their compressed sizes. If the total is over 350 KB with the app code estimated at 80 KB, the map module loads after the catalogue is interactive and the Lighthouse script-size assertion for `/atlas/` applies to the initial load only.
- **Measured (T004, 2026-10-18)**: a minimal page bundled with esbuild (minified, ES modules, gzip -9) with `maplibre-gl@6.11.2`, `pmtiles@4.5.0` and `flatgeobuf@4.5.0`: MapLibre alone 275 KB, the PMTiles protocol 7 KB, the FlatGeobuf reader 19 KB; the three together 296 KB (a further 5 KB of lazily loaded chunks). MapLibre's own stylesheet adds 10 KB. With the 80 KB estimate for the app code the total is about 376 KB, over the 350 KB budget.
- **Choice**: the Atlas page loads the catalogue, drawers and controls first (16 KB compressed, well under the budget), and imports MapLibre when the first layer is added to the map (or the page opens with layers in its address): a reader who has not added a layer has no map to draw, and Lighthouse's script total then measures the page as it first loads. MapLibre is served as it ships from `vendor/maplibre/` (worker, shared code and stylesheet beside it), not bundled: its worker finds the shared code by a path next to the main file, and a bundler that hashes and splits the files breaks that (found in the browser: "Worker failed to load"). The browser fetches the shared code once for page and worker. The Lighthouse script-size assertion for `/atlas/` therefore covers the initial load, and `performance.spec.ts` (T062) measures the map-interactive time of 4 s including the deferred load. Revisit if a later MapLibre release is smaller.
- **Rationale**: the budget is the riskiest number in the spec; measure first (ADR 0004: ≤ 350 KB, map interactive ≤ 4 s).
- **Alternatives**: assume it fits (it may not).

## R8. Measuring "map interactive"
- **Decision**: interactive means the MapLibre `idle` event after the basemap and the default layers have rendered. Playwright records the time from navigation start on an emulated mid-range phone (CPU slowdown 4, "Fast 3G"-class throttling) and fails the CI run over 4 s. Lighthouse covers the script size, LCP, CLS and accessibility.
- **Rationale**: Lighthouse cannot see the map; `idle` is the library's own readiness signal.
- **Alternatives**: first contentful paint (says nothing about the map); a manual check.

## R9. Overlay rendering
- **Decision**: `@allmaps/maplibre` renders a `map-overlay` layer from the Allmaps georeferencing annotation named in `georef.annotation` and the IIIF image of the referenced map record (spec 004); opacity is set through the plugin. Quality fields come from `georef`, not from the annotation, so the inspector works without loading the image.
- **Rationale**: ADR 0005 names Allmaps; the record stays the source of truth for what the reader is told.
- **As built**: `@allmaps/maplibre` is a pre-release (`1.0.0-beta.44`, exact), loaded as its own chunk only when an overlay is added, so a reader with none pays nothing. Its published build imports MapLibre's event class from a file that is not in the package; a small build plugin (`src/atlas/build/allmaps-vite.ts`) points that import at the MapLibre the Atlas already serves, so there is one copy of MapLibre and the plugin's events are its events. The overlay sits under the Atlas's own layers. Opacity (0 to 1, 0.7 at first) is kept per overlay in the page, not in the shared address. CI uses an annotation with no items, so it proves the control and the wiring, not what a real annotation warps; that needs a IIIF image and belongs with the real layers (spec 008).
- **Alternatives**: warping tiles at build time (heavy, and loses editability).

## R10. Handbook anchors
- **Decision**: each Handbook entry is `src/content/handbook/<slug>.md` with a frontmatter `anchors` list; headings render with stable ids, and the inspector, landing and controls link to `/atlas/handbook/<slug>/#<anchor>`. A test checks every link in the Atlas resolves to an existing entry and anchor.
- **Rationale**: contextual deep links rot silently otherwise.
- **Alternatives**: free-form links (unchecked).

## R11. Basemap in v1 (decided with Vlad, 2026-10-18)
- **Decision**: the basemap is Natural Earth's 50 m admin-0 country outlines (public domain, tag v5.1.2) trimmed to the Atlas region and committed as `data/basemap/countries.fgb` (488 KB), built by `scripts/build-basemap.ts`; the Atlas build copies it to `data/basemap.fgb` and the map draws it first, as present-day reference (thin dotted grey over a plain land fill). It is a FlatGeobuf, not PMTiles.
- **Rationale**: FR-017 asks for self-hosted Natural Earth with no third-party tile service. PMTiles needs a tiling tool (tippecanoe) that is not part of the build (R3), and the region's country outlines are small enough to fetch whole (R4). The format can change when a tiling step exists.
- **Limits**: country outlines only: no relief, rivers, coastline detail beyond the 50 m generalisation, or labels (labels need glyph fonts, which are not self-hosted yet). The map says what the outlines are in a note under it.
- **Alternatives**: a PMTiles basemap from a supplier (Vlad can still supply one; the build would copy it); no basemap.
