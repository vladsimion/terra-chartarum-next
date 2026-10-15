# Quickstart: validating the registry feature

Proves spec 001 end to end. Contracts: `contracts/`; field rules: `data-model.md`.

## Prerequisites
- Node (version pinned in `.nvmrc`), `npm ci`
- Fixtures under `tests/registry/fixtures/`

## 1. Gate passes on a clean registry (US3-AS3)
```
npm run registry:check -- --data tests/registry/fixtures/valid
```
Expect exit 0 and `reports/integrity-report.json` with `"status": "pass"`.

## 2. Each rule fires (US1-AS3/AS4, US2, US3-AS1/AS2)
```
npm test -- registry
```
Each fixture in `tests/registry/fixtures/invalid/<CODE>/` must produce exactly its violation code, naming the file(s). Expect all green.

## 3. Renames never move identity (US1-AS2, SC-002)
Run the rename regression test: it rewrites every title and slug in a fixture copy and asserts that IDs, references and resolved links are unchanged and that redirects exist for every old slug.

## 4. Held content stays private (US4, FR-009)
Build the fixture site and run the leak scan: zero occurrences of held titles or `private:` values in `dist/`; `relations.json` lists only released sources.

## 5. Scale (SC-003, SC-004)
```
npm run test:bench -- registry
```
The 5,000-entity synthetic registry validates in under 60 s; seeded mutations are detected 100% of the time.

## 6. Build integration (SC-001)
Introduce a broken reference in `data/registry/` and run `npm run build`. It must fail before any page is generated, pointing to the report.
