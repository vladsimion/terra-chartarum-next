# Quickstart: validating the Atlas

Prerequisites: Node 24, `npm ci`; for the site side, spec 002's shell, spec 003's essay layer lists, Playwright browsers.

```bash
npm test                                              # Vitest: layer and place schema, seven rules, time, view-url, index, rank, facets, place-index
npm run registry -- check --dir tests/atlas/fixtures/registry --out reports    # the hand-authored fixtures pass
npm run build                                         # registry gate, pages, then the Atlas build outputs (fixtures on)
npm run test:e2e                                      # year, lens, share, inspector, keyboard, no-WebGL, place search, overlay, performance
```

Fixture builds use `REGISTRY_ROOT=tests/atlas/fixtures/registry` and the generated 200-layer catalogue (`registry synth`).

Expected: the fixtures validate; the build writes `data/atlas-index.json`, `atlas-slugs.json`, `place-index.json`, one `.fgb` per public layer, facet files and one overview SVG per collection; the held fixture layer appears in none of them; opening the Atlas shows the default collection at its default year, switching lens leaves Active Layers unchanged, a copied address restores the same view, and with WebGL disabled the overview and text lists appear instead of the map.
