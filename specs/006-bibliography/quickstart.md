# Quickstart: validating the bibliography

Prerequisites: Node 24, `npm ci`; for the site side, spec 002's shell, spec 003's citation generator, Playwright browsers.

```bash
npm test                                              # Vitest: schema, four rules, cited-in, entry-public, index, match, cite-inputs, import
npm run registry -- check --dir tests/bibliography/fixtures/registry --out reports      # the hand-authored fixtures pass
npm run registry -- import-bib tests/bibliography/fixtures/import/sample.bib --dir <root> --dry-run
BUILD_DATE=2026-10-17 npm run build                   # index, entry pages, export files (fixtures on)
npm run test:e2e                                      # filters with and without JavaScript, entry pages, axe
```

Fixture builds use `REGISTRY_ROOT=tests/bibliography/fixtures/registry` and the generated 1,000-entry bibliography (`registry synth`).

Expected: the fixtures validate; the build writes `data/bibliography-index.json`, one page and three export files per public entry, and dataset and layer exports; the entry cited only by the held essay and the uncited entry appear in none of them; importing the same sample twice creates nothing the second time; every export parses.
