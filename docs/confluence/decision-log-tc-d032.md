# Confluence entry: Decision Log (page 12648509)

Published 2026-10-18 in page version 13, directly after TC-D031 and together with TC-D033; the rest of the page was left unchanged (checked by reading the page back). The text below is what was published.

### TC-D032 — Migration is a pinned, staged, never-overwriting import; redirects exist only for content that moved

**Date:** 17 October 2026    
**Status:** Accepted

**Decision:** the legacy site's canonical data is imported by one adapter per legacy registry, run as a named profile (v1: the `atlas` authority plus the Dacia anchor records), from a pinned snapshot of the legacy repository read by static extraction without executing its code. The import writes held records to a staging directory and only ever adds files that do not exist; slugs equal the legacy local-ids. Images are referenced at the frozen archive and withheld until cleared; private fields are dropped and reported. Because the archive is the old site itself, only URLs whose content moved (migrated record pages, rebuilt essays) get a redirect rule, from an inventory built from the snapshot and applied to the archive project by a signed-off pull request. Records that are a `work` or a `concept` keep their ID with a `record_scope`, and `witness_kind` gains `unlocated`.

**Context:** ADR 0001 promised ID-preserving migration and a frozen archive but not how. The legacy registries are TypeScript that imports Astro, 8 of the 11 explicitly scoped catalogue records are not single objects, images carry unestablished rights, and the old spec's "unrebuilt essays go to the archive" contradicted ADR 0005 §4.

**Alternatives considered:** importing every authority for v1; executing the legacy TypeScript; a re-runnable importer that overwrites; copying the images; a rule for every old URL; translating old Atlas parameters; dropping `work` and `concept` records.

**Consequences:**

- ADR 0011 is amended; spec 004 gains `record_scope`, `unlocated`, `open_questions[]` and the rule `MAP-SCOPE`;
- the first import is a one-off seeding, after which the records are hand-edited and the importer only adds;
- every imported image is withheld on day one; clearing rights is an editor task;
- `cutover:check` is the automated half of the cutover, and `docs/cutover.md` the signed manual half.

**Evidence:** [ADR 0016](https://github.com/vladsimion/terra-chartarum-next/blob/main/docs/adr/0016-migration.md); spec 008; Jira TCX-44. Extends TC-D016, TC-D021 and TC-D024; amends ADR 0011 (TC-D028).
