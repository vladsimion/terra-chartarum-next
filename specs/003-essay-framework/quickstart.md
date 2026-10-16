# Quickstart: validating the essay framework

Prerequisites: Node 24, `npm ci`; for the site side, spec 002's shell and Playwright browsers.

```bash
npm test                                              # Vitest: ESSAY-* rules, stages, promote, new essay, body scan, citations
npm run registry -- new essay "A Test Essay" --room map \
  --question "How did maps fix a frontier?" --author "Example Author" --dir <root>
npm run registry -- check --dir <root> --out reports  # the new essay passes at Concept
npm run registry -- promote <essay-id> corpus --by "Example Author" --dir <root> --check
npm run registry -- promote <essay-id> outline --by "Example Author" --dir <root>   # refused: skips Research
npm run build                                         # the fixture essay page, with SHELL_FIXTURES=1 and the essay fixtures on
npm run test:e2e                                      # essay page, citations with JavaScript off, held essay, exports
```

Expected: the scaffolded essay validates at Concept; promoting to the next stage succeeds only when that stage's checks hold and appends to `stage_history`; promoting past a stage is refused with the rule named; a held fixture essay produces no page and none of its strings appear in the output; the three export files exist for each public essay.
