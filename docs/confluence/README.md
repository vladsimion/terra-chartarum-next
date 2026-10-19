# Confluence sources

The files here are the repository copies of Confluence pages and entries. A file that is published states so in its first lines, with the page and version; the text below that line is what was published.

| File | Confluence |
|---|---|
| `spec-001-registry.md` | Spec 001 programme dossier, page 36569092 (whole page; keep identical) |
| `spec-002-shell.md` | Spec 002 programme dossier, page 37617686 (whole page; keep identical) |
| `spec-003-essays.md` | Spec 003 programme dossier, page 37617734 (whole page; keep identical) |
| `spec-004-collection.md` | Spec 004 programme dossier, page 37617788 (whole page; keep identical) |
| `spec-005-atlas.md` | Spec 005 programme dossier, page 38469633 (whole page; keep identical). The text here has been corrected for #63 (2026-10-19) and awaits republishing: the page still says the landing links are built by hand |
| `build-log-*.md` | One section of the Build Log, page 2490370 |
| `decision-log-tc-dNNN.md` | One published Decision Log entry, page 12648509 |
| `decision-log-pending-<slug>.md` | A Decision Log entry not yet published |

## Pending Decision Log entries have no number

Two sessions that draft at the same time both take "the next number", and the second one to publish collides with the first (TC-D029 was drafted twice on 17 October 2026). So a draft is named for its subject, not its number:

1. Write `decision-log-pending-<slug>.md` (for example `decision-log-pending-atlas-contracts.md`), with the entry headed `### TC-D??? — <decision title>`. Say which decisions it extends by their published numbers only.
2. When it is published, read the live Decision Log, take the next free number, publish, and read the page back.
3. In the same change, rename the file to `decision-log-tc-dNNN.md`, replace `TC-D???` with the number, and change its first lines to say it is published, with the page version.

If two drafts are published together, number them in the order they are appended.

## Publishing without a Confluence write tool

The Atlassian connector reads Confluence but does not write it. The pages have been published from a signed-in browser through Confluence's REST API (`/wiki/api/v2/pages/<id>`), with the page body generated from the file at a pushed commit and its SHA-256 checked before saving. For a section or entry, only that part of the page changes, and the page is read back to confirm everything else is identical.
