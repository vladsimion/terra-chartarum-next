Programme dossier for spec 008, written against the fourteen-point contract in [Programme Dossier Contract & Reconciliation Register](https://vladsimion.atlassian.net/wiki/spaces/~7012186ee7d7085f34fff9bc2bf8fbe8de309/pages/18481169), as the dossiers for specs 001 to 007 are.

## 1. Programme metadata

| | |
|---|---|
| Programme type | Instrument: the ID-preserving import of the legacy site's canonical data, the frozen archive, the redirect map and the cutover checklist |
| Status | **All four stories Done; the cutover itself has not happened and its manual steps are the editor's.** The refreshed documents (#83), Setup and Foundation (#84), User Story 1 in two parts (#85, #86), the redirect map and the Atlas legacy notice (#87), the archive patch (#88), the cutover check and baseline script (#89), Polish (#90), the FR-016 completion (#91), the field-mapping re-check at the pinned SHA (#92), the real import (#93) and the live-site baseline (#95, #96) are merged to `main`, on 19 and 20 October 2026. This page, Build Log section AB and Decision Log TC-D039 were published on 20 October 2026 (#97). |
| Jira | **TCX-44** epic (In Progress until the cutover); stories **TCX-45** (US1 import; also holds Setup and Foundation), **TCX-46** (US2 archive), **TCX-47** (US3 redirect map) and **TCX-48** (US4 cutover checklist), all Done |
| Canonical parent | A standalone page at the root of the space, as for specs 001 to 007 |
| Repository | https://github.com/vladsimion/terra-chartarum-next (public). Spec `specs/008-migration-cutover/`; code `src/migration/` (extraction, adapters, staging, inventory, redirects, archive check, cutover check, baseline), `src/registry/rules/migration.ts`, `scripts/{archive-check,cutover-check,baseline}.ts`, `archive/`, `migration/`; documents `docs/cutover.md`; decision `docs/adr/0016` |
| Successor relationship | This programme is the move itself: it imports the live site's data into the registry, turns the live site into the archive at cutover and redirects only what moved |
| Pinned snapshot | The legacy repository `github.com/vladsimion/terra-chartarum` at `e82afd990fd473a2cdf80896401bc64602a1bd29` (committed 2026-10-01 11:43 UTC), read from a fresh clone, never the editor's working copy |
| Last reconciliation | 2026-10-20 against `main` at `1a49a18` (after #98): 91 registry rules and 120 named mutations (unchanged since #84); 2449 Vitest tests in 209 files, all passing; `registry check` PASS on the repository (292 entities, 0 errors, 167 warnings). CI `gate` green on #97. Cutover date: not yet. |

## 2. Purpose / thesis

How does a scholarly publication move to a new platform without breaking a citation? The falsifiable claim: **every record of the live site arrives in the registry with the identity it had, held, passing the integrity gate; an old URL either keeps working where it is or goes to exactly one new address; running the import again changes nothing; and nothing is overwritten that the editor has since touched.**

## 3. Scope and non-goals

### In scope
- One adapter per legacy registry, run as the v1 profile: maps, cartographers, the live bibliography (as Sources pointing at minted entries), toponyms (as places), layers and their release assets (as datasets), collections, and the Dacia anchor (the 40 pilot places and the 12 Trench A sources, with the two Roman Dacia layers). Everything imported is `held`.
- A pinned snapshot read by static extraction (never executed), staged to a folder with a report, then added to the registry by an `--apply` that only creates files.
- The redirect inventory (every old URL, one outcome), the rule file for the archive project, and the Atlas `from=legacy` notice.
- The archive patch (banner, `noindex`, link back) and its check; the cutover check, its checklist document and the live-site baseline script.

### Non-goals
- Other programmes (VMN, HSE, Antarctica, Crusades, the rest of CND) and CND attestations: they stay in the archive and arrive as their own profile. Room prose: written in the successor. Copying any image binary. Changing the legacy repository or the live site from here.

## 4. Outputs / deliverables

`src/migration/` (snapshot, extract-ts, read-csv, year-to-edtf, vocab, entries, adapters, profile, stage, import-legacy, inventory, redirects, essay-links, archive-check, cutover-check, baseline, commands); `src/registry/rules/migration.ts` (`MIG-SLUG`, `MIG-LEGACY`, `MIG-IMAGE-CLEARED`), the `legacy_*` fields on the schemas, the `registry` commands `import-legacy`, `inventory` and `archive-redirects`; `scripts/archive-check.ts`, `scripts/cutover-check.ts`, `scripts/baseline.ts`; `archive/{banner.html,_headers,README.md}`; `docs/cutover.md`; `vocab-mappings/cnd.yaml`; `migration/{import-manifest.json,essay-links.json}`; the 285 imported records under `content/` and `data/layers/`.

## 5. Research, sources and rights framework

The importer carries rights through and never grants them. Images are not copied: each becomes an `images[]` entry at its address on the frozen archive, with the credit as attribution and the licence text, and `reproduction_cleared` false, so the viewer withholds it until the editor clears it (`MIG-IMAGE-CLEARED`). Missing rights are warnings on the remediation list (35 `RIGHTS-MISSING`), not guesses. A private value is dropped by name before it reaches a record. The Dacia specialist terms stay as the source wrote them (`geometry_provenance` beside `vocabulary: cnd`) and a mapping file says what each means in the shared vocabulary; the geometry terms are an editorial reading for the editor to confirm.

## 6. Evidence and data architecture

ADR 0016. The slug equals the legacy local-id; the id is `tc:tc:<family>:<local-id>`. Every record is `origin: legacy`, `held`, `researching`; the legacy review state, reviewer and normalisation method survive as `legacy_*` fields; a map keeps its record scope, custody and publication status. A bibliography item becomes a Source that points at a minted entry through spec 006's duplicate matcher. The import never overwrites: a file the registry already has is skipped if identical and listed as "changed upstream" if not. The redirect inventory is built from the snapshot's routes and the registry, so a published rebuilt essay switches its own outcome.

## 7. Essay and editorial architecture

Essays are rebuilt natively, not imported. `essay-links.json` records which legacy essay pages cite which imported records, so a rebuilt essay can be wired up. An unrebuilt essay's old URL is served in place by the archive; a rebuilt, published and released essay with a `legacy_url` gains one redirect rule in the same pull request that publishes it.

## 8. Interaction and technical implementation

### 8.1 Seams (where tests live)
1. The pure modules in `src/migration/` over a snapshot directory (a trimmed fixture shaped like the legacy repository): extraction, each adapter's mapping, the year conversion, the inventory, the rule generator, the archive and cutover comparisons, the baseline summary.
2. The `registry` commands end to end over a registry root and the fixture (staging, apply, re-run, hand edits).
3. The registry through `validateRegistry` for the three new rules, each with named mutations. The Atlas notice through a Playwright spec on spec 005's page.

### 8.2 Rules that tests enforce
- Running the import twice gives byte-identical staging and an empty `--apply`; a hand-edited record is untouched and the upstream change is listed.
- No legacy ID changes; no image binary is added; a term with no vocabulary mapping fails the import naming the term, the vocabulary and the record.
- Every old URL has exactly one outcome; the generator fails when a target is not a built page, and refuses a stale inventory.
- `cutover:check` fails on each broken fixture (a stub page, a dead link, an inventory URL with no rule, an extra or duplicate or dangling rule, a failed gate, an absent or red CI run, an unpublished anchor essay) and names it.

### 8.3 CI and repository
Nothing here runs the network in CI. `archive:check` and `baseline` are run by hand. `cutover:check` reads the `registry` workflow run with `gh` for the Lighthouse step. The Atlas legacy notice has a Playwright spec in the existing Atlas run.

## 9. Implementation phases and dependency model

Documents refreshed against the real snapshot (a grill), Setup and Foundation, US1 (extraction and mapping, then adapters with staging and apply), US3, US2, US4, Polish, then the real-snapshot steps: the mapping re-check at the pinned SHA (T003), the import itself (T028) and the live-site baseline (T042). The adapters needed the Foundations of specs 004 (map fields), 005 (layers, collections, places) and 006 (the bibliography matcher), and the Atlas notice needed spec 005's page.

## 10. Jira hierarchy and reconciliation history

TCX-44 holds TCX-45 to TCX-48. The 2026-10-17 documents were corrected on 2026-10-19 after a grill against the real snapshot: 27 layers, not 16; the toponym mapping rewritten from the real keys; the Dacia scope fixed at the 40 pilot places, the 12 Trench A sources and the two Roman Dacia layers; the 27 legacy `/atlas/layers/<layer>/` pages are Handbook documents and stay in place, so only `/atlas/` with a query redirects (to `/atlas/?from=legacy`). Corrections found while building, each fixed test first: the CND geometry term had been checked but not kept (#91); the Dacia mapping tables were missing from the contract and five CND source columns were dropped without being reported (#92); and the real import found two defects the fixture could not, below.

**Found on the real snapshot (#93).** (1) An inline citation with no year matches nothing in the matcher, so each run minted it again and a re-apply moved the citing maps and sources to the new entries; the importer now recognises the site's own citation text as the entry it made before. (2) A journal article and its replication data were merged into one entry by the weak key (author, year, first six title words); the importer stored the DOI only in `URL`. It now sets `DOI` from a doi.org address, and the matcher never weak-matches two works whose DOIs both exist and differ. The import now has no weak match.

## 11. Programme acceptance criteria

- Every acceptance scenario of US1 to US4 has a passing automated test written first.
- The integrity gate passes on the real import (0 errors); the 167 warnings are the editor's remediation list (80 `FAM-REQUIRED`, 52 `AUTO-UNADJUDICATED`, 35 `RIGHTS-MISSING`).
- A second and third `--apply` on the real snapshot write nothing.
- No `[NEEDS CLARIFICATION]` remains in the spec.
- Not yet met, by design: `cutover:check` passes on the real registry. It is expected to fail until the author finalises the seven room introductions and publishes the anchor essay.

## 12. Verification ledger

| Claim | Evidence |
|---|---|
| Static extraction, CSV, snapshot manifest, year to EDTF | `tests/migration/unit/extract-ts.test.ts`, `read-csv.test.ts`, `snapshot.test.ts`, `year-to-edtf.test.ts` |
| Each adapter's mapping; every record legacy, held, researching, with its id and slug | `tests/migration/unit/adapters.test.ts` |
| Vocabulary mapping; an unmapped term fails; the original term is kept | `tests/migration/unit/vocab.test.ts`, `adapters.test.ts` (Dacia profile) |
| What is dropped or set aside is reported by name and count | `tests/migration/unit/drops.test.ts` |
| Re-run is byte-identical and empty; no overwrite; hand edits kept; no image binary; a re-apply of a year-less citation mints nothing | `tests/migration/integration/import-legacy.test.ts`, `ids-unchanged.test.ts` |
| Three new rules, a named mutation each | `tests/registry/unit/mig-slug.test.ts`, `mig-legacy.test.ts`, `mig-image-cleared.test.ts`, `migration-schema.test.ts`, `mutations.ts` |
| An article and its replication data are two entries | `tests/bibliography/unit/match.test.ts`, `tests/migration/unit/adapters.test.ts` |
| Redirect inventory and rule file | `tests/migration/unit/inventory.test.ts`, `redirects.test.ts`, `integration/inventory-cli.test.ts` |
| Atlas `from=legacy` notice | `tests/atlas/unit/view-url.test.ts`, `tests/atlas/e2e/legacy-notice.spec.ts` |
| Archive banner, header and link; the check | `tests/migration/unit/archive-patch.test.ts`, `integration/archive-check.test.ts` |
| Cutover check; baseline summary | `tests/migration/unit/cutover-check.test.ts`, `baseline.test.ts` |
| The live-site baseline | `docs/baseline/live-site-2026-10-20.json`: six templates (home, an essay, a collection record, the Atlas, the bibliography, a cartographer), Lighthouse 12.6.1 mobile profile, one run each, #96. Against the successor's ADR 0004 budgets, the live site's LCP is over 2.5 s on four of the six (home 2.65 s, essay 3.32 s, Atlas 3.05 s, cartographer 2.50 s); the Atlas also scores 96 for accessibility, with 2462 ms total blocking time and 272 KB of script. A comparison, not a gate. |
| The real import | `migration/import-manifest.json` (snapshot `e82afd9`, 285 records), `registry check` PASS, #93 |
| Not verified | `cutover:check` on the real registry (expected to fail until the copy and the anchor essay are final); `archive:check` against live URLs (by hand, at cutover); the Atlas legacy notice in Firefox and WebKit locally (CI runs them) |

## 13. Canonical ownership and propagation

Owned here: the import, the three `MIG-*` rules and the `legacy_*` fields, the redirect inventory and rule file, the archive patch, the cutover check and checklist, the baseline script. Spec 001 owns the registry and its rule table (three rows added). Spec 006 owns the duplicate matcher; the DOI guard was added to it here. Spec 005 owns the Atlas page and view-address module, which now ignore and report `from`. Spec 002 owns `shell:check`, which the cutover check runs. The Build Log carries the shipped work; the Decision Log carries the migration decision (ADR 0016) as TC-D039.

## 14. Current checkpoint and delivery authority

All code is merged and the real import is in the repository, held. The live-site baseline (T042) was recorded by the editor on 20 October 2026; Chrome had to be pointed at Playwright's Chromium with `CHROME_PATH` (#95). Left for the editor: the 167 remediation warnings; the manual steps in `docs/cutover.md`, each signed (apply the archive patch and run `archive:check`, apply the redirect file to the archive project by pull request, image rights, the custom domain, the after-switch sample); and the author's work (seven room introductions, the anchor essay). To confirm: the anchor essay's slug that `cutover:check` looks for (default `terra-sigillata-trench-a`). Open follow-ups from the code review (judgement calls, `tasks.md` T045): a slug collision names the id and not both records; a `deepzoom` image type the spec says is not needed; the `trench_a_stela` selector to verify against the real `sources.csv`; the local-id split repeated in four places and `_redirects` parsed in four places; expected errors matched by message in `commands.ts`. Delivery authority: Vlad merges. The four stories are Done; the epic closes with the cutover.
