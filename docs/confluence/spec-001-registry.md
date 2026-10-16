# Terra Chartarum Next — Spec 001: Scholarly Registry & Integrity Gate

| | |
|---|---|
| **Status** | Implemented on `main` (PR #1, PR #2). Dates and tombstones in review (PR #3). As of 2026-10-16. |
| **Repository** | https://github.com/vladsimion/terra-chartarum-next (public) |
| **Jira** | Epic TCX-2; stories TCX-13 (US1), TCX-15 (US3), TCX-14 (US2), TCX-17 (US5), TCX-16 (US4) |
| **Spec and design** | `specs/001-scholarly-registry/` (spec, plan, research, data model, contracts, quickstart, tasks) |
| **Decisions** | ADR 0006 (registry identity and record model), ADR 0007 (historical dates use EDTF); ADRs 0001–0005 are the shared contracts |
| **Stack** | TypeScript (strict), Zod, YAML files, Vitest; no framework yet (Astro arrives with spec 002) |

## 1. What this is, in one paragraph

Every scholarly entity on the site (a map, a place, a source, an essay, a piece of evidence) has **one immutable ID and one canonical record**, stored as a file. The records form **one linked graph**. A command, the **integrity gate**, reads them all, checks hundreds of rules, and **fails the build** when a reference is broken, a claim has no provenance, a secret would leak, or a rule about uncertainty is broken. It is the foundation every other spec builds on: essays, the Atlas, the catalogue and the bibliography only ever *refer* to records; they never copy them.

The historical question it serves (Constitution I): *How can every claim on the site be traced to the evidence that supports it, at the level of detail the evidence allows?*

## 2. How we got here

| Step | What happened | Output |
|---|---|---|
| Grill | `/grill-with-docs`: 20 questions in four rounds, every recommendation accepted | ADR 0006, GLOSSARY, `GRILL-AGENDA.md` |
| Clarify | Decisions written into the spec; one more question (how two branches minting the same ID collide) | spec 001 Clarifications |
| Plan | Constitution check passed; 11 research decisions; data model and contracts | `plan.md`, `research.md`, `data-model.md`, `contracts/` |
| Tasks | 98 tasks, test-first, one phase per user story | `tasks.md` |
| Analyze | 21 findings, 0 critical; the 7 high ones fixed before implementing | tasks and contracts amended |
| Implement | Vertical slices US1 → US3 → US2 → US5 → US4, red then green | `src/registry/`, `tests/registry/` |
| PR #1 | Merged 2026-10-16: 453 tests | `main` |
| Code review | Two axes (Standards, Spec): 17 spec findings, 7 standards smells (one defended as deliberate) | PR #2 |
| PR #2 | Review fixes, merged: 535 tests | `main` |
| Discovery | A second, parallel implementation of the same spec existed on `001-scholarly-registry` | comparison, section 9 |
| PR #3 | Ports the parallel branch's EDTF dates and tombstones: 607 tests | open |

## 3. Decisions

Full text in `docs/adr/`. Summary of ADR 0006 (identity and record model) and ADR 0007 (dates):

| # | Decision | Why |
|---|---|---|
| 1 | **IDs**: `tc:{authority}:{family}:{local-id}`. New IDs are opaque counters (`place-000123`) minted by `registry mint`; legacy IDs are kept verbatim. Two branches that mint the same number are caught by the duplicate rule; an ID is immutable only once on `main`. | IDs must never depend on a title; legacy IDs must survive migration |
| 2 | **Storage**: one YAML file per entity, `content/<family>/<local-id>.yaml`; the filename is the ID, so a rename never moves a file. Geometry stays in GeoJSON files referenced by path. | Readable diffs, no database (Constitution VII) |
| 3 | **Release is separate from lifecycle**: `held` (default) or `released`. Public means *published and released*. | A finished record can still be kept private |
| 4 | **Evidence records are first-class entities** with their own ID, pointing at a target and a source. Essays and layers cite them; they never embed provenance. | One canonical home per fact (Constitution V) |
| 5 | **URL stability**: slug history gives one 301 per former slug; a superseded record keeps its address as a *tombstone* linking to its live successor. | An old citation must land on the record it cited |
| 6 | **Progressive strictness**: ID, family, lifecycle and references are always errors; provenance, rights and locators are errors from `ready_for_build`, warnings below. | Early research can be registered without being blocked |
| 7 | **Silence is an attestation** (`form = silence`) with exactly one typed state; never `secure` without verified source coverage. | Absence is evidence, not a null |
| 8 | **Automated extractions** (OCR/HTR/LLM) keep a logged transformation chain and need a named person's adjudication before publication. | Constitution VI |
| 9 | **Integrity report**: versioned JSON plus an accessible HTML page, stable rule IDs, warnings counted but never failing. | Tests and CI assert on rule IDs, not message text |
| 10 | **Closed family list**: essay, map, cartographer, place, source, attestation, dataset, layer, collection, route, event, period, room, bibliography_entry, evidence. The seven rooms are fixed entities. | A new family needs a spec amendment |
| 11–14 | **Legacy import**: legacy ID pattern preserved; `port` imports as a `place`; legacy confidence maps high→probable, medium→possible, low→conjectural and is never auto-`secure`; imports start at `researching` and are held until an editor *confirms* them by name and date. | Nothing is silently promoted |
| 15 | **Private fields** live in a separate block; public output is projected from a per-family allowlist, so a new field is private by default; a post-build scan checks the output. | Constitution (private acquisition details) |
| 16 | **Dates are EDTF** (ADR 0007): levels 0–1, four-digit signed years; precision is *derived*, never authored. | Uncertainty is data (Constitution III); one standard in TypeScript and R |
| 17 | **External links** (`same_as`) are `{authority, id}`, validated by syntax only; the gate never touches the network. | Deterministic, offline builds |

### Amendments made after review (2026-10-16)
- The ID family segment allows `_` (so `bibliography_entry` fits); every legacy ID still matches.
- An import is confirmed only by `editor_confirmed: true` **with** `confirmed_by` (a person) and `confirmed_on`. A bare flag confirms nothing.
- `superseded` records rank as `ready_for_build` for severity: provenance and rights still bind them; publication-only checks do not.
- `RIGHTS-MISSING` covers evidence, layer, dataset, map, attestation and essay. A place is an authority record; its rights ride on its sources and evidence.
- The leak scan also matches HTML-, JSON- and URL-escaped copies of a private value and the page address of a non-public entity. Titles are not scanned (free text, too many false hits).

## 4. How it works

### 4.1 Layout
```
content/<family>/<local-id>.yaml     canonical records, one per entity
provenance/<step>.yaml               logged automated steps (OCR/HTR/LLM)
src/registry/
  load.ts          files -> records (structure only)           seam 1
  validate.ts      records -> report, pure, no I/O              seam 2
  check.ts         load + validate + load errors in one report
  rules/           one module per rule group (registered in rules/index.ts)
  schemas/         Zod shapes per family, reference-field table
  dates.ts         EDTF parsing, derived precision, ordering
  publication.ts   the one definition of "public"
  project.ts       allowlist projection of public records
  reverse.ts       "Cited in" / "Used by"
  redirects.ts     slug history -> 301 rules, tombstones, _redirects text
  leak-scan.ts     post-build scan of the built output
  mint.ts          next local-id
  synthetic.ts     deterministic synthetic registry (tests and timing)
  cli.ts           registry check | mint | scan | synth       seam 3
tests/registry/    unit, integration, fixtures, mutations, timing
```

### 4.2 The three seams (where tests live)
1. `loadRegistry(root)`: reads files, checks **structure only**, returns records plus load errors and three indexes (logged steps, GeoJSON feature ids, existing assets). Anything it cannot read comes back as a load error instead of throwing.
2. `validateRegistry(records, options)`: **pure**: no disk, no network, deterministic. Every rule runs here. Enumerated values are checked by the rules, so a record built in a test and a record loaded from disk are judged the same way.
3. The CLI: a thin wrapper that sets the exit code (`0` ok, `1` errors found, `2` tool failure) and writes the reports.

### 4.3 Severity
Each rule declares the lowest lifecycle at which it is an **error**; below that the same finding is a **warning**. Lifecycle order: proposed, researching, verified, ready_for_build, in_build, qa, publishable, published. `blocked` ranks as `proposed`; `superseded` ranks as `ready_for_build`. The rank table is typed against the vocabulary, so a new lifecycle value cannot silently rank as `proposed`.

### 4.4 What "public" means
Public = lifecycle `published` **and** release `released` (`publication.ts`). Projection, reverse relationships and redirects all decide through that one function. Public output is built from an allowlist per family; references to non-public records are dropped; evidence about a non-public entity is left out entirely.

### 4.5 Dates (ADR 0007)
`valid_from` / `valid_to` are EDTF: `0106`, `-0106`, `1595-03`, `159X` (decade), `15XX` (century), `1595?` (uncertain), `1595~` (approximate), `1595/1602` (range). Precision (day, month, year, decade, century, range) is derived from the value. Times of day, seasons, long years and millennia are rejected. `DATE-ORDER` fails only when the start is *definitely* later than the end, so imprecise dates that might overlap pass.

### 4.6 Superseded records and tombstones
A superseded record keeps its own address as a tombstone page that links to its live successor (or to nothing). Its former slugs redirect to the tombstone, never past it. Nothing redirects away from a retired address. A held or missing successor is never named.

## 5. Rules reference

Every rule has a stable ID, a lifecycle threshold ("From": the lowest lifecycle at which it is an error) and a named mutation test. `PRIV-LEAK` is raised by the output scan and `LOAD-PARSE` by the loader; the other rules run in the validator.

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

**Adding a rule** takes three things, and a test fails if any is missing: the rule registered in `rules/index.ts`, a row in `contracts/rule-ids.md` (with the same threshold), and a named mutation in `tests/registry/support/mutations.ts` that must trigger it *as an error*.

## 6. Running it

```bash
npm ci                                                   # Node 24, see .nvmrc
npm test && npm run typecheck                            # all tests, strict TypeScript
npm run registry -- check --dir <root> --out reports     # validate <root>/content
                                                         #   -> reports/integrity-report.json and .html
npm run registry -- mint place                           # next unused local-id, e.g. place-000124
npm run registry -- scan dist --dir <root>               # fail if built output leaks a private value
npm run registry -- synth 5000 --seed 1 --out /tmp/s     # deterministic synthetic registry
```

- **CI** (`.github/workflows/registry.yml`): typecheck, tests, then the gate on `content/` when it exists; the report is uploaded as an artefact.
- **`main` is protected**: the `gate` check is required (admins are not enforced, no review requirement).
- The repository is **public**: never commit real records with `private:` fields. The leak scan covers built output, not the source files.

## 7. Verification

| Check | Result |
|---|---|
| Tests | 607 in 42 files (535 on `main` until PR #3 merges) |
| Strict typecheck, `npm audit` | clean, 0 vulnerabilities |
| SC-002: rename a title and slug | no ID changes, no broken link, one redirect per former slug |
| SC-003: seeded broken records | 65 named mutations, each must trigger its rule as an error; a no-op or silent mutation fails the suite |
| SC-004: 5,000 entities in under 60 s | 5,007 entities: about 80 ms in memory, about 2.2 s from disk including load |
| Rule table, code and mutations | kept in step by a meta-test |
| Symlink and `../` escapes | tested with a real symlink |

## 8. Code review (two axes) and what came of it

**Standards**: no hard breaches; seven judgement smells (one, plain-string fields on records, is deliberate and documented). The rest were fixed: the "public" test was written three times (now one function), the lifecycle rank table could silently mis-rank a typo, the CLI repeated its usage guard, and some test names and numbers were weak.

**Spec**: 9 implemented-but-weak or wrong, 5 missing, 3 small scope items. Fixed in PR #2:

| Finding | Fix |
|---|---|
| A live record could take a superseded record's slug; its redirect then shadowed the new page | A superseded record's slug stays claimed |
| `editor_confirmed` was a hand-set flag that switched the import rules off | A confirmation needs a named person and a date (new rule) |
| `llm_assisted` rows were never treated as unadjudicated | They need adjudication before they can be publishable |
| The leak scan missed escaped copies and non-public page addresses | Both are matched |
| Attestations and essays could be published without rights | Rights are required there too |
| A symlink inside the root could read a file outside it; `../` was skipped silently | Real-path containment; escapes are reported |
| An essay's `maps[]` could point at a place | New typed-reference rule |
| The reverse map's keys could be held IDs | Public targets only |
| No `_redirects` output | Renderer that refuses paths that could inject rules |

**Deliberately deferred**: the exact shape of `consulted_copy` (edition plus scan URL or shelfmark), withdrawn-page rendering (spec 002), running the leak scan in CI once a build exists, and a few low-priority tidy-ups.

## 9. Two implementations of the same spec

While this was being built, a **second, complete implementation of spec 001** was being written on branch `001-scholarly-registry` (24 commits, Astro-based, its checklists already in Jira). This side found out when it read the Jira stories. The two were compared read-only:

| | `main` | `001-scholarly-registry` |
|---|---|---|
| Tests | 535 → 607 with PR #3 | 205 (its own `npm test`) |
| Rule codes | 46 → 48 | 17 |
| Source size (at the time of the comparison) | about 3,100 lines | about 1,350 lines |
| Astro and build wiring | none yet | build gate that aborts the site build, `relations.json`, leak scan on the built site |
| ID minting | yes | not found |
| Dates | EDTF (after PR #3) | EDTF |
| Superseded record | tombstone (after PR #3) | tombstone |

**Recommendation (made 2026-10-16):** keep `main` as the base, retire the branch as a line of work, and port what it got right. It was right about two things, now ported in PR #3: **EDTF dates** (it showed that integer years with a separate precision field can contradict themselves and cannot express uncertainty) and **tombstones** (spec 002 FR-011). Still to port: the Astro build gate, `relations.json`, specialist vocabulary mappings, and a cross-check of its fixtures against this gate. The branch should be tagged `archive/001-parallel-implementation` once that is done; deleting it needs an explicit decision.

## 10. Jira

| Key | Story | Status | Note |
|---|---|---|---|
| TCX-2 | Epic: registry and integrity gate | In Progress | Both implementations' checklists are on it |
| TCX-13 | US1 stable identity | In Review | |
| TCX-15 | US3 linked graph | In Review | |
| TCX-14 | US2 evidence and uncertainty | In Review | |
| TCX-17 | US5 lifecycle and publication authority | In Review | |
| TCX-16 | US4 reverse relationships | In Review | |

Each story has two checklists: the parallel branch's original one, and below it the one for `main` (numbered independently). **No story is Done**: the existing ticks describe work that is not all on `main`. They move to Done after the branch decision and the remaining ports.

## 11. Open items

| Item | Owner / next step |
|---|---|
| Decide the fate of branch `001-scholarly-registry` | Vlad: tag and retire after the ports (recommended) |
| Merge PR #3 (EDTF dates and tombstones) | Vlad |
| Cross-check the branch's fixtures against this gate (T117) | next |
| Specialist vocabulary mappings (T118; spec edge case) | next |
| Astro build gate, `relations.json`, scan in CI (T119) | with spec 002 |
| `consulted_copy` structure | needs a decision |
| Move TCX-13 to TCX-17 to Done | after the branch decision |

## 12. Lessons

- **Check for parallel work before starting.** Two efforts implemented the same spec on the same day. A remote branch with that spec number already existed, and the Jira epic named it; listing remote branches and reading the epic first would have caught it.
- **Recommendations get better when two designs meet.** The grill's integer-year dates were weaker than the parallel branch's EDTF; comparing exposed that.
- **Mutations beat coverage.** Requiring every rule to fail *as an error* under a named mutation found rules that fired only as warnings, and a meta-test keeps the rule table honest.

## 13. Where to look

- Spec: `specs/001-scholarly-registry/spec.md` · plan, research, data model: same folder · rule contract: `contracts/rule-ids.md`
- Decisions: `docs/adr/0006-registry-identity-and-record-model.md`, `docs/adr/0007-historical-dates-use-edtf.md`
- Shared language: `GLOSSARY.md` · principles: `.specify/memory/constitution.md`
- Tasks and what is deferred: `specs/001-scholarly-registry/tasks.md` (Phases 9 and 10)
- Walkthrough: `specs/001-scholarly-registry/quickstart.md`
- PRs: #1 (implementation), #2 (review fixes), #3 (EDTF dates and tombstones)
