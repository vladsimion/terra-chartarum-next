# Implementation Plan: Scholarly Entity Registry & Integrity Gate

**Branch**: `001-scholarly-registry` | **Date**: 2026-10-15 | **Spec**: [spec.md](spec.md) | **Jira**: TCX-2

**Input**: Feature specification from `/specs/001-scholarly-registry/spec.md`

## Summary

Every scholarly entity becomes one YAML record with an immutable local ID, validated by a single Zod schema set. A pure TypeScript integrity gate (`validateRegistry`) checks the whole registry as one linked graph and emits a JSON + Markdown report. It runs as a CLI in CI, as a pre-generation hook in the Astro build, and against R pipeline outputs. The same core derives the public projection (private data stripped, held content excluded), the reverse-relations index and slug redirects. Design decisions are in [research.md](research.md); fields and rules in [data-model.md](data-model.md).

## Technical Context

**Language/Version**: TypeScript (strict), Node LTS pinned in `.nvmrc`

**Primary Dependencies**: Astro (content collections), Zod v4, a YAML parser (`yaml`), an EDTF parser; no runtime dependencies in the browser for this feature

**Storage**: Files in Git: `data/registry/<family>/*.yaml`, `data/vocab-mappings/*.yaml`

**Testing**: Vitest (unit, contract and mutation tests; benchmark); fixtures in `tests/registry/fixtures/`

**Target Platform**: Build time (Node) in CI and locally; output is static files

**Project Type**: Static web publication (single Astro project) with build-time data tooling

**Performance Goals**: Integrity gate < 60 s on a 5,000-entity fixture in CI (SC-004); target < 10 s locally

**Constraints**: Deterministic output; no network access during validation; no private data in any public artifact; adds 0 KB of client JS (ADR 0004 budgets unaffected)

**Scale/Scope**: About 60 maps plus related places, sources and layers at migration; designed for 5,000+ entities and 14 families

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design: still passes.*

| Principle | Status | How this plan satisfies it |
|---|---|---|
| I. History First | ✅ | Spec names its question: tracing every claim to its evidence |
| II / V. One canonical home | ✅ | One record per entity; refs only by ID; duplicate and unknown refs fail (ID_DUPLICATE, REF_UNKNOWN) |
| III. Uncertainty is data | ✅ | Evidence object: precision, provenance, confidence, silence states as enums |
| IV. Evidence before interaction | ✅ n/a | No reader-facing interaction in this feature |
| VI. Verified provenance | ✅ | Locator verification fields enforced; secure-on-pending fails; extraction adjudication gate; finding aids rejected |
| VII. Static first | ✅ | Files in Git, build-time validation, static outputs; no database |
| VIII. One publication | ✅ n/a | No UI |
| IX. Accessible & performant | ✅ | Zero client JS; gate time budget SC-004 |
| X. Test-first | ✅ | Every acceptance scenario mapped to tests below; R outputs validated by the same CLI |
| Technical Constraints | ✅ | Zod/TS/Astro per ADR 0005; shared vocabularies from ADR 0003 |

No violations: Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/001-scholarly-registry/
├── plan.md            # this file
├── research.md        # decisions R1–R12
├── data-model.md      # fields, vocabularies, state transitions, violation codes
├── quickstart.md      # end-to-end validation guide
├── contracts/
│   ├── record-file.md                 # authoring format
│   ├── integrity-report.schema.json   # gate output
│   └── relations-and-cli.md           # relations index, CLI, redirects
└── tasks.md           # produced by /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── registry/
│   ├── vocab.ts          # shared enums from ADR 0003 (single definition)
│   ├── ids.ts            # parse/format/qualify IDs and refs
│   ├── schemas/          # Zod: envelope, evidence, rights, extraction, one file per family
│   ├── lifecycle.ts      # essay stage → lifecycle mapping; transition rules
│   ├── load.ts           # read YAML records + vocab mappings from a directory
│   ├── integrity.ts      # validateRegistry(records, assets?) → IntegrityReport
│   ├── relations.ts      # buildRelations(records, { releasedOnly })
│   ├── public.ts         # toPublic(entity): strips private, rejects held
│   ├── redirects.ts      # redirectsFor(records)
│   └── report.ts         # JSON + Markdown report writers
├── integrations/
│   └── registry-gate.ts  # Astro integration: run gate before page generation
└── content.config.ts     # content collections bound to registry schemas

scripts/
├── registry-check.ts     # CLI (contracts/relations-and-cli.md)
└── gen-synthetic-registry.ts  # deterministic 5,000-entity fixture

data/
├── registry/<family>/    # canonical records (empty until spec 008 import)
└── vocab-mappings/       # cnd.yaml, vmn.yaml, hse.yaml …

tests/registry/
├── fixtures/valid/ and fixtures/invalid/<CODE>/
├── ids.test.ts, schemas.test.ts, lifecycle.test.ts
├── integrity.test.ts     # one describe per violation code
├── relations.test.ts, public.test.ts, redirects.test.ts
├── rename.regression.test.ts
├── mutation.test.ts      # SC-003
└── bench/registry.bench.ts  # SC-004
```

**Structure Decision**: Single Astro project. Registry logic lives in `src/registry/` as framework-free TypeScript, so the CLI, the Astro integration and tests share one implementation. Later specs (003–008) depend on `ids`, `vocab`, `relations` and `public` only.

## Proposed test seams (confirm at `/speckit-implement`, per the tdd skill)

| Seam | Catches | Misses |
|---|---|---|
| `validateRegistry(records)` → report | every integrity rule; duplicates across files | YAML parse edge cases (covered by `load`) |
| CLI exit code + report files | wiring, determinism, R-output path | rule internals |
| `toPublic` + built-output leak scan | private and held leaks in any page or JSON | (none for leaks; it is the choke point) |
| `buildRelations` | reverse links, release filtering | page rendering of those links (specs 003–007) |
| `redirectsFor` + rename regression | slug changes never break links | host-specific redirect behaviour |

## Acceptance scenario → test map

| Scenario | Test |
|---|---|
| US1-AS1 valid unique ID | `ids.test.ts`, `integrity.test.ts › valid fixture` |
| US1-AS2 rename keeps ID, old URL resolves | `rename.regression.test.ts`, `redirects.test.ts` |
| US1-AS3 duplicate names both files | `integrity › ID_DUPLICATE` |
| US1-AS4 bad syntax names value and rule | `integrity › ID_SYNTAX` |
| US2-AS1 reconstruction provenance | `schemas › evidence` |
| ADR 0006 EDTF dates | `schemas › evidence`, `integrity › DATE_INVALID` |
| US2-AS2 verified locator fields | `integrity › LOCATOR_VERIFICATION_INCOMPLETE` |
| US2-AS3 publishable without rights | `integrity › PROVENANCE_MISSING` |
| US2-AS4 typed silence | `schemas › silence_state` |
| US2-AS5 secure on pending | `integrity › LOCATOR_UNVERIFIED_SECURE` |
| US3-AS1 unknown map ref | `integrity › REF_UNKNOWN` |
| US3-AS2 collection defaults | `integrity › COLLECTION_DEFAULTS` |
| US3-AS3 pass + report | CLI test against `contracts/integrity-report.schema.json` |
| US4 reverse relations, held excluded | `relations.test.ts` |
| US5 lifecycle; essays derived | `lifecycle.test.ts`, `integrity › ESSAY_LIFECYCLE_DECLARED` |
| FR-008 extraction | `integrity › EXTRACTION_UNADJUDICATED` |
| FR-009 private | `public.test.ts` + leak scan |
| FR-011 specialist mapping | `integrity › ENUM_INVALID (unmapped)` |
| SC-003 / SC-004 | `mutation.test.ts`, `bench/registry.bench.ts` |

## Delivery slices (one per user story, in order)
1. **US1** IDs, envelope schema, duplicate/syntax rules, CLI skeleton, report writer, slug redirects and the rename regression.
2. **US3** reference resolution, families, collections rule, Astro build hook.
3. **US2** EDTF dates (ADR 0006), evidence, rights, extraction, locator and confidence rules.
4. **US5** lifecycle enum, essay derivation, superseded rule and successor redirect, specialist mappings.
5. **US4** relations index, public projection, leak scan.
6. Scale: synthetic generator, mutation tests, benchmark.

## Complexity Tracking

None.
