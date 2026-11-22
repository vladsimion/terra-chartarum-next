# Confluence sources

The files here are the repository copies of Confluence pages and entries. A file that is published states so in its first lines, with the page and version; the text below that line is what was published.

| File | Confluence |
|---|---|
| `spec-001-registry.md` | Spec 001 programme dossier, page 36569092 (whole page; keep identical) |
| `spec-002-shell.md` | Spec 002 programme dossier, page 37617686 (whole page; keep identical) |
| `spec-003-essays.md` | Spec 003 programme dossier, page 37617734 (whole page; keep identical) |
| `spec-004-collection.md` | Spec 004 programme dossier, page 37617788 (whole page; keep identical) |
| `spec-005-atlas.md` | Spec 005 programme dossier, page 38469633 (whole page; keep identical; version 2 carries the #63 correction) |
| `spec-006-bibliography.md` | Spec 006 programme dossier, page 38633475 (whole page; keep identical) |
| `spec-007-rooms.md` | Spec 007 programme dossier, page 38928393 (whole page; keep identical) |
| `spec-008-migration.md` | Spec 008 programme dossier, page 39321601 (whole page; keep identical; version 2 has the same body as version 1, left over from a first attempt to move the page to the root; version 3 is the refresh after T042 and the stories reaching Done; version 4, published 2026-11-17 from `main` at 73affea, carries the map-review refresh (#102) and TCX-44's closure (#112); version 5, published 2026-11-22 from `main` at 0ea65b2, carries §14 as it stands, the custom-domain re-ordering and the closed epic) |
| `spec-009-anchor-essay.md` | Spec 009 programme dossier, page 47120430 (whole page; keep identical; published 2026-11-22) |
| `spec-010-authoring-tooling.md` | Spec 010 programme dossier, page 47120410 (whole page; keep identical; published 2026-11-22) |
| `stage-3-wallachia-moldavia.md` | Stage III (Wallachia and Moldavia) programme note, page 47120387 under Projects (whole page; keep identical; published 2026-11-22; Jira epic TCX-79) |
| `build-log-*.md` | One section of the Build Log, page 2490370 (sections AC and AD, `build-log-spec-009.md` and `build-log-spec-010.md`, published 2026-11-22 in page version 136) |
| `decision-log-tc-dNNN.md` | One published Decision Log entry, page 12648509 |
| `decision-log-pending-<slug>.md` | A Decision Log entry not yet published |
| (generated, not stored) `npm run sdd:pages` → `sdd-confluence/` | The `[SDD]` pages: an index page under page 2457601 and one child page per spec, holding the Spec Kit artefacts of `specs/` at a commit. Regenerate and paste after the specs change; never edit them in Confluence |

## Pending Decision Log entries have no number

Two sessions that draft at the same time both take "the next number", and the second one to publish collides with the first (TC-D029 was drafted twice on 17 October 2026). So a draft is named for its subject, not its number:

1. Write `decision-log-pending-<slug>.md` (for example `decision-log-pending-atlas-contracts.md`), with the entry headed `### TC-D??? — <decision title>`. Say which decisions it extends by their published numbers only.
2. When it is published, read the live Decision Log, take the next free number, publish, and read the page back.
3. In the same change, rename the file to `decision-log-tc-dNNN.md`, replace `TC-D???` with the number, and change its first lines to say it is published, with the page version.

If two drafts are published together, number them in the order they are appended.

## Publishing with the Atlassian connector

Since 22 November 2026 the Atlassian connector writes Confluence. A page is published from its file at a merged commit: a new page is created whole; an existing page is changed by targeted edits to the nodes that differ (the page's own node ids, read from its current version), so that nothing else on the page moves; and the page is read back. The generated `[SDD]` spec pages are too large to send through the connector and are still pasted from `npm run sdd:pages`.

## Publishing without a Confluence write tool

Before 22 November 2026 the Atlassian connector read Confluence but did not write it. The pages have been published from a signed-in browser through Confluence's REST API (`/wiki/api/v2/pages/<id>`), with the page body generated from the file at a pushed commit and its SHA-256 checked before saving. For a section or entry, only that part of the page changes, and the page is read back to confirm everything else is identical.
