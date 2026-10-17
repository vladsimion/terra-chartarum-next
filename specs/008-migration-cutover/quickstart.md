# Quickstart: validating the migration

Prerequisites: Node 24, `npm ci`; a checkout of the legacy repository for the real run (`git clone https://github.com/vladsimion/terra-chartarum <dir>`, then check out the commit to pin).

```bash
npm test                                              # Vitest: extraction, adapters, determinism, no-overwrite, inventory, rule file, cutover check
npm run registry -- import-legacy --snapshot tests/migration/fixtures/snapshot --profile v1 --out /tmp/stage     # the trimmed fixture
npm run registry -- import-legacy --snapshot tests/migration/fixtures/snapshot --profile v1 --out /tmp/stage --apply --dir <root>
npm run registry -- inventory --snapshot tests/migration/fixtures/snapshot --dir <root>
npm run registry -- archive-redirects --dir <root>
npm run cutover:check                                 # automated checklist over the production build
```

The real run (by the editor): clone and pin the legacy repository, run `import-legacy` to staging, read `import-report.json`, then `--apply` into the working tree and commit; build the inventory and the rule file; follow `docs/cutover.md`.

Expected on the fixture: the staging tree holds one held record per fixture item with the legacy ID and slug; the report lists the dropped private field, the report-only keys and the lossy year conversion; running the import twice gives byte-identical staging output and an empty `--apply`; editing an applied record and re-running leaves it untouched and lists a changed upstream value; the inventory gives each fixture route one outcome; the rule file has one rule per moved route; `cutover:check` fails on each broken fixture and passes on the clean one.
