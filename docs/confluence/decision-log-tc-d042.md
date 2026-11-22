# Confluence entry: Decision Log (page 12648509)

Published 2026-11-22 in page version 18, with TC-D040 to TC-D044 appended together in that order directly after TC-D039; the rest of the page was left unchanged (checked by reading the page back). The text below is what was published.

### TC-D042 — Authoring tooling removes friction without weakening a rule, and no automation writes a canonical record

**Date:** 18 November 2026 (ADRs 0018, 0019)    
**Status:** Accepted (grill TCX-60; epic TCX-59, spec 010 not yet specified)

**Decision:**
- **New records:** `registry new <family>` scaffolds every family except rooms. It uses ADR 0006's counter IDs unchanged, writes provenance as a visible checklist, and rolls back if it adds errors. R pipelines call the same CLI.
- **Editor schemas:** generated from Zod for every YAML record, never committed, with glossary definitions as hover text and existing IDs as suggestions.
- **Dependents graph:** built from the gate's own reference fields and including held records, written on every build as a CI artefact, and queried with `registry deps <id>`. Not public in v1.
- **Link and manifest checker:** a weekly workflow outside the gate. It opens one Jira issue per broken URL and a review issue for a changed IIIF manifest, never changes a locator's verified state, and proposes archived copies by pull request.

**Context:** one maintainer writes every record; the registry's rules are strict by design. An external review proposed easing contribution. Its ideas were kept only where they cut friction without relaxing a rule. A rename codemod was rejected because IDs never change. Extracting the engine as a package was deferred until after v1.

**Alternatives considered:**
- random base32 IDs (ADR 0006 already handles the branch collision they addressed);
- a minimal stub;
- committed schemas;
- extending the public `reverse.ts`;
- a public graph in v1;
- a reader-facing link status;
- a daily or monthly check.

**Consequences:**
- the evidence locator gains `archived_copy` and `archived_on`;
- `GLOSSARY.md` gains Archived copy and Dependents;
- the repository needs a Jira API token as an Actions secret (`JIRA_USER`, `JIRA_API_TOKEN`); the link-check workflow uses its own `GITHUB_TOKEN` with `contents`, `pull-requests` and `actions` write, the last to start the gate on the archived-copy pull request, which GitHub would not otherwise run for a pull request that token opened;
- `LOC-ARCHIVED` judges the two new locator fields;
- TCX-65 adds a slug-rename test and a version pin on dataset records with external sources (`upstream.pin`, judged by `DATASET-PIN`).

**Evidence:** `docs/adr/0018-record-scaffolding.md`, `docs/adr/0019-authoring-tooling.md`, `GRILL-AGENDA.md`; Jira TCX-59 to TCX-65. Refines ADR 0006 items 1, 6, 9 and 17 and ADR 0010.
