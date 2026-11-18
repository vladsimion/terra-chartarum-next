# ADR 0018 — Record scaffolding: `registry new` for every family, with provenance as a visible checklist

**Status**: Accepted · **Date**: 2026-11-18 · **Jira**: TCX-60 (grill item 18), TCX-62 · **Epic**: TCX-59 (010) · **Refines**: ADR 0006 items 1, 6 and 17; ADR 0010 (`registry new essay`)

## Context
Grill item 18 asked how new records and their IDs should be created, so that an immutable ID is never hand-typed. Most of this is already settled in ADR 0006:
- local-ids are family-prefixed counters (`place-000123`) minted by `registry mint`;
- authority `tc`, with external authorities only in `same_as[]`;
- cross-branch collisions are caught by `ID-DUPLICATE`, and the later branch re-mints;
- progressive strictness, so a draft record is not held to publication rules.

`registry new essay` (ADR 0010) already scaffolds essays. What is missing is the same for the other families, and a way for R data-prep pipelines to get IDs.

## Decision
- **The ID format does not change.** ADR 0006's counters stand. The grill first chose random base32 codes to avoid branch collisions, before anyone noticed the counter decision; that collision case is already handled by `ID-DUPLICATE` plus re-mint. Every minted ID in the registry, the importers and `import-bib` already uses counters.
- **`registry new <family>` covers every family except `room`.** Rooms are seven fixed entities (ADR 0006 item 10). Each call mints with `mintNext`, writes one record at lifecycle `proposed` and release `held`, and keeps `registry new essay`'s rule: if the registry has more errors afterwards than before, what was written is removed again. `registry new essay` keeps its current options and its MDX body stub.
- **Provenance is written as a checklist, not left out.** For each field the family's rules require from `ready_for_build` upward:
  - **Fields with a defined "not yet" value** get that value, e.g. locator `state: pending` and `confidence: unknown`.
  - **Fields without one** (`verified_by`, `verified_on`, `consulted_copy`, source, rights and licence) are written as commented-out keys under a `# To complete before ready_for_build` heading. This keeps the stub valid under the schemas, so it validates as a draft, and the rules flag what is missing once the record is promoted.
- **One minter, called from R.** R pipelines get IDs by calling the registry CLI (`registry mint <family>` or `registry new <family>`) through `system2()`, pinned and recorded like tippecanoe (ADR 0005 §2). There is no second implementation in R. `testthat` tests mock the call, and one integration test runs the real CLI.

## Considered
- **Random base32 local-ids:** would supersede ADR 0006 item 1, its `ID-SYNTAX` rule and tests, and every counter-minting caller, to solve a collision the gate already catches.
- **A minimal stub:** the editor would learn the required fields only from rule failures after promotion.
- **Prompting for each provenance field:** invites guessed values at creation, against Principle VI.
- **An R reimplementation of the minter:** two implementations of one rule would drift.

## Consequences
- Spec 010 owns `registry new <family>` and its tests (valid and invalid fixtures, the rollback case, one test per family's checklist).
- The checklist for each family is derived from the rules' field lists, not typed, so a new provenance rule adds its field to the stub without a second edit.
- R pipelines need Node available wherever they mint.
