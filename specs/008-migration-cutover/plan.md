# Implementation Plan: Migration & Cutover

**Branch**: `008-migration-cutover` | **Date**: 2026-10-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-migration-cutover/spec.md`, clarified on 2026-10-17 after the grill (ADR 0016, amendment to ADR 0011).

## Summary

Moving a scholarly publication to a new platform without breaking a citation. Four parts. **Importer** (framework-free, in `src/migration/`): one adapter per legacy registry, run as the v1 profile, reading a pinned snapshot by static extraction, mapping fields and vocabularies, and writing held records to a staging directory with a report; `--apply` adds only records that do not exist. **Inventory and redirects**: a redirect inventory built from the snapshot's routes gives every old URL exactly one outcome, and a generator turns it into the rule file for the archive project. **Archive**: a patch (banner, `noindex`, link back) and a hand-run verification script. **Cutover**: one automated check, a signed manual list, and a one-off baseline measurement. The registry gains the `legacy_*` import-only fields and three rules; the map fields the importer fills (`record_scope`, `unlocated`, `open_questions[]`) come from spec 004's Foundation, which this grill amended. Spec 008 is accepted on a trimmed snapshot fixture, with the real snapshot run by the editor.

## Technical Context

**Language/Version**: TypeScript strict, Node 24.

**Primary Dependencies**: existing `yaml`, `zod`, `edtf`, `tsx`; `@babel/parser` (exact-pinned) for static extraction, because TypeScript 7 has no JavaScript compiler API; the citation libraries from spec 003 for inline-citation matching through `import-bib`'s matcher; a small CSV reader (`csv-parse`, exact pinned version, at least two weeks old). No runtime library reaches the site.

**Storage**: Files. Committed outputs under `migration/` (`import-manifest.json`, `essay-links.json`, `redirect-inventory.json`); archive patch under `archive/`; documents under `docs/`.

**Testing**: Vitest for extraction, each adapter's mapping, the year conversion, determinism, no-overwrite, the inventory, the rule generator and the cutover check (valid and invalid fixtures, a trimmed snapshot fixture, named mutations for each new rule); Playwright only for the Atlas `from=legacy` notice (through spec 005's page).

**Target Platform**: Editor's machine and CI; the archive project is changed through a pull request in its own repository.

**Project Type**: CLI and scripts in the existing single project.

**Performance Goals**: the importer handles the whole v1 profile (a few hundred records) in seconds; the cutover check runs inside the CI budget.

**Constraints**: deterministic and offline (no network at import; `archive:check` and `baseline` are the only commands that touch the network, by hand); nothing from the live site is fetched by the importer; no image binary enters the repository; nothing is ever overwritten.

**Scale/Scope**: the v1 profile: 59 maps, 19 cartographers, 34 bibliography items, 12 toponyms, 27 layers, 6 collections, 27 geo release assets, plus the Dacia places and sources the anchor needs (the 40 pilot places and 12 Trench A sources); about 31 legacy page routes and 22 essays in the inventory; 3 new rules (see [contracts/migration-rule-ids.md](./contracts/migration-rule-ids.md)); 5 new commands.

## Constitution Check

*GATE: passes before Phase 0 and again after Phase 1 design.*

- [x] **Historical question (I)**: "How does a scholarly publication change its platform without breaking a single citation that points at it?" (spec header).
- [x] **No duplicated canonical records or private geometry (II, V)**: each record is imported once and thereafter owned by the successor; nothing is copied twice; images are referenced, not duplicated.
- [x] **Uncertainty and provenance as fields (III, VI)**: missing fields become `not_yet_verified` or `unknown`, confidence never becomes `secure`, uncertainties become `open_questions[]`, every image starts uncleared, and the original legacy terms are kept.
- [x] **Bespoke interactions (IV)**: none.
- [x] **No dynamic infrastructure (VII)**: the output is static files and a redirect rule file; no Worker script, no runtime.
- [x] **Accessibility and performance impact (IX)**: the `from=legacy` notice is part of the Atlas page and covered by its axe check; the baseline records the old site's numbers for comparison.
- [x] **Test strategy (X)**: every acceptance scenario maps to a named test (table below), written first under the `tdd` skill.

**Result**: no violations; Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/008-migration-cutover/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── field-mappings.md        # legacy field → successor field, per registry
│   ├── redirect-inventory.md    # outcome policy and file formats
│   ├── cli-additions.md         # import-legacy, inventory, archive-redirects, cutover:check, archive:check, baseline
│   ├── migration-rule-ids.md    # the three rules
│   └── cutover.md               # the automated and manual checklist
└── tasks.md                     # /speckit-tasks
```

### Source code (repository root)

```text
src/migration/
├── extract-ts.ts              # static extraction of a RAW array from TypeScript source
├── read-csv.ts, snapshot.ts   # reading CSV/JSON and the pinned snapshot; manifest
├── year-to-edtf.ts            # signed integer year → four-digit signed EDTF
├── profile.ts                 # the v1 profile: which adapters run, in order
├── adapters/                  # maps, cartographers, bibliography, toponyms, layers, collections, geo-assets, dacia-places, dacia-sources
├── stage.ts, apply.ts         # staging output; add-only apply; the report
├── essay-links.ts             # migration/essay-links.json
├── inventory.ts               # routes of the snapshot → redirect inventory
└── redirects.ts               # inventory + registry → the archive project's rule file
src/registry/
├── schemas/families.ts        # legacy_record_scope, legacy_custody, legacy_publication_status
├── rules/migration.ts         # MIG-SLUG, MIG-LEGACY, MIG-IMAGE-CLEARED
└── cli.ts                     # + import-legacy, inventory, archive-redirects
scripts/{cutover-check,archive-check,baseline}.ts
migration/                     # import-manifest.json, essay-links.json, redirect-inventory.json (committed)
archive/                       # banner.html, _headers (the patch for the archive project), README
vocab-mappings/cnd.yaml        # specialist vocabulary mapping for the Dacia profile
docs/cutover.md, docs/baseline/
tests/migration/{unit,integration,fixtures}/   # trimmed snapshot fixture shaped like the legacy repository
```

**Structure Decision**: the importer, inventory and rule generator are pure modules over a snapshot directory and the registry, so every mapping is tested without the network or the old toolchain. The registry half stays framework-free and the commands are thin wrappers. Everything that touches the live network (`archive:check`, `baseline`) is a separate script kept out of CI.

## Acceptance-scenario → test map

| Story | Scenarios | Test |
|---|---|---|
| US1 import | 1 (ID, slug, qualified form) | `tests/migration/unit/adapters.test.ts`, `integration/import-legacy.test.ts` |
| | 2 (specialist vocabulary; unmapped term fails) | `unit/vocab.test.ts` |
| | 3 (missing field recorded as status) | `unit/adapters.test.ts` |
| | 4 (byte-identical re-run, empty apply) | `integration/determinism.test.ts` |
| | 5 (hand-edited record untouched; upstream change listed) | `integration/no-overwrite.test.ts` |
| | 6 (work, concept, unlocated keep ID and scope) | `unit/adapters.test.ts` |
| | 7 (images referenced, not copied) | `unit/adapters.test.ts`, `integration/import-legacy.test.ts` |
| | 8 (private fields dropped and reported) | `unit/drops.test.ts` |
| | independent test (counts, zero IDs changed) | `integration/import-legacy.test.ts`, `unit/ids-unchanged.test.ts` |
| US2 archive | 1 (banner, header, link) | `unit/archive-patch.test.ts`, `archive-check` against a local server in `integration/archive-check.test.ts` |
| | 2 (unrebuilt essay served in place) | `unit/inventory.test.ts` |
| US3 redirects | 1 (one outcome per route) | `unit/inventory.test.ts` |
| | 2 (migrated record page → new canonical) | `unit/redirects.test.ts` |
| | 3 (rebuilt essay gains its rule in the same change) | `unit/redirects.test.ts` |
| | 4 (Atlas query → `/atlas/?from=legacy`; layer path → view address) | `unit/redirects.test.ts`, spec 005's Atlas e2e for the notice |
| US4 cutover | 1 (stub or draft fails) | `unit/cutover-check.test.ts` |
| | 2 (inventory URL with no outcome fails) | `unit/cutover-check.test.ts` |
| | 3 (baseline recorded) | `unit/baseline.test.ts` (against a local server) |
| FR-011 static extraction | | `unit/extract-ts.test.ts` |
| FR-021 schema | | `tests/registry/unit/migration-schema.test.ts` |
| SC-001 IDs unchanged | | `unit/ids-unchanged.test.ts` |
| SC-005 no overwrite, no binary | | `integration/no-overwrite.test.ts` |
| SC-006 cutover fixtures | | `unit/cutover-check.test.ts` |

## Complexity Tracking

Empty: no constitution violations.
