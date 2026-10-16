# Quickstart: validating the registry

Prerequisites: Node 24 (`.nvmrc`), then `npm ci`.

## 1. Run the whole suite
```bash
npm test                    # Vitest: unit, integration, mutations, timing
npm run typecheck           # tsc --noEmit, strict
```
Expected: all green. `tests/registry/mutations.test.ts` runs every named mutation and requires it to trigger its rule as an error ([rule-ids.md](./contracts/rule-ids.md)); `tests/registry/unit/rule-coverage.test.ts` keeps the rule table, the registered rules and the mutations in step.

## 2. Check a registry
`--dir` is the registry root, the directory that contains `content/` (default `.`).
```bash
npm run registry -- check --dir tests/registry/fixtures/valid --out reports
# registry check: PASS - 18 entities, 0 errors, 0 warnings        (exit 0)
npm run registry -- check --dir tests/registry/fixtures/invalid/duplicate-id --out reports
# registry check: FAIL ... ID-DUPLICATE naming both files          (exit 1)
```
Open `reports/integrity-report.html` or read `reports/integrity-report.json` ([schema](./contracts/integrity-report.schema.json)). Exit codes: `0` no errors (warnings allowed), `1` errors found, `2` tool failure.

## 3. US1: rename keeps the ID
```bash
npx vitest run tests/registry/integration/rename.test.ts
```
It renames every fixture record's title and slug, re-validates, and asserts zero ID changes, no new violations and one redirect per former slug (SC-002).

## 4. Mint an ID
```bash
npm run registry -- mint place            # prints e.g. place-000124
```
The number is the highest across the working tree and `main`, plus one. Two branches that mint the same number are caught by `ID-DUPLICATE`; the later branch re-mints before merge.

## 5. Generate a synthetic registry and time the gate (SC-004)
```bash
npm run registry -- synth 5000 --seed 1 --out /tmp/synth       # 5,000 entities plus the seven rooms
time npm run registry -- check --dir /tmp/synth --out /tmp/synth-reports
npx vitest run tests/registry/performance.test.ts               # asserts < 60 s; measured ~80 ms in memory, ~2 s from disk
```

## 6. Leak scan (FR-009)
After a site build (spec 002 onward):
```bash
npm run registry -- scan dist           # exit 1 and PRIV-LEAK if any private value or non-public id is in the output
```
Private values are never printed in the result.

Contracts: [CLI](./contracts/cli.md) · [module API](./contracts/module-api.md). Data shapes: [data-model.md](./data-model.md).
