# Confluence entry: Build Log (page 2490370)

Published 2026-10-19 as section Y (page version 130), directly after section X and before "2. In progress"; the header pointer "sections U, V, W and X" became "sections U to Y". The rest of the page was left unchanged (checked by reading the page back). The text below was published, and has since been corrected for #63 (a new table row and the commit `gate` was last green at); the correction is not yet published.

## Y. The successor build: the Atlas (spec 005)

Merged to `main` of [github.com/vladsimion/terra-chartarum-next](https://github.com/vladsimion/terra-chartarum-next), 18 to 19 October 2026. Jira epic TCX-6. Working detail is in the [spec 005 programme dossier](https://vladsimion.atlassian.net/wiki/spaces/~7012186ee7d7085f34fff9bc2bf8fbe8de309/pages/38469633).

| PR | Scope | Jira |
|---|---|---|
| #50 | Setup and Foundation: layer and place schema, seven registry rules (`LAYER-THEME`, `LAYER-TIME`, `LAYER-FACET`, `LAYER-GEOREF`, `LAYER-ASSET-SIZE`, `PLACE-NAMES`, `PLACE-LOCATION`) with a named mutation each, the public allowlist, fixtures and a seeded 200-layer generator; spec 001's data model and rule table amended (T001 to T020) | TCX-33 |
| #51 | US1: time, provenance style and view state as pure modules; the Atlas build (FlatGeobuf per public layer with year bounds, catalogue index, held-name leak scan); the page, the year control, the legend and the map (MapLibre served unbundled, loaded when the first layer is added) | TCX-33 |
| #52 | US2: discover layers by theme, collection and room; search; collection defaults; the year-relevance toggle | TCX-34 |
| #53 | US3: the inspector (provenance in words, source, licence, essays, rooms) and per-layer facets | TCX-35 |
| #54 | The Natural Earth 50 m country outlines as a self-hosted FlatGeobuf basemap (T028, research R11) | TCX-33 |
| #55 | US4: share an exact view; the address is the only saved state and carries public slugs only | TCX-36 |
| #56 | US7: find a place by name (historic or modern, prefix) with a labelled marker | TCX-49 |
| #57 | US5: the Atlas Handbook, five draft skeleton topics with stable anchors, linked from the landing, the controls, the inspector, the home page and the footer | TCX-37 |
| #58 | US6: georeferenced map overlays with an opacity control and the `georef` quality fields, drawn by `@allmaps/maplibre` 1.0.0-beta.44 (its published import repaired by a build plugin) | TCX-38 |
| #59 | Cross-cutting checks: the build-written SVG overview per collection and the no-WebGL fallback (a table of features per layer; MapLibre never loaded), the keyboard scenario, no outside requests, the leak mutations; the page starts MapLibre and the layers named in the address beside the data (T059 to T061, T063, T064). Two gate failures on the way, both mine and fixed: the FlatGeobuf reader had entered the page's first-load script (133 KB against 100 KB), and its on-demand chunk was not on the static-output allowlist | TCX-33 |
| #60 | The performance check on a seeded 200-layer catalogue (emulated phone, CI step); the basemap simplified (488 KB to 203 KB); the map-interactive budget for this profile set at 4.5 s (ADR 0004 amended) (T062) | TCX-33 |
| #61 | Polish: README and quickstart, code-review fixes (place search without WebGL describes the place in words; the leak scan covers held records' retired slugs; one reader for the year-bound columns) (T065, T066, T068, T069) | TCX-6 |
| #62 | A Hide / Show toggle for each active layer, kept in the address as `hide`; the contract no longer asks `Escape` to return focus | TCX-33 |
| #63 | Wrap-up: the landing page's collection links written with `viewUrl`; a browser spec that browsing the catalogue fetches no layer file; T067 closed; the Confluence drafts brought in step with `main` | TCX-33 |

State on `main`: `gate` green at `a4077b9`; see the dossier; the stories are In Review, not Done; the epic TCX-6 and TCX-33 (which holds the cross-cutting checks) are In Progress. Not verified locally: Firefox, WebKit and Lighthouse (CI runs them).
