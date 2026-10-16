Programme dossier created against the fourteen-point contract in [Programme Dossier Contract & Reconciliation Register](https://vladsimion.atlassian.net/wiki/spaces/~7012186ee7d7085f34fff9bc2bf8fbe8de309/pages/18481169/Programme+Dossier+Contract+Reconciliation+Register) §1, per its §7 maintenance rule. Facts below were checked on **2026-10-16** against the repository, Jira and CI; claims marked **[VERIFY]** have not been checked and say what would check them.

## 1. Programme metadata

| | |
|---|---|
| Programme type | Platform foundation: build-time scholarly registry and integrity gate for the Terra Chartarum successor build |
| Status | **Implemented on `main`** (PR #1, #2 and #3 merged, `gate` green). Parallel implementation unresolved (§10). |
| Jira | **TCX-2** epic; stories **TCX-13** (US1), **TCX-15** (US3), **TCX-14** (US2), **TCX-17** (US5), **TCX-16** (US4). Project TCX is the successor; KAN is the original site. |
| Canonical parent | **None: a standalone page at the root of the space**, moved out from under Projects at Vlad's request on 2026-10-16. The contract (§7) places dossiers under Projects — Active Research & Implementation Programmes and its harmonisation DoD wants every programme linked from that index; this page is therefore not listed there. |
| Primary canonical ownership | Volume VIII (software and data contracts); Volume VI (provenance, uncertainty, rights); Volume IV (research-to-publication workflow) |
| Repository | https://github.com/vladsimion/terra-chartarum-next (public). Spec `specs/001-scholarly-registry/`; code `src/registry/`; decisions `docs/adr/0006`, `0007` |
| Successor relationship | Supersedes the registry code of terra-chartarum.pages.dev at cutover (ADR 0001); legacy IDs are preserved (ADR 0006 items 11–14) |
| Last reconciliation | 2026-10-16 (dossier creation; refreshed after PR #3 merged and the Build Log and Decision Log were updated) |

## 2. Purpose / thesis

Every claim on the site must be traceable to the evidence that supports it, at the level of detail the evidence allows (the spec's historical question, Constitution I). That is only possible if every scholarly entity has **one immutable ID and one canonical record**, if the records form **one linked graph**, and if **uncertainty is data** (dates, geometry provenance, confidence, reconstruction, silence) and not prose.

The falsifiable claim the programme has to defend: **a broken reference, a claim with no provenance, a leaked private value, or a rule about uncertainty that is silently skipped, cannot reach the published site.** The integrity gate fails the build instead. The test of that claim is the mutation suite (§12): every rule is exercised by a seeded breakage that must fail as an error.

## 3. Scope and non-goals

### In scope
- Entity families (15, a closed list), stable IDs and minting, one YAML file per entity, slug history and tombstones.
- Evidence and uncertainty as data: locators and verification, confidence, geometry provenance, EDTF dates, silence, rights, automated-extraction chains.
- A linked graph with typed references, build-time integrity checking, a versioned report (JSON and HTML), lifecycle and release rules, public projection, reverse relationships, a leak scan.
- The CLI (`check`, `mint`, `scan`, `synth`) and the CI gate.

### Non-goals
- **No site, no UI, no Astro.** Display of any of this to readers belongs to specs 002–005. The module is framework-free so the shell can import its schemas.
- **No import adapters.** Reading the live site's data is spec 008; this spec owns only what an imported record must look like (ADR 0006 items 11–14).
- **No bibliography authoring.** CSL-JSON entries and citation export are spec 006.
- **No database, no network.** The gate is deterministic and offline (Constitution VII). External links (`same_as`) are checked by syntax only.
- **No essay prose.** Essays are views over shared evidence; the registry holds only their stage, references and rights.
- **Not two implementations to maintain.** The recommendation (§10.2) is to retire the parallel branch after porting; that decision is pending.

## 4. Outputs / deliverables

| Output | State |
|---|---|
| `src/registry/` module (loader, pure validator, rules, projection, reverse relationships, redirects and tombstones, leak scan, minting, synthetic registry, CLI) | On `main` |
| 48 rule IDs, each with a threshold and a named mutation | On `main` |
| Integrity report: versioned JSON (schema in `contracts/`) and accessible static HTML | On `main` |
| ADR 0006 (identity and record model, with amendments) and ADR 0007 (EDTF dates) | On `main` |
| Spec, plan, research, data model, contracts, quickstart, tasks (Phases 1–10) | On `main` |
| CI workflow `registry`; `gate` is a required status check on `main` | Done |
| Confluence dossier (this page); Build Log section U; Decision Log TC-D019 to TC-D024 | Published 2026-10-16. The dossier's repository source is in a docs PR |

## 5. Research, sources and rights framework

### 5.1 Where the rules come from
The rules implement the project's own contracts, not outside research: the Constitution (principles II, III, V, VI, X), ADR 0003 (lifecycle, confidence, locator verification, stage gates, rooms), the grill of 2026-10-16 (ADR 0006) and the parallel branch's EDTF decision (ADR 0007). The historical vocabularies (silence states, confidence levels, geometry provenance) are those in `GLOSSARY.md`.

### 5.2 Locators and provenance
- A locator is `verified` only when a **person** has read the page: `verified_by`, `verified_on` and `consulted_copy` are all required. A locator found or proposed by AI, or taken from another scholar's citation, stays `pending`; a claim rated `secure` cannot rest on a pending locator.
- This is the same rule as the Decision Log's **TC-D018** (a locator may not be recorded from a secondary citation). Checked against the TC-D018 text on 2026-10-16: a locator is verified only when the pages it names have been read by this project; a work consulted only to find sources is a finding aid, not a source (`REF-FINDING-AID`); and out-of-copyright is not the same as reproduction cleared, recorded as separate fields (`RIGHTS-CLEARED`). The registry rules and the decision agree.
- Automated (OCR/HTR/LLM) output is never evidence: a logged chain of steps and a named person's adjudication are required before a record is publishable (Constitution VI; rules `AUTO-*`).
- Legacy `llm_assisted` rows count as unadjudicated automated steps until a person adjudicates them.

### 5.3 Rights
- Records that carry content (evidence, layers, datasets, maps, attestations, essays) need a licence from `ready_for_build`; images need cleared **reproduction** rights from `publishable`. Out-of-copyright text and reproduction rights are separate facts (Constitution VI).
- A place is an authority record: its rights ride on its sources and evidence.
- Private acquisition and price details live in a separate `private` block, are excluded by an allowlist projection, and are scanned for in built output (including HTML-, JSON- and URL-escaped copies).
- **The repository is public.** Real records with `private:` fields must not be committed to it. The leak scan covers built output, not source files. **[VERIFY]** where real content will live before the first real record is added.

### 5.4 Legacy source
Imports come from `vladsimion/terra-chartarum`. Its identifier contract (`data/contracts/terra-chartarum.json`) is the origin of the ID pattern; its `high/medium/low` confidence maps to probable/possible/conjectural and is never auto-`secure`.

## 6. Evidence and data architecture

### 6.1 Record model
- **ID**: `tc:{authority}:{family}:{local-id}`. Authority is `tc` or an allowlisted external code. New local-ids are opaque counters minted by `registry mint` (`place-000123`); legacy ids are kept verbatim. The filename is the local-id, so a rename never moves a file.
- **Families (closed)**: essay, map, cartographer, place, source, attestation, dataset, layer, collection, route, event, period, room, bibliography_entry, evidence. The seven rooms are fixed entities.
- **Lifecycle** (proposed … published, plus superseded and blocked) and **release** (`held` by default, or `released`) are separate. Public means published **and** released.
- **Evidence records** are first-class entities (own ID, target, source, locator, confidence, geometry provenance, rights); essays and layers cite them and never embed provenance.
- **Silence** is an attestation (`form = silence`) with exactly one typed state; never `secure` without verified source coverage.
- **Dates** are EDTF levels 0–1 with four-digit signed years (ADR 0007); precision is derived, never authored.
- **References** are typed (`REF-FAMILY`): an essay's `maps[]` point at maps, a successor is of the same family.

### 6.2 Progressive strictness
Each rule declares the lowest lifecycle at which it is an error; below that it is a warning. ID, family, lifecycle value and reference rules are always errors; provenance, rights and locator rules are errors from `ready_for_build`; publication checks from `publishable` or `published`. `blocked` ranks as `proposed`; `superseded` ranks as `ready_for_build`.

### 6.3 Geometry
Bulk geometry stays in GeoJSON files that records reference by path. Evidence about a single feature must name a feature that exists in the file (`REF-FEATURE`) and must say where the geometry came from (`PROV-GEOMETRY`). Reconstructions are always flagged (`PROV-RECONSTRUCTION`). **Modern reference geometry is never historical evidence** (`PROV-MODERN-AS-EVIDENCE`, Constitution III). Paths a record names are resolved on their real path inside the registry root; `../` and symlink escapes are refused and reported.

### 6.4 Rules reference
Every rule has a stable ID, a threshold ("From": the lowest lifecycle at which it is an error) and a named mutation. `PRIV-LEAK` is raised by the output scan and `LOAD-PARSE` by the loader; the rest run in the validator. This is the table in `specs/001-scholarly-registry/contracts/rule-ids.md` (48 rules).

| Rule ID | Checks | Spec | From |
|---|---|---|---|
| `LOAD-PARSE` | file parses as YAML and matches its schema shape | FR-005 | always |
| `LOAD-PATH` | filename equals local-id and directory equals family | FR-002 | always |
| `ID-SYNTAX` | ID matches the boundary pattern; minted IDs match counter form | US1.4 | always |
| `ID-DUPLICATE` | no two records share a canonical ID; names both files | US1.3 | always |
| `ID-AUTHORITY` | authority is `tc` or on the allowlist | FR-002 | always |
| `ID-FAMILY` | family is in the closed list | FR-001 | always |
| `ID-ORIGIN` | `origin` present; `legacy` IDs match the legacy pattern | FR-002 | always |
| `LIFE-VALUE` | lifecycle is a known value | FR-005 | always |
| `LIFE-ESSAY-DERIVED` | essay lifecycle matches its stage, not set by hand | US5.4 | always |
| `LIFE-AVAILABILITY` | `published` layer has a runnable asset | US5.5 | `published` |
| `LIFE-SUPERSEDED` | `superseded` has `superseded_by` resolving, or is withdrawn | FR-013 | always |
| `REL-VALUE` | release is `held` or `released` | FR-015 | always |
| `REF-UNKNOWN` | every declared reference resolves; names entity, field, missing ID | US3.1 | always |
| `REF-FAMILY` | a typed reference points at the right family: an essay's `maps[]` at maps, a successor of the same family; `relations[]` and an evidence target are untyped | FR-002, data-model.md "Reference fields" | always |
| `REF-FEATURE` | evidence `target.feature` exists in the geometry file | FR-003 | always |
| `REF-COLLECTION-SUBSET` | `default_layers ⊆ members` | US3.2 | always |
| `REF-FINDING-AID` | no evidence or attestation cites a source that is a finding aid | ADR 0003 §5 | `ready_for_build` |
| `ENUM-INVALID` | any enumerated field holds a known value | FR-005 | always |
| `FAM-REQUIRED` | the fields a family needs are present (data-model.md "Family fields") | FR-003 | `ready_for_build` |
| `DATE-INVALID` | `valid_from` and `valid_to` are EDTF level 0-1 with four-digit signed years (ADR 0007) | FR-003 | always |
| `DATE-ORDER` | the start is not definitely later than the end (earliest start vs latest end, so imprecise dates that may overlap pass) | FR-003 | always |
| `DATE-PRECISION-AUTHORED` | `date_precision` is derived from the date and never authored (ADR 0007) | FR-003 | always |
| `PROV-GEOMETRY` | geometry provenance present for feature targets | US2.1 | `ready_for_build` |
| `PROV-RECONSTRUCTION` | `scholarly_reconstruction` carries `reconstruction: true` | US2.1 | `ready_for_build` |
| `PROV-SOURCE` | evidence has a source and evidence type | FR-003 | `ready_for_build` |
| `PROV-MODERN-AS-EVIDENCE` | no evidence record, and no layer with role `historical`, `evidence` or `map-overlay`, has geometry provenance `modern_reference` | Constitution III | always |
| `LOC-VERIFIED-FIELDS` | `verified` requires `verified_by`, `verified_on`, `consulted_copy` | US2.2 | always |
| `LOC-SECURE-PENDING` | `secure` claim with a `pending` locator | US2.5 | always |
| `LOC-AI-VERIFIED` | AI-proposed locator cannot be `verified` without a person | FR-008 | always |
| `RIGHTS-MISSING` | rights/licence present | US2.3 | `ready_for_build` |
| `RIGHTS-CLEARED` | reproduction rights cleared for images | ADR 0003 §5 | `publishable` |
| `SIL-STATE` | silence attestation has exactly one silence state | US2.4 | always |
| `SIL-MISPLACED` | silence state only on a silence attestation | FR-004 | always |
| `SIL-SECURE` | silence rated `secure` without verified source coverage | FR-004 | always |
| `AUTO-UNADJUDICATED` | publishable record with an unadjudicated automated step | FR-008 | `publishable` |
| `AUTO-LOG` | automated step has tool, version, input, date | FR-008 | `ready_for_build` |
| `AUTO-ARTEFACT-HASH` | large artefact reference carries a checksum | FR-008 | `ready_for_build` |
| `ROOM-SET` | exactly the seven fixed rooms exist (registry-level: runs only with `completeness`, which `check` turns on) | ADR 0003 §7 | always |
| `SLUG-UNIQUE` | current slugs are unique per family, a superseded record's included (its redirect starts there) | FR-013 | always |
| `SLUG-HISTORY-COLLISION` | a former slug equals a live slug | FR-013 | always |
| `SAMEAS-SYNTAX` | `same_as` authority allowlisted and ID syntax valid | FR-003 | always |
| `PRIV-LEAK` | private value or held ID found in built output (scan) | FR-009 | n/a (scan) |
| `IMPORT-FAMILY` | `port` imports only as `place` with a port type | FR-014 | always |
| `IMPORT-CONFIDENCE` | imported claim is not auto-`secure`; `legacy_confidence` kept | FR-014 | always |
| `IMPORT-REVIEW` | imports start at `researching`; `legacy_review_state` kept | FR-014 | always |
| `IMPORT-LAYER-LIFECYCLE` | an imported layer's lifecycle matches the FR-011 mapping of `legacy_layer_status`; unknown legacy terms fail | FR-011 | always |
| `IMPORT-CONFIRMED` | a confirmed import names who confirmed it and when; an automated tool cannot confirm | FR-014 | always |
| `IMPORT-REVIEWER` | `verified_by`/`verified_on` from legacy only when `editor_confirmed` | FR-014 | always |

## 7. Essay and editorial architecture

Applies in a limited way: this spec does not own essay prose, but it fixes how an essay appears in the graph.

- An essay's **lifecycle is derived from its editorial stage**, never set by hand: Concept → proposed; Corpus, Research → researching; Outline, Draft → verified; Build → in_build; Design QA → qa (publishable once the checks pass); Publish, Cross-link → published (`LIFE-ESSAY-DERIVED`).
- An essay references maps, places, sources and evidence by ID, and may carry optional portal-dimension tags (Measure, Witness, Use, Cosmos, Power, Silence; no UI in v1).
- An essay must not own private geometry, place authorities or object descriptions (Constitution V). **[VERIFY]** this is not yet enforced by a strict essay schema (deferred review item).
- The reader-facing essay framework is spec 003.

## 8. Interaction and technical implementation

### 8.1 Three seams (where tests live)
1. `loadRegistry(root)`: files to records; checks structure only; returns load errors and three indexes (logged steps, GeoJSON feature ids, existing assets).
2. `validateRegistry(records, options)`: **pure**, no disk, no network, deterministic. Every rule runs here, on plain strings, so a record built in a test and a record loaded from disk are judged the same way.
3. The CLI: thin; exit code `0` ok, `1` errors found, `2` tool failure.

### 8.2 Commands
```
npm ci                                                 # Node 24, see .nvmrc
npm test && npm run typecheck                          # all tests, strict TypeScript
npm run registry -- check --dir <root> --out reports   # validate <root>/content -> integrity-report.json and .html
npm run registry -- mint place                         # next unused local-id
npm run registry -- scan dist --dir <root>             # fail if built output leaks a private value or a non-public id
npm run registry -- synth 5000 --seed 1 --out /tmp/s   # deterministic synthetic registry
```

### 8.3 Public output
`projectPublic` builds the public face from a per-family allowlist: a new field is private by default; references to non-public records are dropped; evidence about a non-public entity is left out. `reverseRelationships` ("Cited in", "Used by") lists only public referrers of public targets. `publication.ts` is the one definition of "public".

### 8.4 Superseded records and URLs
Each entity keeps a slug history; each former slug is one 301 to the current page, written as a Cloudflare `_redirects` file by `renderRedirects`. A superseded record keeps its own address as a **tombstone** linking to its live successor (or to nothing); its former slugs redirect to the tombstone, never past it (spec 002 FR-011; PR #3).

### 8.5 CI and repository
`.github/workflows/registry.yml` runs typecheck, tests and the gate on `content/` when it exists, and uploads the report. `main` is protected: `gate` is a required check (admins not enforced, no review requirement). **[VERIFY]** that a red `gate` actually blocks a merge; only the setting was read back, no failing PR has been tried.

## 9. Implementation phases and dependency model

Jira `Blocks` links are authoritative. Recorded chain: **TCX-1 → TCX-2**, and **TCX-2 blocks TCX-4 (003 essays), TCX-5 (004 catalogue), TCX-6 (005 Atlas), TCX-7 (006 bibliography) and TCX-44 (008 migration)**.

Within the programme, the **story order is TCX-13 → TCX-15 → TCX-14 → TCX-17 → TCX-16**, which is the order they were built in (release filtering, US5, precedes reverse relationships, US4). **The five stories have no `Blocks` links between them; the order exists only as text in the epic.** Under this register's rule that Jira links are authoritative, either the links should be added or the text accepted as the record. **[VERIFY]** which Vlad prefers; nothing was changed.

| Phase | What | Date | Result |
|---|---|---|---|
| A. Decide | Grill (20 questions, four rounds), clarify, plan | 2026-10-16 | ADR 0006, clarified spec, plan |
| B. Specify the work | 98 test-first tasks; analysis (21 findings, 0 critical, 7 high fixed) | 2026-10-16 | `tasks.md` |
| C. Build | Setup and foundation; US1 → US3 → US2 → US5 → US4; polish | 2026-10-16 | PR #1 merged: 453 tests |
| D. Review | Two-axis code review (17 spec findings, 7 standards smells) | 2026-10-16 | PR #2 merged: 535 tests |
| E. Reconcile | Parallel implementation found and compared | 2026-10-16 | §10 |
| F. Port | EDTF dates and tombstones from the parallel branch | 2026-10-16 | PR #3 merged: 607 tests |
| G. Record | Build Log section U (PR #1 to #3), Decision Log TC-D019 to TC-D024, this dossier | 2026-10-16 | Confluence |
| H. Remaining | Cross-check of the branch's fixtures (T117), specialist vocabulary mappings (T118), Astro build gate and `relations.json` (T119, with spec 002) | next | not started |

## 10. Jira hierarchy and reconciliation history

Actual keys, not planning identifiers.

| Key | Issue | Status (2026-10-16) | Note |
|---|---|---|---|
| TCX-2 | Epic: 001 scholarly entity registry & integrity gate | In Progress | Blocked by TCX-1 (Done); blocks TCX-4, 5, 6, 7, 44 |
| TCX-13 | US1 register an entity with a stable identity | In Review | |
| TCX-15 | US3 one linked scholarly graph | In Review | |
| TCX-14 | US2 record evidence and uncertainty as data | In Review | |
| TCX-17 | US5 shared lifecycle and publication authority | In Review | |
| TCX-16 | US4 reverse relationships | In Review | |

### 10.1 Two checklists per story
Each story and the epic carry **two** task checklists. The upper one belongs to the parallel branch `001-scholarly-registry` (tasks T010–T060, all ticked, commits on that branch). The lower one, appended 2026-10-16, belongs to `main` and uses `main`'s `tasks.md` numbering. They are numbered independently and describe different code. **No story has been moved to Done**: the upper ticks describe work that is not all on `main`.

### 10.2 Reconciliation: two implementations of one spec
While this programme was built, a **second, complete implementation of spec 001** was being written on branch `001-scholarly-registry` (24 commits, Astro-based). It was found when the Jira stories were read, and compared read-only on 2026-10-16:

| | `main` | `001-scholarly-registry` |
|---|---|---|
| Tests | 607 | 205 (its own `npm test`) |
| Rule codes | 48 | 17 |
| Source size at the comparison | about 3,100 lines | about 1,350 lines |
| Astro and build wiring | none yet | build gate that aborts the site build, `relations.json`, leak scan on the built site |
| ID minting | yes | not found |
| Dates | EDTF | EDTF |
| Superseded record | tombstone | tombstone |

**Recommendation (2026-10-16):** keep `main` as the base, retire the branch as a line of work, and port what it got right. It was right about two things, now merged to `main` in PR #3: **EDTF dates** (integer years with a separate precision field can contradict themselves and cannot express uncertainty) and **tombstones** (spec 002 FR-011). Still to port: the Astro build gate, `relations.json`, specialist vocabulary mappings, and a cross-check of the branch's fixtures. The branch should be tagged `archive/001-parallel-implementation` once that is done; deleting it needs an explicit decision. **[VERIFY]** the comparison was by measurement and search (size, tests, rule codes, minting), not a line-by-line audit of the branch.

### 10.3 Other reconciliation notes
- The ADR number collided: both branches added an ADR 0006. The branch's EDTF ADR is renumbered **0007** on `main`.
- The integer-year date model decided in the grill was weaker than the branch's EDTF; ADR 0006 item 16 is superseded.
- A redirect-to-successor behaviour in `main` contradicted spec 002 FR-011 and was replaced by tombstones.

## 11. Programme acceptance criteria

The per-story merge bar is the repository's Definition of Done (`CLAUDE.md`): every acceptance scenario covered by a passing test written first; integrity gate, accessibility and performance checks pass; no `[NEEDS CLARIFICATION]` left; Jira story Done with the PR linked. Programme-level success criteria from the spec:

| Criterion | State |
|---|---|
| SC-001: 100% of publishable records pass the gate on `main`; a violation blocks merge | Gate runs in CI and is a required check; no real `content/` exists yet. **[VERIFY]** blocking behaviour (§8.5) |
| SC-002: renaming a title or slug changes zero IDs and breaks zero links | Met: regression test over every fixture record |
| SC-003: every seeded breakage is caught | Met: 65 named mutations, each must fail as an error |
| SC-004: gate under 60 s on 5,000 entities | Met: 5,007 entities in about 80 ms in memory and about 2.2 s from disk |
| Stories Done with PR linked | **Not met by design**: stories stay In Review until the branch decision and the remaining ports (§10.2) |

## 12. Verification ledger

| Claim | State | Owner |
|---|---|---|
| 607 tests pass on `main` (`a4f9c2c`, the merge of PR #3) | Verified 2026-10-16 | — |
| Strict typecheck clean; `npm audit` reports 0 vulnerabilities | Verified 2026-10-16 | — |
| `registry check` passes on the valid fixture (18 entities) and on generated 1,007- and 2,007-entity registries | Verified 2026-10-16 | — |
| SC-004 timing (about 80 ms in memory, about 2.2 s from disk, 5,007 entities) | Verified 2026-10-16 | — |
| Rule table, registered rules and mutations are kept in step by a meta-test | Verified 2026-10-16 | — |
| Symlink and `../` escapes refused | Verified with a real symlink 2026-10-16 | — |
| `gate` is a required check on `main` | Setting read back 2026-10-16 | — |
| Build Log and Decision Log updates contain only my insertions | Verified 2026-10-16: each page equals its original plus the insertions; Confluence normalised only the quotation marks in the new text | — |
| A red `gate` blocks a merge | **Unverified** | Vlad |
| The branch comparison (§10.2) holds line by line | **Unverified**: measured and searched, not audited | next: T117 |
| Alignment with Decision Log TC-D018 | Verified 2026-10-16 against the TC-D018 text | — |
| The Programme Dossier Contract's items 6–8 "where applicable" reading (§7 is limited) is acceptable | **Unverified** | Vlad |
| Where real content, and its private fields, will live given a public repository | **Unverified** | Vlad |
| Essay strictness (no geometry or object descriptions of its own) | **Unverified**: not enforced | deferred review item |

## 13. Canonical ownership and propagation

| Knowledge | Canonical home |
|---|---|
| Registry software and data contracts (record model, rule IDs, CLI, module API) | Volume VIII |
| Provenance, uncertainty, locator verification, rights, EDTF dates | Volume VI |
| Research-to-publication workflow; essay stage to lifecycle mapping | Volume IV |
| Roadmap, dependencies, current delivery state | Volume IX |
| Cross-programme decisions: ADR 0006 (identity, record model, release vs lifecycle), ADR 0007 (EDTF dates), tombstones for superseded records | Decision Log |
| Cross-programme risks: two implementations of one spec; a public repository holding scholarly records | Programme Risk Register |
| Shipped work: PR #1 and PR #2 (green CI) | Build Log |

**Propagated 2026-10-16.** The Build Log has a new **section U** (the successor build, PR #1 to #3) and a header pointer; it is scoped to the successor repository and does not claim to reconcile the original one. The Decision Log has **TC-D019 to TC-D024**: release state separate from lifecycle, EDTF dates, minted IDs with legacy IDs verbatim, tombstones, private-by-default public output, and import confirmation. **Not yet propagated:** the Programme Risk Register (two implementations of one spec; a public repository holding scholarly records) and the reconciliation entry in the Programme Dossier Contract register §3. Both are existing shared pages and were left untouched.

This dossier retains only programme-specific rationale, the reconciliation record and the rule reference. The full text of the decisions is in the repository's ADRs, and the working specification in `specs/001-scholarly-registry/`.

## 14. Current checkpoint and delivery authority

**Checkpoint (2026-10-16).** `main` is at the merge of PR #3 (`a4f9c2c`): the registry, all five stories, the review fixes, EDTF dates and tombstones; 607 tests, `gate` green and required. The Jira stories are In Review. A docs PR holds this page's repository source. Open: the fate of branch `001-scholarly-registry`; the cross-check of its fixtures; specialist vocabulary mappings; the Astro build gate (with spec 002); the `consulted_copy` shape; adding or declining `Blocks` links among the stories.

**Authority.** Jira `Blocks` links are authoritative for executable dependencies; Jira and Volume IX are authoritative for current delivery state; the Build Log records only work actually shipped. This page is not the delivery record.
