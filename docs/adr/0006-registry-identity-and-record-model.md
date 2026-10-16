# ADR 0006 — Registry identity, record model and release state

**Status**: Accepted · **Date**: 2026-10-16 · **Jira**: TCX-2 · **Refines**: ADR 0003 · **Spec**: 001

## Decision
1. **IDs**: boundary form `tc:{authority}:{family}:{local-id}`. Authority is `tc` for everything this project mints, plus an allowlisted set of external codes. New `local-id`s are opaque, lowercase, family-prefixed counters (e.g. `place-000123`), minted by a registry command, never derived from titles and never hand-typed. Legacy IDs are kept verbatim as `local-id` under `tc` (see items 11–14). The mint command takes the highest number across the working tree and `main`; a cross-branch collision is caught by the duplicate-ID gate and the later branch re-mints. An ID is immutable only once merged to `main`.
2. **Storage**: one file per entity in an Astro content collection, validated by Zod. The filename is the `local-id`, so renames never move files. Bulk geometry stays in GeoJSON/FlatGeobuf files that records reference by path; no database, no monolithic CSV.
3. **Release state**: `held | released` is a flag separate from lifecycle, default `held`. Public output requires lifecycle `published` and `released`. Reverse relationships and held-leak scans filter on it.
4. **Evidence records** are first-class entities with their own IDs, pointing at a target and a source. Essays and layers cite them by ID and never embed provenance.
5. **URL stability**: each entity keeps a slug history. The build generates the `_redirects` rules, fails on collisions with live slugs, redirects superseded entities to their successor and shows a withdrawn page when none exists.
6. **Progressive strictness**: ID, family, lifecycle and reference resolution are errors at every lifecycle state. Provenance, rights and locator rules are errors from `ready_for_build` upward and warnings below it. `publishable` and `published` fail on the full rule set.
7. **Silence** is an Attestation with `form = silence` and exactly one typed silence state. It is source-bound and citable, and cannot be rated `secure` unless the source's coverage is verified. Silence states are invalid on anything that is not an Attestation.
8. **Automated extractions** keep small raw extractions and a transformation log (tool, version, input, date, parameters) under `provenance/` beside the evidence they feed. Large raw artefacts stay out of git, referenced by checksummed URL or shelfmark. A step stays `proposed` until a named person adjudicates it; the gate fails any publishable record whose chain contains an unadjudicated automated step.
9. **Integrity report**: versioned `integrity-report.json` plus rendered HTML, CI artefacts, not committed. Stable rule IDs (e.g. `ID-DUPLICATE`); tests assert on rule IDs, not message text. Non-zero exit on any error; warnings are counted, never failing.
10. **Families** are a closed enumeration owned by the registry: the 14 in FR-001 plus `evidence`. The seven rooms are fixed entities with permanent IDs. A new family needs a spec amendment.
11. **Imported `local-id` syntax** is the live site's pattern, preserved verbatim: authority `[a-z0-9][a-z0-9-]*`, family `[a-z][a-z0-9-]*`, local-id `[A-Za-z0-9][A-Za-z0-9._:-]*`. Newly minted IDs use the counter form. Every record carries `origin: legacy | minted`.
12. **Legacy families**: `port` is imported under family `place` with a port place type, the one recorded exception to "family never changes", logged in the ID map. `project` is a delivery concept and is not imported. Real record counts are audited before the import spec is written.
13. **Legacy confidence** maps `high → probable`, `medium → possible`, `low → conjectural`; never auto-`secure`. The original is kept as `legacy_confidence` and each imported claim is flagged for editor review.
14. **Legacy review state** is not lifecycle. Imports enter at `researching`; `llm_assisted` rows count as unadjudicated automated steps (item 8). The original is kept as `legacy_review_state`. Legacy reviewer and review date become `verified_by`/`verified_on` only after the editor confirms them in the import report.
15. **Private fields** (acquisition, price, etc.) live in a separate private block. Public output is projected from a per-family allowlist, so new fields are private by default. A post-build scan of `dist/` fails the build on any private value or held ID.
16. **Dates** are signed integer years (negative for BCE) in `valid_from`/`valid_to`, with a separate closed `date_precision` (`day, month, year, decade, quarter_century, century, unknown`) and an optional free-text `date_label`.
17. **External authority links** are a `same_as[]` list of `{authority, id}` validated by syntax against the authority allowlist; the gate never touches the network.

## Alternatives considered
Title-derived or hand-typed IDs; a database or single CSV registry; provenance embedded in essays; folding held into lifecycle; strict validation at every state; a hosted redirect service.

## Consequences
- Spec 001 FR-002, FR-003, FR-005, FR-007 and US1/US4 are sharpened accordingly.
- The `registry mint` command and the ID allowlist become part of spec 001's scope.
- GLOSSARY.md gains Authority, Slug history, Evidence record, Withdrawn entity and a revised Held / released.
