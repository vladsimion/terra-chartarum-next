# Quickstart: validating the Atlas

Prerequisites: Node 24, `npm ci`; for the site side, spec 002's shell, spec 003's essay layer lists, Playwright browsers.

```bash
npm test                                              # Vitest: layer and place schema, seven rules, time, view-url, index, rank, facets, place-index
npm run registry -- check --dir tests/atlas/fixtures/registry --out reports    # the hand-authored fixtures pass
npm run build                                         # registry gate, pages, then the Atlas build outputs (fixtures on)
REGISTRY_ROOT=tests/atlas/fixtures/registry npm run build   # the Atlas fixtures through the whole build
npm run test:e2e:atlas                                # year, lens, share, inspector, keyboard, no-WebGL, place search, overlay, no outside requests (fixtures)
npm run test:e2e:atlas-perf                           # timings on a seeded 200-layer catalogue (`registry synth 200 --seed 7 --atlas`)
```

`npm run build` on its own reads the repository's own registry; the Atlas fixtures need `REGISTRY_ROOT` as shown. The browser specs need Playwright's Chromium (`npx playwright install chromium`).

Expected: the fixtures validate; the build writes `data/atlas-index.json`, `atlas-slugs.json`, `place-index.json`, one `.fgb` per public layer, facet files and one overview SVG per collection; the held fixture layer appears in none of them; opening the Atlas shows the default collection at its default year, switching lens leaves Active Layers unchanged, a copied address restores the same view, and with WebGL disabled the overview and text lists appear instead of the map.
