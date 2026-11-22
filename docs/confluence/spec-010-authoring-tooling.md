Programme dossier for spec 010, written against the fourteen-point contract in [Programme Dossier Contract & Reconciliation Register](https://vladsimion.atlassian.net/wiki/spaces/~7012186ee7d7085f34fff9bc2bf8fbe8de309/pages/18481169), as the dossiers for specs 001 to 009 are.

## 1. Programme metadata

| | |
|---|---|
| Programme type | Tooling: four maintainer tools that remove authoring friction without weakening a validation rule; no automation writes a canonical record |
| Status | **Under way.** Grilled (#122, ADR 0018 and ADR 0019), specified (#125), planned and tasked (#126), analysed and amended (#127). **US1, `registry new <family>`, merged with #127 (21 November 2026; TCX-62 Done). US2, the dependents graph and `registry deps`, merged with #136 (22 November 2026). US3, editor schemas, built on #138 and carried to `main` by #140. US4, the link and manifest checker, built on #141.** |
| Jira | **TCX-59** epic (In Progress); stories **TCX-62** (US1 scaffolding), **TCX-63** (US2 dependents), **TCX-61** (US3 editor schemas), **TCX-64** (US4 link and manifest checker); **TCX-65** (the grill's carried checks, Done, #125); TCX-60 (the grill, Done) |
| Canonical parent | A standalone page at the root of the space, as for specs 001 to 009 |
| Repository | https://github.com/vladsimion/terra-chartarum-next (public). Spec `specs/010-authoring-tooling/`; code so far `src/registry/{checklist,new-record,scaffold}.ts` and the `requires` declarations on the rules; decisions `docs/adr/0018`, `docs/adr/0019` |
| Last reconciliation | 2026-11-21, US1 on `claude/modest-noether-nlycur`. The counts this spec does not own are generated below. |

<!-- status:begin -->
- Registry rules: 102
- Named mutations: 134
- Entities: 327 (0 errors, 112 warnings)
<!-- status:end -->

## 2. Purpose / thesis

How can one maintainer keep every claim traceable to its evidence as the registry grows, without loosening the rules that make it traceable? The falsifiable claim: **no ID is typed by hand; the checklist a new record carries is exactly what the gate will ask of it; the editor sees what a correction touches before making it; typos are caught in the editor; a dead citation becomes a ticket within eight days; and the set of rules, with their thresholds, is the same at the end as at the start, apart from rules this spec adds.**

## 3. Scope and non-goals

### In scope
- `registry new <family> <title>` for every family but `room` and `essay`, with the provenance checklist read from the rules (US1).
- The dependents graph, held records included, as a CI artefact, and `registry deps <id>` (US2).
- Generated, uncommitted editor schemas with glossary definitions and ID suggestions (US3).
- A weekly link and IIIF manifest checker that opens Jira issues and one archived-copy pull request, and never writes a record (US4).

### Non-goals
- A rename codemod (IDs never change, slugs already redirect); extracting the engine as a package (after v1); a public dependents page; a reader-facing link status.
- Publication requirements for collection, route, event and period records (FR-019): an empty one passes at `publishable` today, and that gap belongs to the first spec that publishes such a record.
- The R minter helper, until the first R pipeline (research R5): this spec fixes the CLI contract R will call.

## 4. Outputs / deliverables

Four pull requests after the specification, one per story. US1: `registry new <family>`, the checklist, the shared rollback, the R calling contract.

## 5. Research, sources and rights framework

Not applicable: the tooling makes no scholarly claim. It must not weaken Principle VI: nothing is guessed at creation (every field a person supplies is a commented key), and a dead link never changes a locator's `verified` state.

## 6. Evidence and data architecture

- **`Rule.requires`** (US1): each rule declares the fields it reports missing on a bare record of each family; the checklist is read from these, and a test holds the declarations to what the rules actually report in every family (SC-002).
- **Locator `archived_copy` / `archived_on`** and the rule `LOC-ARCHIVED` (US4, not yet built).
- Derived, never committed: the dependents graph, the editor schemas, the link checker's state in the workflow cache.

## 7. Essay and editorial architecture

`registry new essay` is unchanged (FR-006); it now shares the slug and rollback helpers with `registry new <family>`.

## 8. Interaction and technical implementation

No deployed interaction. The dependents viewer is a static editor artefact with no script.

## 9. Implementation phases and dependency model

Setup and the rule guard (SC-003) → US1 → US2 → US3 → US4 → polish. The stories are independent; US2 and US3 may swap. Task list: `specs/010-authoring-tooling/tasks.md` (canonical).

## 10. Jira hierarchy and reconciliation history

- 2026-11-18: grill done (TCX-60), ADR 0018 and ADR 0019 merged (#122).
- 2026-11-21: TCX-65 done (#125); spec 010 specified (#125), planned and tasked (#126); `/speckit-analyze` found one critical finding (no historical question named, Principle I) and four high ones, all fixed in the spec (#127); US1 built on #127.
- 2026-11-22: constitution 1.1.0 (ADR 0020, #133). `/speckit-analyze` re-run for TCX-70: one critical finding (the plan had no Principle XI line) and three high or medium ones on US3 (the analytical-dimension vocabulary, its definitions' home in `FRAMEWORK.md`, a mistyped value count), all fixed in the spec, plan, research, contract and tasks before US3 starts.

## 11. Programme acceptance criteria

SC-001 to SC-008 of the spec. Met so far: SC-002 (the checklist test, 12 families) and the guard for SC-003.

## 12. Verification ledger

| Date | What | Result |
|---|---|---|
| 2026-11-21 | `rules-not-weakened` (SC-003) | the 92 rules registered at f0a9230 with their thresholds, all still registered; seen failing with one threshold changed |
| 2026-11-21 | `checklist.test.ts` (SC-002, FR-019) | 32 tests: in each of 12 families an untouched stub fails on exactly its checklist at `ready_for_build` and at `publishable`; collection, route, event and period empty |
| 2026-11-21 | `new-record.test.ts` (US1 scenarios 1, 4, 5) | 20 tests: 13 families, the two headings, refusals, rollback on a real slug collision, a registry with an existing error |
| 2026-11-21 | `mint-contract.test.ts` (FR-007) | the real CLI as a child process: one line from `mint`, ID then path from `new`, failures non-zero with nothing on stdout |
| 2026-11-21 | quickstart US1 on a copy of the real registry | `new place "Apulum"` and `new evidence …` wrote valid stubs; gate PASS, 313 entities, 0 errors; `new room` exit 2 |
| 2026-11-22 | `dependents.test.ts`, `dependents-html.test.ts`, `deps-cli.test.ts` (US2 scenarios 1 to 6) | chain, held, cycle, unknown target, `same_as[]` and edges equal to `referenceFields` over 200 synthetic records; `deps` exit 1 on an unknown id; `check --out` writes both files, schema-valid, pass or fail |
| 2026-11-22 | SC-004 on the real registry (at 0ea65b2) | 311 nodes, 389 edges; `tc:tc:map:hereford` 10 direct, 15 indirect, 2 ms |
| 2026-11-22 | `npm run build`, then `registry scan dist` | PASS; no `dependents.*` in `dist/` |
| 2026-11-22 | `glossary.test.ts`, `editor-schema.test.ts` (US3 scenarios 1 to 5, SC-005) | every vocabulary value defined both ways; the real registry validates; ten seeded typos rejected by schema and gate; suggestions end in a plain string; VS Code mapping for all 15 families |
| 2026-11-22 | `locator-archived.test.ts` and `tests/linkcheck/*` (US4 scenarios 1 to 4, SC-006, SC-008) | `LOC-ARCHIVED` valid and invalid cases; probe outcomes, backoff and host spacing on a fake clock; manifest fingerprints for Presentation 2 and 3; Jira dedupe by label over two runs; unreachable reported on the third run; record files byte for byte unchanged; no import path from the gate or the build to `src/linkcheck/` |
| 2026-11-22 | `scripts/link-check.ts --dry-run` on the real registry | 28 URLs on 2 hosts, all map images; no request, no state written |
| 2026-11-22 | T038, one glossary row removed | `npm ci` exit 0 with the value named; `npm run build` exit 1 with the value named |

## 13. Canonical ownership and propagation

The repository is canonical (CLAUDE.md step 4). This dossier, Build Log section AD (`build-log-spec-010.md`) and the Decision Log entry (`decision-log-tc-d042.md`, TC-D042) are published from their files after merge.

## 14. Current checkpoint and delivery authority

US1 and US2 are merged (#127 on 21 November 2026, #136 on 22 November 2026). US3 (editor schemas, TCX-61) is built and under review on #140 (first reviewed as #138); the author confirms the new Vocabulary values definitions (T033) and checks the editor by hand (T039). US4 (link and manifest checker, TCX-64) is built and under review on #141; the author adds the Jira Actions secrets (T061) and runs the workflow twice after merge (T062). Then polish (T063 to T066).
