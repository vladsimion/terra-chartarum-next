# Confluence entry: Decision Log (page 12648509)

Not yet published. Numbered when it is (`docs/confluence/README.md`).

### TC-D??? — The repository is canonical for what specs own; counts are generated; a story is Done at merge

**Date:** 22 October 2026    
**Status:** Proposed

**Decision:** for anything a spec, ADR or test owns, the repository copy in `docs/confluence/` is the source and the Confluence page is a published copy of it at `main`; pages are never edited by hand. Rule, mutation, entity, error and warning counts appear only inside a generated `status:begin`/`status:end` block, filled by `npm run status -- --write` and checked in CI by `npm run status -- --check`. A Jira story moves to Done when its PR merges with `gate` green, and the documentation ships in that PR. Its description links `specs/<NNN>/tasks.md` and does not copy the checklist. Before a spec is specified or implemented, the session looks for an open branch or PR on its number, and right after `/speckit-tasks` it opens a draft PR as the claim. An essay rebuilt on the existing framework starts from `.specify/templates/essay-spec-template.md`, not from a full spec and dossier.

**Context:** one change was being recorded in six places: the repository spec and tasks, the dossier, the Build Log, the Decision Log, the Jira checklist and Volume IX. The dossiers record the drift this caused: sections amended in place, counts reconciled at different SHAs, two checklists on one story. On 22 October 2026, 24 TCX stories for specs 001 to 006 were still In Review with their code merged, because Done waited on a Confluence update. The dossiers quoted 91 rules, 120 mutations and 167 warnings while `main` (c44e63a) had 93, 121 and 131. Spec 001 was implemented twice in parallel because nothing marked it as claimed (spec 001 dossier §10.2). The master index's own ownership rule already says that a stable fact has one primary home.

**Alternatives considered:** keeping the manual reconciliation and auditing it quarterly (KAN-383), which finds drift after it has been read as fact; making Confluence canonical, which leaves the code and its documents with no common review; dropping the dossiers, which loses the scholarly record the programme contract requires.

**Consequences:**

- CLAUDE.md workflow step 4 and the Definition of Done change, and step 0 (claim before you build) is added;
- the dossiers gain a status block in place of their typed current counts; historical counts in reconciliation histories stay, each with its SHA;
- the In Review stories whose PRs are merged with the gate green can move to Done;
- the Programme Dossier Contract's items 10, 13 and 14 (Jira hierarchy, checkpoint, delivery authority) are satisfied by links to the repository for TCX programmes;
- spec 001 T111 (the leak scan over the real `dist`) runs in CI.

**Evidence:** `CLAUDE.md`, `src/status/block.ts`, `scripts/status.ts`, `tests/status/unit/block.test.ts`, `.github/workflows/registry.yml`, `.specify/templates/essay-spec-template.md`. Generalises the rule in `docs/confluence/README.md` that a Decision Log number is assigned at publication, not typed, to every generated fact.
