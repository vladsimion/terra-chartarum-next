This is the programme dossier for spec 012. It follows the fourteen-point contract in [Programme Dossier Contract & Reconciliation Register](https://vladsimion.atlassian.net/wiki/spaces/~7012186ee7d7085f34fff9bc2bf8fbe8de309/pages/18481169), like the dossiers for specs 001 to 010. It has not been published yet.

## 1. Programme metadata

| | |
|---|---|
| Programme type | Research capability: the first Stage III slice (Wallachia and Moldavia). It adds place roles on editions, a `person` family and a network layer derived from the records. |
| Status | **Under way.** Specified, planned and tasked; `/speckit-analyze` found two high findings and six smaller ones, all fixed (#152, merged 2026-11-22). **US1** (place roles, the rules, publicity, the edition section, the 1508 edition) merged with #153 on 2026-11-22. **US2** (the derived network layer, its collection and the map) merged with #154 on 2026-11-22. **US3** (the `person` family, person links on editions, and the person pages) merged with #156 on 2026-11-23. **US4** (survival stated, pending claims shown) merged with #157 on 2026-11-23. **US5** (paper through Evidence) merged with #158 on 2026-11-23. **Polish** (quickstart, code review, rule guard) is built and under review on #159; T060 (five readers) and T062 (the edition's map link) stay open. |
| Jira | **TCX-79** is the Stage III epic. **TCX-82** (III-1, the printing network) is In Progress. The grill that preceded it is TCX-80 and TCX-81. |
| Canonical parent | A standalone page at the root of the space, like specs 001 to 010. It is linked from the Stage III programme note (page 47120387). |
| Repository | https://github.com/vladsimion/terra-chartarum-next (public). The spec is in `specs/012-printing-network/`. The decisions are `docs/adr/0021` (place roles), `docs/adr/0023` (person records) and `docs/adr/0014` as amended on 2026-11-22. |
| Last reconciliation | 2026-11-22, on `012-printing-network`. The counts this spec does not own are generated below. |

<!-- status:begin -->
- Registry rules: 105
- Named mutations: 138
- Entities: 342 (0 errors, 112 warnings)
<!-- status:end -->

## 2. Purpose / thesis

How closely were Wallachia, Transylvania and Moldavia tied by the making and circulation of printed books between 1508 and the 1560s?

The falsifiable claim is that the registry can say **where each edition was made and where each surviving copy is now, as two different things, with the basis and confidence of each**. On that basis, the Atlas shows a production network crossing the Carpathians: Dealu and Târgoviște, Sibiu, Brașov. That network would be hidden by any map that pins a book to the library that holds it.

## 3. Scope and non-goals

### In scope
- Place roles (`produced_at`, dated `held_at`) on bibliography entries, enforced by the gate (ADR 0021).
- The `person` family for printers (ADR 0023), and the link from an edition to its printer.
- A network layer derived at build time from public editions, shown with the Carpathian corridors (layer-000001) as one collection.
- The edition section on the bibliography page, and a new person page.
- Non-survival as a stated value. Superseded attributions as a historiography note that is never drawn. Paper recorded only through Evidence.
- The content: the 1508 Liturghier, the 1544 Sibiu catechism, the 1545 Molitvenic, the 1547 Apostol, and Coresi's first Târgoviște and Brașov editions. Also the printers Macarie, Ljubavić and Coresi, and Dealu Monastery as a place distinct from Târgoviște.

### Non-goals
- An essay on the network.
- Place roles on maps, which wait for their own migration (ADR 0021 decision 6).
- Drawn paths for a printer's movement.
- A paper layer.
- A header lens for people (a shell question for spec 002).

## 4. Outputs / deliverables

There are six pull requests: the claim (#152), then one per user story.
- **US1:** the record model, the rules, the publicity amendment, the edition section and the 1508 edition.
- **US2:** the derived layer, the collection and the map.
- **US3:** people and their pages.
- **US4:** survival and pending locators.
- **US5:** paper through Evidence.

## 5. Research, sources and rights framework

The sources are listed in `docs/research/transylvania/bibliography-verification.md` and the Stage III programme note:
- the Panaitescu facsimile (1961);
- *Liturghierul lui Macarie 1508/2008* (Mihăilă on the epilogues);
- Demény and Demény (1986);
- Bianu–Hodoș, BRV;
- Negoiță (Princeton, Mapping Eastern Europe).

Every locator starts `pending` until the author reads it. Under the new rule `PLACE-ROLE-SECURE`, no place role or person link may be rated `secure` until a cited locator is verified.

## 6. Evidence and data architecture

- **New fields on a bibliography entry:**
  - `place_roles[]`: role, basis, confidence, EDTF dates, holder, shelfmark, evidence;
  - `people[]`: person, role, basis, confidence, evidence;
  - `survival`;
  - `attribution_history[]`.
- **New family:** `person`, with names, life dates and bibliography.
- **New rules:**
  - `PLACE-ROLE-PRODUCED`, `PLACE-ROLE-HOLDING`, `PLACE-ROLE-FAMILY`, `PLACE-ROLE-EVIDENCE` and `PLACE-ROLE-SECURE`;
  - `PERSON-LINK` and `PERSON-NAMES`;
  - `EDITION-SURVIVAL`.
- **Derived, never stored:**
  - the network layer's features, one per public edition and place role, at the place's location (asset kind `derived:place-roles`);
  - which editions are public: `publicEntryIds` gains a third route, for an edition with place roles that is published and released;
  - a person's editions.

## 7. Essay and editorial architecture

No essay in this spec. The edition and person pages are static and need no script.

## 8. Interaction and technical implementation

- By default the map shows production places only.
- "Show copies" adds the holdings. Current and former holdings are told apart in words and by symbol.
- An attributed place is dashed and says "attributed" in its accessible name.
- The legend lists only the roles drawn.
- The corridors are labelled as approximations.

## 9. Implementation phases and dependency model

The phases run Setup → Foundation (vocabularies, GLOSSARY) → US1 → US2. US3 needs US1. US4 and US5 need US1 only. Polish comes last. The task list is `specs/012-printing-network/tasks.md` (canonical, 61 tasks).

The agreed test seams (T001, 2026-11-22) are:
1. the registry;
2. the pure builder `networkFeatures(records)`;
3. the built site.

## 10. Jira hierarchy and reconciliation history

- 2026-11-22: the Stage III grill (TCX-80, TCX-81) produced ADR 0021 (place roles) and ADR 0022 (term records).
- 2026-11-22: spec 012 was specified and clarified:
  - printers are a `person` family (ADR 0023);
  - readers see the network through the layer and through edition and person pages;
  - an edition with place roles is public when published and released (ADR 0014 amended).
- 2026-11-22: planned and tasked, and claimed on #152.
- 2026-11-22: `/speckit-analyze` raised two high findings, both fixed on #152:
  - the edition section had no task;
  - `secure` was not blocked on pending locators for place roles.

  Six smaller findings were also fixed. FR-003 (consecutive holdings for a copy that moved) became an authoring convention.
- 2026-11-22 to 2026-11-23: the stories merged one PR each, with `gate` green: US1 #153, US2 #154, US3 #156, US4 #157 and US5 #158. TCX-82 stays In Progress until Polish merges.
- 2026-11-23: Polish. The quickstart ran green on `main`. The code review (standards and spec) found one bug: any point with a `role` property was drawn as a copy, which would have mislabelled the hanseatic places once published. It also found two spec gaps: an attributed copy was not marked, and printer links never said "pending". All three are fixed in the Polish PR. The edition page's map link (FR-014) was found missing and is now T062.

## 11. Programme acceptance criteria

SC-001 to SC-006 of the spec, as of 2026-11-23. All the records are held, so nothing is public yet.

- **SC-001 (the anchor editions, each with one production place, the gate passing): partly met.** The 1508, 1544, 1545 and 1547 editions are recorded. Coresi's first Târgoviște and Brașov editions wait for BRV I and the colophons.
- **SC-002 (every located copy a holding): not met.** None of the 12 reported copies is located (tasks.md T022).
- **SC-003 (five readers): the author's (T060).**
- **SC-004 (every pin states its role in words, none without one): met and tested.** It is tested over the whole layer (`network-features.test.ts`, `roles.test.ts`, the network e2e).
- **SC-005 (no `secure` on pending locators; every claim carries its dimensions): met by the gate.** `PLACE-ROLE-SECURE` and `LOC-SECURE-PENDING` check the first part, `DIM-MISSING` the second.
- **SC-006 (the ADR 0004 budgets): axe is met on every new page and on the network** (in both colour schemes). Lighthouse on the network waits for a public edition (T033).

## 12. Verification ledger

| Date | What | Result |
|---|---|---|
| 2026-11-22 | `place-roles.test.ts` (US1 scenarios 1 to 4; FR-001 to FR-003, FR-011) | 15 tests: one production place and two holdings pass. A second production place, a holding without holder or start, a missing place, role, basis or confidence, a bad EDTF date, a map with place roles, a role without evidence at `ready_for_build`, and `secure` on pending locators each fail with their own rule and field |
| 2026-11-22 | `entry-public.test.ts`, `bibliography-project.test.ts` (FR-014, ADR 0014 amended) | an uncited, published and released edition with place roles is public; without them it is not; a held one never is; a role on a held place, held Evidence or a held Source is dropped from the projection, a historiography note on a held place note and all |
| 2026-11-22 | `entry-page.test.ts` on the bibliography fixture site (T011) | the section shows the production place with basis, confidence, date and "locator pending"; current then former copies; earlier attributions as a note; no held holder or place in the HTML |
| 2026-11-22 | `registry check` on the real registry | PASS, 324 entities after merging `main`, 0 errors; the eight new records add no warning |
| 2026-11-22 | `network-features.test.ts`, `roles.test.ts` (US2; FR-004 to FR-007, FR-012) | one point per public edition and place role at the place's location, labelled in words; nothing for a held edition or an earlier attribution; a held place or a place without a location fails the build by name; each role its own symbol; the legend only the roles drawn; the role facet in words, opening on production places |
| 2026-11-22 | `convert.test.ts`, `leak.test.ts` on the network overlay | `derived:place-roles` is built into a FlatGeobuf with role, basis and confidence facets; a held place writes nothing; the size limit applies; no held edition, holder or place reaches the built layer |
| 2026-11-22 | `test:e2e:network` (US2 scenarios 1 to 4; SC-004) | 10 passed in both colour schemes: production places by default, copies by one checkbox, the legend in words, the keyboard alone, axe clean; with the client changes stashed, all five specs fail |

## 13. Canonical ownership and propagation

The repository is canonical (CLAUDE.md step 4). This dossier and the Build Log section (`build-log-spec-012.md`) are published from their files after merge.

## 14. Current checkpoint and delivery authority

All five stories are merged (#153, #154, #156, #157, #158), and the Polish PR is under review. When it merges, TCX-82 can move to Done for the code. The research below is the author's, and does not hold the story open.

The author's open items for this spec:
- **Readings** that turn locators from `pending` to `verified`:
  - the 1508 epilogue and Panaitescu's introduction;
  - BRV I for the 1545 and 1547 prints and for Coresi's editions;
  - Demény and Demény on the 1544 catechism;
  - Negoiță on the paper.
- **Missing records:**
  - the 12 copies of the 1508 edition (SC-002);
  - the earlier attributions (Venice, Bistrița, Snagov, Govora, Cetinje);
  - a cited location for Dealu;
  - the printers' life dates.
- **Confirmations:** the new Vocabulary values definitions (T005), and the glossary questions from the code review (see below).
- **The SC-003 five-reader check (T060).**
- **The edition page's map link (T062)**, once the network layer is public.
- **Glossary questions** raised at the review: "Edition" is not a glossary term, and "held" names two things (an unreleased record, and `held_at`, a copy kept).
