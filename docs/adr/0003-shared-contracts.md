# ADR 0003 — Shared contracts: lifecycle, confidence, locators, stage gates, dimensions, rooms

**Status**: Accepted · **Date**: 2026-10-15 · **Amended**: 2026-11-22 by ADR 0020 (§3, §5, §6, new §8) · **Jira**: TCX-10 · **Resolves**: constitution P-3, P-4, P-5

## 1. Lifecycle (P-3)
One shared lifecycle for every entity:
`proposed → researching → verified → ready_for_build → in_build → qa → publishable → published`, plus terminal/side states `superseded` and `blocked`. Unknown values fail validation.
- Imported layer terms map at the boundary: `planned → proposed`, `in-preparation → in_build`, `in-review → qa`, `published → published`.
- Layer **availability** (does a runnable asset exist?) is derived at build time, never stored. `published` + missing asset = build failure.

## 2. Essay stages vs lifecycle
The nine editorial stages are a separate axis, essays only. An essay's lifecycle is **derived** from its stage and never set by hand:

| Stage | Lifecycle |
|---|---|
| Concept | proposed |
| Corpus, Research | researching |
| Outline, Draft | verified |
| Build | in_build |
| Design QA | qa → `publishable` once all Design QA checks pass |
| Publish, Cross-link | published |

## 3. Confidence (amended by ADR 0020)
One ordinal scale with written criteria, plus `unknown` (never treated as the lowest level). The analytical framework's 0–4 grades are display ordinals for these labels, not a second vocabulary.

| Ordinal | Label | Criterion |
|---|---|---|
| 4 | **secure** | Two or more independent tier A–C sources agree, no credible contrary evidence, and a verified locator |
| 3 | **probable** | One strong source plus consistent indirect evidence |
| 2 | **possible** | Consistent with the evidence but not directly supported, or contested |
| 1 | **conjectural** | Resting on inference or late sources; editorial inference |
| 0 | **unsupported** | Contradicted, or no evidential basis; recorded so it can be shown as refuted |
| — | **unknown** | Not yet assessed |

## 4. Locator verification (extends TC-D018)
`verified` requires `verified_by` (a person), `verified_on` (date) and `consulted_copy` (exact edition + scan URL or shelfmark). Locators found or proposed by AI remain `pending` until a person confirms them against the page.

## 5. Stage exit checks
1. Concept: historical question + primary room.
2. Corpus: map list; every ID resolves; rights state per object.
3. Research: source list with locators; open questions logged; every claim tagged with its analytical dimensions; competing hypotheses written with what would weaken each (ADR 0020).
4. Outline: structure; each planned interaction declares question / evidence / interpretation.
5. Draft: full text; every citation resolves; no finding aids cited; bias-audit score recorded for every secondary source cited (ADR 0020).
6. Build: integrity gate green; layers registered.
7. Design QA: accessibility + performance pass; historical, cartographic and data QA signed off; image rights cleared.
8. Publish: released; held-leak scan clean.
9. Cross-link: reverse links on every referenced entity; redirect switched (spec 008).

**Pending locators at publication** are allowed, shown to readers as pending. A claim rated `secure` MUST NOT rest on a pending locator (build failure).

## 6. Portal facets (P-4; renamed from "portal dimensions" by ADR 0020)
Measure, Witness, Use, Cosmos, Power, Silence are kept as optional, additive essay metadata called **portal facets**. The field keeps its name, `portal_dimensions`, until a migration renames it. There is no navigation surface or radar chart in v1. Native essay lenses remain primary.

## 7. Rooms (P-5)
Canonical seven, in order: **Earth, Map, City, Border, Road, Archive, Theatre**. All seven are public at v1 with their introductions, maps and layers; essays appear as they are rebuilt.

## 8. Analytical dimensions (added by ADR 0020)
`analytical_dimension`, 13 values in three groups; definitions live once in `FRAMEWORK.md`.
- **empirical**: `historical`, `geographical`, `social_demographic`, `anthropological_archaeological`, `linguistic`, `religious`, `economic`, `political`
- **interpretative**: `historiographical`, `sociological`, `mythological`, `philosophical`
- **validation**: `methodological`

An Evidence record carries `analytical_dimensions` (a list). Unknown values fail validation (`ENUM-INVALID`). `DIM-MISSING` requires one or more values from `ready_for_build` (a warning before that); it landed with the tagging of Stage I's evidence (ADR 0020 §7, TCX-71, TCX-73).

## Consequences
- Spec 007 US1 moves into v1 scope.
- Spec 001 FR-010 and US5 resolved; spec 003 US2 resolved; spec 007 FR-001 resolved.
- GLOSSARY.md updated with lifecycle, confidence and room terms; ADR 0020 adds Analytical dimension, Portal facet, Programme stage and `unsupported`.
