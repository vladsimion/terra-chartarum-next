# Quickstart: validating the registry

Prerequisites: Node 24 (`.nvmrc`), then `npm ci`.

## 1. Run the whole suite
```bash
npm test                    # Vitest: unit, integration, mutations, timing
npm run typecheck           # tsc --noEmit, strict
```
Expected: all green. `tests/registry/mutations.test.ts` lists each named mutation with the rule ID it must trigger ([rule-ids.md](./contracts/rule-ids.md)).

## 2. Check a registry
```bash
npm run registry -- check --dir tests/registry/fixtures/valid --out reports
echo $?                     # 0
npm run registry -- check --dir tests/registry/fixtures/invalid/duplicate-id --out reports
echo $?                     # 1, ID-DUPLICATE naming both files
```
Open `reports/integrity-report.html` or read `reports/integrity-report.json` ([schema](./contracts/integrity-report.schema.json)).

## 3. US1 — rename keeps the ID
Run `npx vitest run tests/registry/integration/rename.test.ts`: it renames every fixture's title and slug, rebuilds and asserts zero ID changes and a redirect per former slug (SC-002).

## 4. Mint an ID
```bash
npm run registry -- mint place    # prints e.g. place-000124
```

## 5. Timing (SC-004)
```bash
npx vitest run tests/registry/performance.test.ts   # 5,000 synthetic entities, < 60 s
```

## 6. Leak scan (FR-009)
After a site build (spec 002 onward): `npm run registry -- scan dist`. Exit `1` and `PRIV-LEAK` if any private value or held ID appears in the output.

Contracts: [CLI](./contracts/cli.md) · [module API](./contracts/module-api.md). Data shapes: [data-model.md](./data-model.md).
