# Quickstart: validating the collection catalogue

Prerequisites: Node 24, `npm ci`; for the site side, Playwright browsers (`npx playwright install`). Walked end to end on 2026-10-18 against the fixture registry.

```bash
npm test                                                    # Vitest: map and cartographer schema, ten rules, view-model, filter, index, where-used, cartographer view, enrichment, and the built-output tests (the collection fixtures are built once for the run)
npm run registry -- check --dir tests/collection/fixtures/registry --out reports          # the hand-authored fixtures pass (one warning: the held map with dealer-only support)
npm run registry -- completeness --dir tests/collection/fixtures/registry --out reports   # completeness.json, enrichment-queue.json and .md
REGISTRY_ROOT=tests/collection/fixtures/registry npm run build   # list, record pages, cartographer pages, /data/collection-index.json
npm run test:e2e:collection                                 # viewer, filters with and without JavaScript, shared address, axe (builds the fixtures itself)
```

`REGISTRY_ROOT` matters: without it `npm run build` reads the repository's own (still empty) `content/` and builds no record, list entry or profile. `npm run test:e2e` runs the shell's specs on the shell fixtures, not these; `PW_CHROMIUM_PATH` points Playwright at a Chromium it does not manage.

Expected: the fixtures validate; the completeness report lists each gap and ranks the queue (maps cited by essays, with gaps, and referred to by layers and places first); the built list shows every public map and no held record; opening the viewer loads OpenSeadragon only then; a record with uncleared rights shows its metadata and no image; a held essay, a held cartographer, a held layer or place, its biography and a private field name appear nowhere in the output, and neither do the completeness files.
