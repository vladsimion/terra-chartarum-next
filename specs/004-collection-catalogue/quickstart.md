# Quickstart: validating the collection catalogue

Prerequisites: Node 24, `npm ci`; for the site side, spec 002's shell, spec 003's citation generator and Playwright browsers.

```bash
npm test                                              # Vitest: map and cartographer schema, ten rules, view-model, filter, index, where-used, enrichment
npm run registry -- check --dir tests/collection/fixtures/registry --out reports   # the hand-authored fixtures pass
npm run registry -- completeness --dir tests/collection/fixtures/registry --out reports   # completeness.json and the enrichment queue
npm run build                                         # collection list, record pages, cartographer pages, /data/collection-index.json (fixtures on)
npm run test:e2e                                      # viewer, filters with and without JavaScript, shared address, axe
```

Expected: the fixtures validate; the completeness report lists each gap and ranks the queue; the built list shows every public map and no held record; opening the viewer loads OpenSeadragon only then; a record with uncleared rights shows its metadata and no image; a held essay, a held maker and a private field name appear nowhere in the output.
