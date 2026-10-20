# ADR 0011 — Map record model: a record per witness, a status for every field, and what the public repository never holds

**Status**: Accepted · **Date**: 2026-10-17 · **Jira**: TCX-5 · **Spec**: 004 · **Amends**: ADR 0006 (map and cartographer family fields)

## Context
Spec 004 asks for a rich map record (titles, makers, edition and state, atlas context, dimensions, coverage, provenance, images, rights, verification) in which "a blank is never presented as complete", and in which held objects and institutional digital copies are told apart everywhere. The registry rejects any field its schema does not define (`FAM-UNKNOWN`) and the family list is closed, so the shape has to be decided before the schema grows. The repository is public, so "never public" cannot rest on a display rule alone.

## Decision
- **One record per witness.** A Map object record describes one witness of a map: `witness_kind: held | institutional`, required. Two witnesses of the same edition are two records joined by a relation. Held versus institutional is then a plain fact on the record, shown everywhere (spec 004 FR-003).
- **Every displayed field has a status.** A `field_status` map, keyed by field name, holds `recorded | not_applicable | not_yet_verified | unknown`. A field with a value is `recorded`. An empty field with no status is a warning from `ready_for_build` and an error at `publishable`. Provenance and atlas-context fields of a held witness also carry `basis: observed | inferred`; the physical-object fields stay schema-only in v1 (ADR 0002).
- **Image sources are embedded, not a family.** `images[]` on the map record holds type (IIIF, DeepZoom, static), URL, rights, attribution, authored `alt` text, and `witness_kind`. The family list stays closed (ADR 0006 item 10).
- **Cartographers include workshops.** A `workshop` cartographer stands for a family or firm whose individual maker is not established; a map attributed to one is marked `attribution: unresolved` and never counts as an exact maker.
- **The public repository never holds private acquisition data.** No price, vendor contact or negotiation is committed, in any file or in history; the registry keeps only public provenance. A gate rule rejects field names such as `price`, `paid` and `negotiation` as a safety net.
- **The spec 004 schema work amends spec 001's data model** as its Foundation phase, with its own tests, rather than being slipped in as record content.

## Considered
One record with several witnesses (makes "held or institutional" a property of a list, so every view has to unpick it); a sentinel string in each empty field such as "unknown" (indistinguishable from a real value, cannot be validated); an `image_source` family (reopens the closed list for a value that has no identity of its own); keeping price data in a private branch or file (still in a public repository's history once pushed).

## Consequences
- The spec 008 adapter maps each legacy record to one witness record and sets `field_status: not_yet_verified` for anything the legacy data lacks.
- The map and cartographer rows of the ADR 0006 family-fields table grow; `FAM-UNKNOWN` stays strict.
- Imported records arrive held; releasing the 59 is a deliberate editor act.
- A reverse "where used" list is derived at build time from one-way references and shows public referrers only.

## Amendment (spec 008 grill, 2026-10-17): record scope and unlocated objects
The legacy catalogue has 59 records, some of which are not a single object: explicit `recordScope` values are `object` (3), `work` (6) and `concept` (2), the rest default to `object`, and one object's custody is `unlocated`. IDs must be preserved, so none can be dropped, and none fits "one record per witness" with only `held | institutional`. The model gains `record_scope` (`object` by default, `work`, `concept`) and widens `witness_kind` to `held | institutional | unlocated`. `witness_kind` is required only when the scope is `object`; a `work` or `concept` record is labelled as such, has no viewer or images, and counts as no witness in the held/institutional filter. A witness is still one concrete copy; a `work` is the literature's edition, a `concept` is an idea. See [ADR 0016](0016-migration.md).

## Amendment (spec 008 remediation, 2026-10-20): a maker the editor has confirmed is unknown
`makers[]` is required of a map (`FAM-REQUIRED`), but many of the imported maps are anonymous or institutional works (a mappa mundi, the Peutinger table, a mosaic), for which there is no cartographer record to point at. A shared "Anonymous" cartographer record would appear on the Cartographers pages and in "maps by a cartographer", and would count as a maker for `attribution: exact`; a sentinel string is what the original decision ruled out. So the answer lives where the model already keeps one: an empty `makers` with `field_status.makers` set to `unknown` (the maker is not known) or `not_applicable` (the idea of a maker does not fit) satisfies `FAM-REQUIRED`. `not_yet_verified`, `recorded` and an absent status do not, so an unexamined gap still warns, and a status does not stand in for `witness_kind`. No field or value is added; the enrichment queue already treats `unknown` and `not_yet_verified` as doubtful, so a confirmed-unknown maker is counted as such rather than hidden.

