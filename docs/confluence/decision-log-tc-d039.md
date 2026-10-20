# Confluence entry: Decision Log (page 12648509)

Published 2026-10-20 in page version 17, directly after TC-D038; the rest of the page was left unchanged (checked by reading the page back). The text below is what was published.

### TC-D039 — The migration is a repeatable, add-only import from a pinned snapshot, and the archive is the old site itself

**Date:** 17 October 2026 (ADR 0016); built 19 and 20 October 2026    
**Status:** Accepted (spec 008)

**Decision:** the live site's data moves in through one adapter per legacy registry, run as a named profile (v1: the `atlas` authority plus the Dacia anchor), reading a pinned snapshot of the legacy repository by static extraction and never running its code. The import is deterministic and add-only: it stages to a folder with a report, `--apply` only creates files that do not exist, a file the editor has touched is listed as "changed upstream" and left alone, and a second run changes nothing. Every imported record keeps its legacy local-id as its slug, arrives `held`, and keeps the legacy review state as `legacy_*` fields. Images are referenced at the archive and withheld until the editor clears them. The old site becomes the frozen archive: a URL whose content has not moved keeps working in place and needs no rule; only moved content (a public record, a rebuilt essay, `/atlas/`) gets one redirect rule, from an inventory built from the snapshot, applied to the archive project by a signed-off pull request. Cutover is one automated check, `cutover:check`, plus a numbered list of signed manual steps.

**Context:** ADR 0001 says canonical data migrates with stable IDs, essays are rebuilt and the old site is frozen, but not how. A crawl of the live site is not reproducible, executing the legacy TypeScript would run unreviewed code, and a blanket redirect of the old site would send every unrebuilt essay to a page that does not exist. Citations must keep working.

**Alternatives considered:** a crawl of the live site for the inventory; evaluating the legacy registries; redirecting every old URL to the new site; an import that overwrites; copying image files into the repository.

**Consequences:**

- the registry gains the `legacy_*` import-only fields and three rules, `MIG-SLUG`, `MIG-LEGACY` and `MIG-IMAGE-CLEARED`, with named mutations;
- the duplicate matcher of spec 006 changes: an entry now carries a `DOI` when the source gave a doi.org address, and two works with different DOIs are never weak-matched (found when an article and its replication data merged on the real data); this also protects `import-bib`;
- a real import must be run twice on the real snapshot before it is applied, since the fixture cannot show every citation shape;
- the editor owns the real-snapshot import, the live-site baseline, the archive patch, the redirect file's pull request and the domain switch, each signed in `docs/cutover.md`.

**Evidence:** `docs/adr/0016-migration.md`, `src/migration/`, `docs/cutover.md`, `tests/migration/integration/import-legacy.test.ts`, `tests/bibliography/unit/match.test.ts`, PRs #83 to #93; Jira TCX-44 to TCX-48. Extends ADR 0001 and ADR 0005 §4; refines the spec 006 matcher.
