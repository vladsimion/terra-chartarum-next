# Quickstart: validating the essay framework

Prerequisites: Node 24, `npm ci`; for the site side, Playwright browsers (`npx playwright install`). Walked end to end on 2026-10-18 against a copy of the fixture registry.

```bash
cp -R tests/essays/fixtures/registry /tmp/essay-root                                  # a registry with the seven rooms and a map to use
npm run registry -- new essay "A Test Essay" --room map \
  --question "How did maps fix a frontier?" --author "Example Author" --dir /tmp/essay-root
                                                       # prints the new id, e.g. tc:tc:essay:essay-000004
npm run registry -- check --dir /tmp/essay-root --out /tmp/essay-reports   # passes at Concept (one RIGHTS-MISSING warning)
npm run registry -- promote <essay-id> Corpus --by "Example Author" --dir /tmp/essay-root --check
                                                       # refused: ESSAY-CORPUS, the essay names no map yet
```

Add `maps: [tc:tc:map:map-000001]` and `rights: {licence: CC BY 4.0}` to the new essay's YAML, then:

```bash
npm run registry -- promote <essay-id> Corpus --by "Example Author" --dir /tmp/essay-root   # moves one stage, appends to stage_history
npm run registry -- promote <essay-id> Outline --by "Example Author" --dir /tmp/essay-root  # refused: stages are never skipped
npm test                                                                          # Vitest: ESSAY-* rules, stages, promote, new essay, body scan, citations, components
npm run test:e2e:essays                                                           # builds the fixture registry; essay page, citations with JavaScript off, components, held essay
```

Stage names are capitalised (`Corpus`, `Design QA`, `Cross-link`) and `<essay-id>` is the full id. `PW_CHROMIUM_PATH` points Playwright at a Chromium it does not manage, for a machine its own build does not support.

Expected: the scaffolded essay validates at Concept; promoting succeeds only when the next stage's checks hold and appends to `stage_history`; promoting past a stage is refused with the reason; the held fixture essay (`essay-000003`) produces no page and none of its strings appear in the built output; the three export files exist for each public essay.
