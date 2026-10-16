# Implementation Plan: Scholarly Entity Registry & Integrity Gate

**Branch**: `001-scholarly-registry` | **Date**: 2026-10-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-scholarly-registry/spec.md`. Decisions: ADR 0006 (identity and record model), ADR 0003 (shared contracts), ADR 0005 (stack).

## Summary

A framework-free TypeScript module, `src/registry/`, that loads canonical entity files, validates each record with Zod, validates the linked graph with a pure `validateRegistry(records)` function, and emits a versioned integrity report. A thin CLI (`registry check | mint | report`) wraps it. The same module projects public records from a per-family allowlist, derives reverse relationships and redirects, and scans built output for private or held data. It is the first code in the repo, so this plan also fixes the initial scaffold (package, strict TypeScript, Vitest). Astro arrives with spec 002 and wraps the same Zod schemas in its content collections.

## Technical Context

**Language/Version**: TypeScript (strict), Node 24 (the version in use on the maintainer's machine; recorded in `.nvmrc`).

**Primary Dependencies**: `zod` (schemas), `yaml` (record parsing), `tsx` (run the CLI). No framework. Versions are the latest stable at implementation time, pinned by the lockfile.

**Storage**: Files in the repository. One YAML file per entity at `content/<family>/<local-id>.yaml` (essays also carry an `.mdx` body, spec 003). Provenance logs under `provenance/`. No database (Constitution VII).

**Testing**: Vitest. Unit tests on `validateRegistry` with in-memory records; integration tests on fixture directories through `loadRegistry`; CLI tests for exit codes and report files; a named-mutation suite; a timed performance test. R data-prep code (later specs) uses `testthat` against the same fixtures.

**Target Platform**: Build time and CI only (GitHub Actions on Node 24). No runtime or browser code.

**Project Type**: Library plus CLI inside a single-project repository.

**Performance Goals**: Gate completes in under 60 seconds on a 5,000-entity synthetic registry (SC-004).

**Constraints**: Deterministic and offline (no network in the gate); read-only on content except `mint`; public output is allowlist-projected; strict TypeScript; no `any` at module boundaries.

**Scale/Scope**: ≈ 60 maps today, a 5,000-entity ceiling by design; 15 families; 44 rules (see [contracts/rule-ids.md](./contracts/rule-ids.md)).

## Constitution Check

*GATE: passes before Phase 0 and again after Phase 1 design.*

- [x] **Historical question (I)**: "How can every claim on the site be traced to the evidence that supports it, at the level of detail the evidence allows?" (spec header).
- [x] **No duplicated canonical records or private geometry (II, V)**: one file per entity, filename = local-id; evidence records are referenced by ID, never embedded; geometry is referenced by path.
- [x] **Uncertainty and provenance as fields (III, VI)**: confidence, date precision, geometry provenance, silence state, locator verification and reconstruction state are Zod enums, not prose ([data-model.md](./data-model.md)).
- [x] **Bespoke interactions (IV)**: none. The only reader-visible output is the HTML integrity report, an author tool whose evidentiary purpose is stated in US3.
- [x] **No dynamic infrastructure (VII)**: build-time files only; no database, server or runtime API.
- [x] **Accessibility and performance impact (IX)**: no reader-facing runtime; zero JS added to pages. The HTML report is semantic HTML with no colour-only severity and is checked with axe in its own test. The only performance contract is SC-004.
- [x] **Test strategy (X)**: every acceptance scenario maps to a named test (table below).

**Result**: no violations; Complexity Tracking is empty.

### Acceptance-scenario → test map

| Story | Scenarios | Test file (`tests/registry/`) |
|---|---|---|
| US1 stable identity | 1–4 | `unit/ids.test.ts`, `unit/duplicates.test.ts`, `integration/rename.test.ts`, `unit/mint.test.ts` |
| US3 linked graph | 1–3 | `unit/references.test.ts`, `unit/collections.test.ts`, `integration/report.test.ts` |
| US2 evidence | 1–5 | `unit/provenance.test.ts`, `unit/locators.test.ts`, `unit/silence.test.ts`, `unit/rights.test.ts` |
| US5 lifecycle and release | 1–5 + spec scenarios | `unit/lifecycle.test.ts`, `unit/release.test.ts`, `unit/strictness.test.ts`, `integration/projection.test.ts` |
| US4 reverse relationships | independent test | `unit/reverse.test.ts` |
| FR-008 | — | `unit/automated.test.ts` |
| FR-009 | — | `integration/leak-scan.test.ts` |
| FR-013 | — | `unit/redirects.test.ts` |
| FR-014 | — | `unit/import-mapping.test.ts` |
| SC-002 | — | `integration/rename.test.ts` (all fixtures) |
| SC-003 | — | `mutations.test.ts` |
| SC-004 | — | `performance.test.ts` |

Slice order (tdd, one vertical slice at a time): **US1 → US3 → US2 → US5 → US4**. FR-008, 009, 013 and 014 are delivered inside the slice that first needs them (013 in US1, 014 in US2, 008 in US2, 009 in US5).

## Project Structure

### Documentation (this feature)

```text
specs/001-scholarly-registry/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── cli.md
│   ├── integrity-report.schema.json
│   ├── rule-ids.md
│   └── module-api.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
package.json  tsconfig.json  vitest.config.ts  .nvmrc
content/                     # canonical records, one file per entity
└── <family>/<local-id>.yaml
provenance/                  # raw extractions + transformation logs (FR-008)
src/registry/
├── families.ts              # closed family list, authority allowlist
├── ids.ts                   # parse / format / validate stable IDs
├── schemas/                 # Zod: shared enums, per-family record schemas
├── load.ts                  # loadRegistry(dir)
├── validate.ts              # validateRegistry(records) + rules/
├── rules/                   # one module per rule group
├── report.ts                # report model, JSON + HTML rendering
├── mint.ts                  # next local-id
├── redirects.ts             # slug history → _redirects, withdrawn pages
├── project.ts               # allowlist projection, reverse relationships
├── leak-scan.ts             # post-build scan of dist/
└── cli.ts
scripts/generate-synthetic-registry.ts
tests/registry/
├── unit/  integration/  mutations.test.ts  performance.test.ts
└── fixtures/{valid,invalid}/
```

**Structure Decision**: single project, library plus CLI. The module is framework-free so spec 002's Astro content collections import its Zod schemas and the gate runs without Astro. Content lives at `content/`, outside `src/`, so R pipelines and Astro both target a stable path.

## Complexity Tracking

No violations to justify.
