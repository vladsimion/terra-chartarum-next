# Confluence entry: Decision Log (page 12648509)

Not yet published. Numbered when it is (`docs/confluence/README.md`).

### TC-D??? — One analytical framework governs every programme stage and phase

**Date:** 22 November 2026 (ADR 0020; constitution 1.1.0)    
**Status:** Accepted (epic TCX-66)

**Decision:**
- **Principle XI:** the 13 analytical dimensions and the research methodology govern every programme stage (I Dacia, II Transylvania, III Wallachia and Moldavia, and any later one), every phase, essay, layer and dataset.
- **One home:** the framework is defined once, in `FRAMEWORK.md`; specs and essays reference it.
- **Claims:** an Evidence record carries `analytical_dimensions`; unknown values fail validation.
- **Confidence:** one scale, `secure` · `probable` · `possible` · `conjectural` · `unsupported` (new) · `unknown`, with the 0–4 grades as display ordinals; `secure` needs two independent tier A–C sources, no credible contrary evidence and a verified locator.
- **Names:** "portal dimensions" become portal facets; "dimension" means only the 13.

**Context:** the framework was written for the Transylvania research programme; the author decided it binds the whole project. The constitution did not mention it, the programme's confidence grades duplicated ADR 0003's labels, and the full text lived outside the repository.

**Alternatives considered:**
- keeping the framework in the programme document only;
- a guideline instead of a principle;
- two confidence scales mapped to each other;
- replacing the labels with the 0–4 grades;
- a warning-only rule (the gate's mutation harness requires every rule to be provable as an error).

**Consequences:**
- the rule requiring `analytical_dimensions` lands with the tagging of Stage I's evidence, before Stage II Phase 1 opens;
- research exits now need tagged claims and written hypotheses; draft exits need bias-audit scores;
- the `portal_dimensions` field keeps its name until a later migration.
