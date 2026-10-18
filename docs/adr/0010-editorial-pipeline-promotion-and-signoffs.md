# ADR 0010 — The editorial pipeline: promotion by command, history as data, sign-offs by named people

**Status**: Accepted · **Date**: 2026-10-16 · **Jira**: TCX-4 · **Spec**: 003 · **Implements**: ADR 0003 §2 and §5

## Context
ADR 0003 fixes nine essay stages and their exit checks, and spec 003 says an essay "cannot advance unless that stage's exit check passes" and that every published essay has a complete stage history (SC-002). A `stage:` field edited by hand enforces neither. Some checks are human judgements (historical, cartographic and data QA) and some live outside this repository (accessibility and performance results in CI, the archive project's redirect file).

## Decision
- **`registry promote <essay-id> <stage>`** runs the cumulative exit checks for the target stage and only then rewrites `stage` and appends to `stage_history` (stage, date, person). It never skips a stage.
- **The gate re-checks the recorded stage** on every run: the cumulative checks still hold, the history is contiguous and its last entry equals `stage`. A hand edit cannot bypass a check.
- **Human sign-offs name a person and a date**: `signoffs: {historical, cartographic, data}`, each with `by` and `on`. A tool cannot sign, as with a verified locator (ADR 0003 §4).
- **Accessibility and performance** are proved by CI, not by `promote`. Promoting to Publish requires `design_qa_passed`; the pull request that sets Publish cannot merge unless the required `gate` check is green, and the essay's page type must be in the CI template list for that check to measure it. `promote` prints this requirement rather than claiming it ran the checks or testing the list itself: the list is keyed by page type, so a per-essay test of it would pass for every essay once the `essay` type is listed. *Amended 18 October 2026 to match the CLI contract; `promote` never enforced the list.*
- **Cross-link** requires reverse links (the registry derives them) and, for a rebuilt essay, `redirect_switched: {by, on}`, because the archive's redirect file is outside this repository. `legacy_url` records the address being superseded; spec 008 generates the archive redirect list from it.
- **Interaction declarations** (question, evidence, expected interpretation) live in the record as `interactions[]`; the essay body refers to them by `id`, and the gate checks both directions.

## Considered
A hand-edited stage with declarative checks only (cannot produce a history, invites bypass); git history as the stage history (not queryable, not checked); a tool-run accessibility check inside `promote` (would duplicate CI and could drift from it).

## Consequences
- The essay schema grows the fields listed in the ADR 0006 amendment of the same date.
- A promotion is a commit, so it goes through the required `gate` check like any change.
- US5 (research-gated publication) is out of v1 and will need its own grill, because reserved titles must not leak.
