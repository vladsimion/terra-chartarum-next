# ADR 0020 — One analytical framework across every stage (constitution 1.1.0)

**Status**: Accepted · **Date**: 2026-11-22 · **Decided by**: Vlad · **Jira**: TCX-66 · **Amends**: constitution 1.0.1 → 1.1.0 (MINOR: principle added); ADR 0003 §3, §5, §6, new §8

## Context

The 13 analytical dimensions and the research methodology were written for the Transylvania research programme. The author has decided they are overarching principles for the whole of Terra Chartarum: Stage I (Dacia), Stage II (Transylvania), Stage III (Wallachia and Moldavia), any later stage, and every phase inside them. The constitution said nothing about them, so a spec could pass the Constitution Check without using them, and the programme document could drift from the shared vocabularies.

Three overlaps existed:
1. **Confidence.** ADR 0003 §3 had four labels (`secure`, `probable`, `possible`, `conjectural`) plus `unknown`; the programme had a 0–4 grade (Established, Probable, Plausible, Speculative, Unsupported) with different criteria.
2. **The word "dimension".** ADR 0003 §6 called Measure, Witness, Use, Cosmos, Power, Silence "portal dimensions".
3. **Canonical home.** The framework's only full text was the programme document, outside the repository, where specs cannot reference it and CI cannot check it (Principle V).

## Decision

1. **Principle XI** is added to the constitution: every stage, phase, essay, layer and dataset is researched and assessed through the one framework.
2. **One canonical home.** The framework is defined once, in `FRAMEWORK.md` at the repository root. The programme document references it; specs and essays reference it and never restate it.
3. **Vocabulary.** `analytical_dimension` joins the shared vocabularies (ADR 0003 §8, `GLOSSARY.md`): 13 values in three groups. An Evidence record carries them in `analytical_dimensions`; an unknown value fails `ENUM-INVALID`.
4. **One confidence scale.** ADR 0003's labels stay canonical and gain `unsupported`; the programme's 0–4 grades become their display ordinals, and the criteria merge. `secure` now needs two or more independent tier A–C sources, no credible contrary evidence, and a verified locator.
5. **Portal facets.** ADR 0003 §6 "portal dimensions" is renamed portal facets, so "dimension" means only the 13. The field keeps its name, `portal_dimensions`, until a migration renames it; renaming it touches records, specs and tests and is not part of this change.
6. **Stage exit checks (ADR 0003 §5).** Research additionally requires every claim tagged with its dimensions and the competing hypotheses written with what would weaken each; Draft additionally requires the bias-audit score for every secondary source cited.
7. **Rollout.** Agreed as "warning first, then error before Stage II Phase 1". In the repository this is done in two steps, because the integrity gate has no warning-only rules: every registered rule must be provable as an error by a named mutation (spec 001 SC-003, `rule-coverage.test.ts`).
   - **Now:** the vocabulary, the field, the membership check and `unsupported` land. Nothing yet requires the field, so the cutover is not blocked.
   - **Before Stage II Phase 1 opens:** a rule requiring `analytical_dimensions` on Evidence records (`DIM-MISSING`, error from `ready_for_build`) lands in the same change that tags Stage I's evidence records (15 at the time of writing: 14 `published`, 1 `researching`; none `secure`). The tagging is the author's judgement, not generated. **Done 2026-11-22** (TCX-71, TCX-73): the author approved the tags record by record; test fixtures and synthetic registries carry a placeholder `historical`.

## Alternatives considered

- **Keep the framework in the programme document only.** Rejected: outside the repository, unchecked, breaks Principle V.
- **A guideline rather than a principle.** Rejected: a guideline does not gate `/speckit-plan`.
- **Two confidence scales mapped to each other.** Rejected: two vocabularies for one fact.
- **Replace the labels with the 0–4 grades.** Rejected: the labels are in the schema and in migrated data.
- **A warning-only rule.** Rejected for this repository: it would need an exception to the mutation harness that guards every rule (SC-003).

## Consequences

- Constitution 1.1.0; ADR 0003 amended; `FRAMEWORK.md` and the glossary entries (Analytical dimension, Portal facet, Programme stage, `unsupported`) added.
- `CONFIDENCE_VALUES` gains `unsupported`; `ANALYTICAL_DIMENSION_VALUES` and `ANALYTICAL_DIMENSION_GROUPS` added to the shared vocabularies; `ENUM-INVALID` checks `analytical_dimensions`.
- `/speckit-analyze` runs across open specs (governance rule for amendments; TCX-70).
- Stage I `secure` claims are re-checked against the merged criterion (TCX-72); at the time of writing there are none.
- Follow-ups: TCX-71 (tag Stage I), TCX-73 (the requiring rule), the `portal_dimensions` field rename.
