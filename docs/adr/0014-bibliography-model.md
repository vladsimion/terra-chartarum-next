# ADR 0014 — Bibliography model: sources point at entries, citations are derived, entries are public only when cited

**Status**: Accepted · **Date**: 2026-10-17 · **Jira**: TCX-7 · **Spec**: 006 · **Extends**: TC-D003, TC-D019, ADR 0004 §3 and §4

## Context
Spec 003 renders a claim citation "from the source's bibliography entry plus the locator", but a Source record in the registry has no link to an entry (only `is_finding_aid` and `source_kind`). Spec 006's draft lists a stored "Citation" entity (citing entity, entry, locator, verification) that overlaps spec 003's decision that a claim citation points at an Evidence record. And spec 006 requires an entry cited only by held content to stay hidden, which is a visibility rule beyond "published and released".

## Decision
- **A Source points at exactly one bibliography entry** (`entry`, a typed reference, required from `ready_for_build`, rule `SRC-ENTRY`). Several Sources may share an entry (different copies of one work). An entry no Source points at is further reading, not evidence. A finding aid stays a Source flagged `is_finding_aid`, is never cited as evidence, and has an entry like any other work.
- **Citations are derived, never stored.** A record **lists** an entry in its `bibliography[]` (essays, maps, cartographers, and, added by spec 006, datasets and layers), or **cites it as evidence** through essay → Evidence → Source → entry, carrying the locator and its verification state. "Cited in" shows both routes, labelled differently.
- **An entry is public only when it is published and released and at least one public record cites it by either route.** An entry cited only by held content, or by nothing, is not listed anywhere public, and "Cited in" lists public citing records only.
- **Citation fields live only in the entry's CSL-JSON.** DOI, ISBN, URL, catalogue reference and keywords use CSL's own fields; the YAML holds `section`, `edition_of`, `translation_of`, `digital_copy` and the common record fields, so there is one copy of every fact.

## Considered
A stored Citation entity (a second place to keep in step with the Evidence chain, and with its own release state to leak); Source and entry merged into one family (reopens the closed family list and loses the difference between a work and a copy consulted); listing every published entry regardless of citation (publishes an editor's reading notes and orphans); identifiers duplicated in the YAML (two copies that can disagree).

## Consequences
- Spec 006's Foundation amends spec 001's data model: `entry` on Source, `bibliography[]` on dataset and layer, `edition_of` and `translation_of` and `digital_copy` on bibliography entry, with the rules `SRC-ENTRY` and `BIB-EDITION`.
- Publishing a record that lists a held entry fails or warns through the existing body-public checks; the Bibliography page can never show an entry that nothing public cites.
- The spec 008 adapter maps each legacy source to a Source with its `entry`, and legacy bibliography section types onto the seven sections; everything arrives held.
- The glossary's claim that "a finding aid is not a source" is corrected to match the registry: it is a Source that is never evidence.
