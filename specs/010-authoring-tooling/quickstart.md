# Quickstart: validating spec 010

How to see each story work, and which test covers each acceptance scenario (Principle X). Commands run from the repository root after `npm ci`. Contracts: [cli.md](contracts/cli.md), [editor-schemas.md](contracts/editor-schemas.md), [link-check.md](contracts/link-check.md); shapes: [data-model.md](data-model.md).

## US1 — `registry new <family>` (TCX-62)

On a scratch copy, so the real registry is untouched:

```bash
cp -r . /tmp/tc-scratch && cd /tmp/tc-scratch
npm run --silent registry -- new place "Apulum"
npm run --silent registry -- check --dir .
```

Expected: two lines (`tc:tc:place:place-NNNNNN`, `content/place/place-NNNNNN.yaml`); the file is at `proposed`/`held` with `# To complete before ready_for_build` and `# place_type:` under it; `check` reports no new error. `npm run --silent registry -- new room "x"` exits 2 and writes nothing.

| Scenario | Test |
|---|---|
| 1. one file, next counter, `proposed`/`held`, no new error | `tests/registry/integration/new-record.test.ts`, one case per scaffoldable family |
| 2. checklist matches the rules | `tests/registry/unit/checklist.test.ts` |
| 3. promoted stub fails on exactly the checklist | `tests/registry/unit/checklist.test.ts` (SC-002, both thresholds) |
| 4. `room` and unknown family refused | `tests/registry/integration/new-record.test.ts` |
| 5. rollback leaves the registry byte-for-byte as it was | `tests/registry/integration/new-record.test.ts` (a fixture rule that the stub breaks) |
| 6. R gets the same ID | `tests/registry/integration/mint-contract.test.ts` (the CLI as a child process; research R5) |
| `registry new essay` unchanged (FR-006) | the existing `new-essay` tests, unmodified |
| no rule weakened (SC-003) | `tests/registry/unit/rules-not-weakened.test.ts` |

## US2 — dependents (TCX-63)

```bash
npm run --silent registry -- deps tc:tc:cartographer:honterus
npm run --silent registry -- check --dir . --out reports && ls reports/dependents.*
```

Expected: `tc:tc:map:honterus` as a direct dependent through `makers[0]`, and whatever cites that map as indirect; `reports/dependents.json` and `reports/dependents.html` exist and are not under `dist/`.

| Scenario | Test |
|---|---|
| 1. direct and indirect, with type and path | `tests/registry/unit/dependents.test.ts` (fixture chain entry ← source ← evidence ← essay) |
| 2. held dependents listed and marked | `tests/registry/unit/dependents.test.ts` |
| 3. cycles terminate, each record once | `tests/registry/unit/dependents.test.ts` |
| 4. unknown ID fails | `tests/registry/integration/deps-cli.test.ts` |
| 5. graph and viewer written beside the report, not deployed | `tests/registry/integration/deps-cli.test.ts`, plus a check that `dist/` has no `dependents.*` |
| 6. one definition of a reference | `tests/registry/unit/dependents.test.ts`: edges equal `referenceFields` over the synthetic registry |
| answers in under 5 s (SC-004) | `tests/registry/performance.test.ts` (existing file, one more case) |

## US3 — editor schemas (TCX-61)

```bash
npm run schemas && ls .schemas/
git status --short .schemas   # nothing: ignored
```

Then open `content/place/` in VS Code with the recommended YAML extension: a misspelt `plce_type:` is underlined; `lifecycle:` offers the values with their definitions; `relations:` offers IDs with titles.

| Scenario | Test |
|---|---|
| 1. one schema per family, not committed | `tests/registry/unit/editor-schema.test.ts`; `.gitignore` check |
| 2. a vocabulary value without a definition fails | `tests/registry/unit/glossary.test.ts` (a fixture glossary missing one row) |
| 3. accepts what the gate accepts, rejects typos | `tests/registry/unit/editor-schema.test.ts` over the real registry and a seeded set (SC-005), validated with a JSON Schema validator in the test only |
| 4. ID suggestions; stale list never rejects | `tests/registry/unit/editor-schema.test.ts` |
| 5. the editor is pointed at the schemas | `tests/registry/unit/editor-schema.test.ts` reads `.vscode/settings.json` and checks a mapping for every family |

## US4 — link and manifest checker (TCX-64)

Locally, with no network and no tokens:

```bash
npx tsx scripts/link-check.ts --dir . --state /tmp/state.json --dry-run
```

Expected: the list of URLs collected, grouped by host, with the records that use each; no request made, nothing written. In CI: run the `link-check` workflow by hand once (`workflow_dispatch`) and confirm it finishes, that issues carry `linkcheck-*` labels, and that a second run opens none.

| Scenario | Test |
|---|---|
| 1. collects the four kinds of URL, rate-limits, retries | `tests/linkcheck/collect.test.ts`, `tests/linkcheck/probe.test.ts` (fake clock) |
| 2. one issue per URL, not duplicated | `tests/linkcheck/jira.test.ts` (in-memory Jira) and `tests/linkcheck/run.test.ts` (two runs) |
| 3. a dead link changes no record | `tests/linkcheck/run.test.ts`: every file under `content/` hashed before and after |
| 4. changed manifest opens a review issue | `tests/linkcheck/manifest.test.ts` (IIIF 2 and 3 fixtures) |
| 5. archived-copy pull request, never merged | `tests/linkcheck/archive.test.ts` (stub Wayback, stub GitHub) |
| 6. the build and the gate make no request (SC-008) | `tests/linkcheck/isolation.test.ts`: import graph from `src/registry/cli.ts`, `astro.config.mjs`, `src/pages/` never reaches `src/linkcheck/` |
| `archived_copy` and `archived_on` rule | `tests/registry/unit/locator-archived.test.ts` (valid and invalid fixtures), plus a named mutation |

## Whole spec

```bash
npm test && npm run typecheck && npm run registry -- check --dir . && npm run status -- --check
```

All green, gate on the real registry unchanged apart from rules this spec adds.
