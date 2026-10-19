# Confluence entry: Decision Log (page 12648509)

Published 2026-10-19 in page version 15, directly after TC-D036; the rest of the page was left unchanged (checked by reading the page back). The text below is what was published.

### TC-D037 — A Source points at one bibliography entry; citations are derived; an entry is public only when a public record cites it

**Date:** 17 October 2026 (ADR 0014); built 18 to 19 October 2026
**Status:** Accepted (spec 006)

**Decision:** a Source points at exactly one bibliography entry (`entry`, required from `ready_for_build`, rule `SRC-ENTRY`). Nothing called a citation is stored: it is derived, either as a record listing the entry in `bibliography[]` (essays, maps, cartographers, and, added by spec 006, datasets and layers) or as evidence through essay, Evidence, Source, entry. An entry is public only when it is published, released, in a valid section and cited by at least one public record, and that derivation lives in the registry so the registry build and the site agree. Citation fields live only in the entry's CSL-JSON. A finding aid stays a Source flagged `is_finding_aid` and is never evidence. An entry's exported URL is its page address.

**Context:** spec 003 renders a claim citation from the source's entry, but a Source had no link to an entry; spec 006's draft stored a Citation entity that overlapped spec 003's Evidence chain; and an entry cited only by held content must stay hidden, which "published and released" does not say.

**Alternatives considered:** a stored Citation entity (a second place to keep in step, with its own release state to leak); Source and entry merged (loses the difference between a work and a copy consulted); listing every published entry (publishes reading notes and orphans); identifiers duplicated in the YAML (two copies that can disagree).

**Consequences:**

- spec 001's data model gains `entry`, `bibliography[]` on dataset and layer, `edition_of`, `translation_of` and `digital_copy`, and four rules;
- `data/relations.json` and every public file leave out an entry nothing public cites;
- spec 008 maps each legacy source to a Source with its `entry` and the legacy section types onto the seven sections; everything arrives held.

**Evidence:** `docs/adr/0014-bibliography-model.md`, `src/registry/citations.ts`, `tests/bibliography/build/leak.test.ts`, PRs #65, #68, #71, #72, #73; Jira TCX-7, TCX-39 to TCX-41, TCX-50. Extends TC-D003 and TC-D019.
