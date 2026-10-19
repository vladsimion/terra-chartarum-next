# Quickstart: validating the bibliography

Prerequisites: Node 24, `npm ci`; for the site side, spec 002's shell, spec 003's citation generator, Playwright's Chromium (`npx playwright install chromium`).

```bash
npm test                                                                                # Vitest: schema, four rules, cited-in, entry-public, index, match, cite-inputs, import, leak
npm run registry -- check --dir tests/bibliography/fixtures/registry --out reports      # the hand-authored fixtures pass the gate
cp -R tests/bibliography/fixtures/registry /tmp/bib && npm run registry -- import-bib tests/bibliography/fixtures/import/sample.bib --dir /tmp/bib --dry-run   # what an import would do, on a copy
REGISTRY_ROOT=tests/bibliography/fixtures/registry BUILD_DATE=2026-10-17 ASTRO_OUT_DIR=/tmp/bibdist npm run build   # index, entry pages, export files
npm run registry -- scan /tmp/bibdist --dir tests/bibliography/fixtures/registry        # the output leaks nothing
npm run test:e2e:bibliography                                                            # filters with and without JavaScript, entry pages, axe
npm run registry -- synth 1000 --bibliography --seed 1 --out /tmp/bib1000               # the 1,000-entry set (SC-005)
```

`REGISTRY_ROOT` points the site build at the fixtures; without it the build reads the repository's own registry. `BUILD_DATE` fixes the access date of every citation (otherwise `SOURCE_DATE_EPOCH`, then today in UTC), so the same build is the same bytes.

Expected:
- The fixtures validate (39 entities, no errors, no warnings); the 1,000-entry set validates too.
- The build writes `data/bibliography-index.json`, one page and three export files (`cite.bib`, `cite.ris`, `cite.json`) per public entry, dataset and layer exports under `data/cite/` and the site's own.
- The entry cited only by the held essay, the held entry and the uncited entries have no page and appear in no file, including `data/relations.json`.
- The dry run reports one work to create and two it already has, and writes nothing; importing the same file for real and then again creates nothing the second time.
- Every export parses with its own format's parser.
