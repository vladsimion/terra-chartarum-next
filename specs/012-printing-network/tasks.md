---
description: "Task list for 012 The Printing Network, 1508–1560s"
---

# Tasks: The Printing Network, 1508–1560s

**Input**: `specs/012-printing-network/` (spec clarified 2026-11-22; plan, research R1–R10, data-model, contracts/rule-ids.md, contracts/network-layer.md, contracts/pages.md, quickstart). Decisions: ADR 0021, ADR 0023, ADR 0014 as amended.

**Tests**: REQUIRED (Constitution X). In every phase the test tasks come first and must be seen failing before the task that makes them pass (`tdd` skill). Refactoring happens in review. Steps only the author can take are marked **(author)**.

**Seams** (agreed with Vlad at T001, 2026-11-22):
1. the registry, through `validateRegistry`, `loadAndCheck` and `publicEntryIds`;
2. the pure layer builder `networkFeatures(records)`;
3. the built site, through the Atlas e2e fixture registry and the page tests.

**Organization**: by user story in priority order: Setup → Foundation → US1 (P1) → US2 (P1) → US3 (P2) → US4 (P3) → US5 (P3) → Polish. Jira: epic TCX-79, story TCX-82. Each PR updates this file, and the TCX-82 description points here.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1–US5, matching `spec.md`

### Pull-request map (each merged by the editor with `gate` green)

| PR | Tasks | Slice |
|---|---|---|
| 1 | spec, plan, tasks, analysis; T001–T003 | this directory, the claim |
| 2 | T004–T023 | US1 the record model, rules, publicity, the 1508 edition |
| 3 | T024–T035 | US2 the derived layer, collection and map |
| 4 | T036–T046 | US3 the person family and pages |
| 5 | T047–T052 | US4 survival and pending |
| 6 | T053–T056 | US5 paper through Evidence |
| after | T057–T061 | Polish |

---

## Phase 1: Setup

- [x] T001 Confirm the three seams above with Vlad and record the answer in this file
- [x] T002 Open the draft PR `012: The Printing Network, 1508–1560s` from `012-printing-network`, linked to TCX-82 and epic TCX-79 (CLAUDE.md workflow step 0)
- [x] T003 [P] Create `docs/confluence/spec-012-printing-network.md` (dossier) and `docs/confluence/build-log-spec-012.md`, following `docs/confluence/README.md` and the spec 010 dossier's sections

## Phase 2: Foundation (blocks every story)

- [x] T004 Add the four vocabularies to `src/registry/schemas/shared.ts`: `PLACE_ROLE_VALUES = ['produced_at', 'held_at']`, `BASIS_VALUES = ['stated', 'attributed']`, `PERSON_ROLE_VALUES = ['printer']`, `SURVIVAL_VALUES = ['surviving', 'none_known', 'unknown']`
- [x] T005 Add one table per new vocabulary to GLOSSARY.md's Vocabulary values section (`place_role`, `basis`, `person_role`, `survival`) and to `GLOSSARY_VOCABULARIES` in `src/registry/glossary.ts`. The spec 010 two-way test (`tests/registry/unit/glossary.test.ts`) must stay green. **(author confirms the definitions)**

---

## Phase 3: User Story 1 — An edition with its places (P1)

**Goal**: an edition records one production place and dated holdings, and the gate holds it to ADR 0021. **Independent test**: the 1508 edition passes; a second production place, a holding without holder or start, or place roles on a map each fail with a named rule.

### Tests (write first, see them fail)

- [x] T006 [P] [US1] Write `tests/registry/unit/place-roles.test.ts` with valid and invalid fixtures. Each invalid case reports its rule and its field:
  - one `produced_at` plus two `held_at` passes;
  - a second `produced_at` gives `PLACE-ROLE-PRODUCED`;
  - a `held_at` without `holder`, or without `valid_from`, gives `PLACE-ROLE-HOLDING`;
  - `place_roles` on a `map` gives `PLACE-ROLE-FAMILY`;
  - a role, basis or confidence outside its vocabulary gives `ENUM-INVALID`;
  - a place role without `evidence` gives `PLACE-ROLE-EVIDENCE`, a warning before `ready_for_build` and an error from it;
  - `place` pointing at a non-place gives `REF-FAMILY`;
  - a place role rated `secure` whose Evidence records all carry pending locators gives `PLACE-ROLE-SECURE` (FR-011); the same role citing one verified locator passes.
- [x] T007 [P] [US1] Add named mutations for each new rule to `tests/registry/support/mutations.ts`: `PLACE-ROLE-PRODUCED`, `PLACE-ROLE-HOLDING`, `PLACE-ROLE-FAMILY`, `PLACE-ROLE-EVIDENCE`, `PLACE-ROLE-SECURE`.
- [x] T008 [P] [US1] Add cases to `tests/bibliography/unit/entry-public.test.ts` (there is no `citations.test.ts`; `publicEntries` is where `publicEntryIds` is tested) (ADR 0014 amended):
  - a published, released entry with `place_roles` and no citing record is in `publicEntryIds`;
  - the same entry without `place_roles` is not;
  - a held entry with `place_roles` never is.
- [x] T009 [P] [US1] Add cases to `tests/registry/unit/references.test.ts`: `place_roles[].place` and `place_roles[].evidence[]`, and `attribution_history[].place` and `.source`, appear in `referenceFields`, with the expected families from `expectedFamily`.
- [x] T010 [P] [US1] Add a case to `tests/registry/unit/dependents.test.ts`: an edition with a place role is a direct dependent of that place through `place_roles[0].place`.
- [x] T011 [P] [US1] Add cases to `tests/bibliography/build/entry-page.test.ts` for the section **Where it was made and where it is kept** (`contracts/pages.md`):
  - shown only when the entry has place roles;
  - the production place, with its basis and confidence in words;
  - holdings, current then former, each with holder and shelfmark;
  - the `attribution_history` note, each superseded place with its source;
  - the link to the network layer, present only when that layer is public;
  - no held place, held holder or held Evidence named.

### Implementation

- [x] T012 [US1] Extend `BibliographyEntrySchema` in `src/registry/schemas/families.ts` with `place_roles`, `attribution_history` and `survival`. Every key is optional and typed only, so the rules judge the values. The Place role shape is `{ place, role, basis, confidence, valid_from, valid_to, holder, shelfmark, evidence[] }`.
- [x] T013 [US1] Add the reference paths to `src/registry/schemas/references.ts`:
  - `LISTS` and `POINTS_AT`: `place_roles[].place` → place, `place_roles[].evidence` → evidence;
  - `attribution_history[].place` → place, `attribution_history[].source` → source.
  
  Handle list-of-object paths as the existing `rooms.secondary` does, or extend `valueAt` for `[]` paths. T009 and T010 go green.
- [x] T014 [US1] Add `place_roles[].role`, `.basis` and `.confidence` to the enumerated fields checked by `src/registry/rules/enums.ts`.
- [x] T015 [US1] Implement `PLACE-ROLE-PRODUCED`, `PLACE-ROLE-HOLDING`, `PLACE-ROLE-FAMILY`, `PLACE-ROLE-EVIDENCE` and `PLACE-ROLE-SECURE` (reading each cited Evidence record's locator state as `LOC-SECURE-PENDING` does) in a new `src/registry/rules/place-roles.ts`. Declare `requires` where a field is demanded (spec 010 R1), and register them in `src/registry/rules/index.ts`. T006 and T007 go green, and `rules-not-weakened` still passes.
  - *Done 2026-11-22:* a sixth rule, `PLACE-ROLE-LINK`, was added: `place_roles` is a list of objects, and each item names its place, role, basis and confidence, with EDTF dates in order. It gives a missing value one rule; ENUM-INVALID judges only a value that is present. Contracts updated.
- [x] T016 [US1] Widen `publicEntryIds` in `src/registry/citations.ts`: a published, released entry with one or more `place_roles` is public. T008 goes green, and the existing citation and reverse tests stay green.
- [x] T017 [US1] Project `place_roles` (without evidence IDs of held Evidence), `attribution_history` and `survival` for public entries in `src/registry/project.ts`. Extend the leak-scan fixtures so a held place or held Evidence named in a public edition's roles is caught.
- [x] T018 [US1] Render the section in `src/pages/bibliography/[slug].astro` as in `contracts/pages.md`, reading the projected `place_roles` and `attribution_history`. T011 goes green.
- [x] T019 [P] [US1] Add the rule rows to `specs/001-scholarly-registry/contracts/rule-ids.md` and the fields to `specs/001-scholarly-registry/data-model.md`. Run `npm run status -- --write`.
- [x] T020 [US1] Mint the place **Dealu Monastery** (`registry new place "Dealu Monastery"`), distinct from Târgoviște, with its location and `geometry_provenance`. Held.
  - *Done 2026-11-22:* `tc:tc:place:place-000001`, researching and held, with its Romanian name. No location yet: none has been read from a cited source, and none is guessed. The location and its `geometry_provenance` are added before `publishable` (FAM-REQUIRED asks for them there).
- [ ] T021 [US1] Mint the 1508 Liturghier as a bibliography entry (`registry new bibliography_entry`), with its CSL file. Give it:
  - `produced_at` Dealu, `basis: attributed`, `confidence: probable` (the literature's "high confidence"; `secure` only once a cited locator is verified, `PLACE-ROLE-SECURE`);
  - a date stated by the epilogue;
  - `attribution_history` with Venice, Bistrița, Snagov, Govora and Cetinje, each with its source;
  - one `held_at` per copy located in the literature, each with its holder (locators pending).
  
  Each claim gets an Evidence record citing the sources in `docs/research/transylvania/bibliography-verification.md`, with its `analytical_dimensions` (FR-013). Held.
  - *Progress 2026-11-22:* `bibliography_entry-000050` minted, with its CSL file:
    - `produced_at` Dealu, `attributed`, `probable`, dated `1508-11-10`;
    - `survival: surviving`;
    - Evidence 16 (the epilogue's date) and 17 (the attribution), each citing Source 1 (Panaitescu's 1961 facsimile, `bibliography_entry-000051`), both locators pending. BRV I is `bibliography_entry-000052`, with Source 2.

    **Still open:**
    - the holdings (see T022);
    - `attribution_history`: each superseded place needs the source that names it, read, and a place record (`tc:tc:place:venice` exists; Bistrița, Snagov, Govora and Cetinje do not).
- [x] T022 [US1] Record in this file how many copies were located against the "twelve" reported (SC-002), and why any differ
  - *Recorded 2026-11-22:* **0 located of 12 reported** (5 in Romania, 7 abroad; Stage III note §5). No source naming an institution has been read:
    - The Princeton article (Negoiță) could not be fetched from this session; its host is outside the network policy.
    - BRV I and the Panaitescu facsimile are not online here.

    No holding is written until a source naming the holder is read. **(author)**
- [x] T023 [US1] Full checks green (`npm test`, `typecheck`, gate, `status --check`). Update the dossier and Build Log rows. Move TCX-82 to In Review when the PR opens.
  - *Done 2026-11-22:* `npm test` (3,162 passed), `typecheck`, `lint`, the gate (PASS, 324 entities after merging `main`), `status --check`, and `test:e2e:bibliography` with axe on fixture entry 15. TCX-82 stays In Progress: it is the story for the whole spec, and US2–US5 are open.

---

## Phase 4: User Story 2 — The network on the map (P1)

**Goal**: the Atlas shows production places by default, copies on request, and every pin says its role. **Independent test**: the default view shows only production places, each pin is labelled in text, and the copies toggle adds holdings with their institutions.

### Tests (write first, see them fail)

- [x] T024 [P] [US2] Write `tests/atlas/unit/network-features.test.ts` for `networkFeatures(records)`:
  - one feature per public edition × place role, at the place's `location`;
  - properties as in `contracts/network-layer.md`, including `formerly: true` exactly when a `held_at` has `valid_to`;
  - a place role on a held place yields no feature and an `ATLAS-ROLE-PLACE-HELD` failure naming edition and place;
  - `attribution_history` yields no feature;
  - a held edition yields nothing.
- [x] T025 [P] [US2] Add a case to `tests/atlas/build/convert.test.ts`: a layer with `asset: derived:place-roles` is built from the registry into `data/layers/<slug>.fgb`, with facets `role`, `basis`, `confidence`. `LAYER-TIME` and `LAYER-FACET` accept it.
- [x] T026 [P] [US2] Add a case to `tests/atlas/build/leak.test.ts`: the built network layer contains no held edition, held place or held holder.
- [x] T027 [P] [US2] Write `tests/atlas/e2e/network.spec.ts` on a fixture registry with one edition (attributed production place, one current and one former holding):
  - the default view shows one production pin;
  - "Show copies" adds two pins, labelled "A copy is kept here: …" and "Formerly kept here: …";
  - the attributed pin's accessible name says "attributed";
  - the legend lists only the roles drawn;
  - the corridors from the collection's default layers are labelled as approximations;
  - every control works by keyboard alone, and axe reports no violations.
  - *Done 2026-11-22:* at `tests/atlas/e2e-network/network.spec.ts`, run by its own config (`playwright.network.config.ts`, `npm run test:e2e:network`, a CI step). It builds the Atlas fixture with the network overlay (`tests/atlas/fixtures/network/`) laid over a copy, so the Atlas's own 63 count assertions keep their fixture. The spec was written after the client; to show it tests the behaviour, it was run with the client changes stashed: all five fail, and with them all pass.

### Implementation

- [x] T028 [US2] Implement `networkFeatures` in `src/atlas/build/network-features.ts` (pure). T024 goes green.
- [x] T029 [US2] Accept the `derived:place-roles` asset kind in the layer rules (`src/registry/rules/atlas.ts`) and in `src/atlas/build/write-outputs.ts`, building the FlatGeobuf from `networkFeatures`. T025 and T026 go green.
  - *Done 2026-11-22:* `LIFE-AVAILABILITY` accepts `DERIVED_ASSETS` (`src/registry/schemas/atlas-values.ts`). The layer rules needed no other change. Two build failures were added: `ATLAS-ROLE-PLACE-HELD` and `ATLAS-ROLE-PLACE-LOCATION`.
  - **Time, amended:** custody dates are text (`held_from`, `held_to`), and the layer is `envelope_only`. A production pin shows from its printing to the end of the envelope.

- [x] T030 [US2] In `src/atlas-client`:
  - a role filter with `produced_at` as the default;
  - the "Show copies" toggle;
  - role symbols (produced, held, formerly as hollow, attributed as dashed);
  - a legend listing only the roles shown;
  - the corridors drawn and labelled as approximations from their `generalized_editorial` provenance (FR-008);
  - accessible names and inspector headings that state the role in words, as in `contracts/network-layer.md`.
  
  T027 goes green.
  - *Done 2026-11-22 (`src/atlas/roles.ts`, unit-tested):*
    - **Symbols:** a square for made, dashed when attributed; a filled circle for a copy kept; a hollow circle for formerly kept. They are drawn as MapLibre icons.
    - **Legend:** it lists only the roles the selection keeps.
    - **Role facet:** it speaks in words ("Made here", "Copies kept here"), and a layer with one opens on production places. The facet checkbox is the "Show copies" toggle (contract amended).
    - **Text:** each pin's words are its `label` and `name`, which the no-WebGL table reads. A canvas pin has no accessible name of its own: the legend, the facet and the feature table carry the words.

- [x] T031 [US2] Mint the network layer (`registry new layer`), with `asset: derived:place-roles`, `role: historical`, `theme: networks-circulation`, `envelope: 1508/1570`, `time_mode: per_feature`, and facets `role`, `basis`, `confidence`. Held.
  - *Done 2026-11-22:* `layer-000003`, with `dataset-000003` ("Place roles of editions", the registry itself). Held. The public network is empty until an edition and its places are published.

- [x] T032 [US2] Mint the collection "The printing network, 1508–1560s" (`registry new collection`), with `default_layers` set to the network layer and the corridors layer (`tc:tc:layer:layer-000001`). Held.
  - *Done 2026-11-22:* `collection-000001`, with `default_layers` set to the network and the corridors (`layer-000001`). Held.

- [ ] T033 [US2] Run the Lighthouse budgets (ADR 0004) on the Atlas with the network collection; record the result here
  - *Not run separately, 2026-11-22.* The network layer and collection are held, so the public Atlas is unchanged, and CI's Lighthouse shards cover it. The network overlay site is checked by axe in both colour schemes. Lighthouse on the overlay site waits for a published edition (US3–US5), or for the author's go-ahead to add it to the Lighthouse config.

- [x] T034 [P] [US2] Document the derived asset kind in `specs/005-atlas/contracts/` (the build-outputs contract) and the README's Atlas section
  - *Done 2026-11-22:* `specs/005-atlas/contracts/build-outputs.md`, `atlas-rule-ids.md` and the README's Atlas section are updated.

- [x] T035 [US2] Full checks green, including `npm run test:e2e:atlas`. Update the dossier and Build Log rows.
  - *Done 2026-11-22:* the checks pass:
    - `npm test` (3,186), `typecheck`, `lint`, the gate (PASS, 327 entities) and `status --check`;
    - `test:e2e:atlas` (207);
    - `test:e2e:network` (10).

    Found on the way: taking the opening selection from `facets.json` made adding a layer fetch a second file, against spec 005 FR-006 (`catalogue-requests.spec.ts` failed). It is now read from the features the map already loaded, and an open inspector redraws when the selection applies.

---

## Phase 5: User Story 3 — People who crossed the mountains (P2)

**Goal**: printers are person records (ADR 0023), each edition names its printer, and a person page lists their editions in date order. **Independent test**: Coresi's page lists his editions at Târgoviște and Brașov, in date order, with no path drawn between them.

### Tests (write first, see them fail)

- [ ] T036 [P] [US3] Write `tests/registry/unit/person.test.ts`:
  - a person record with names and life dates passes;
  - with no names from `ready_for_build` it gives `PERSON-NAMES`;
  - a person link missing role, basis or confidence, or with a role outside `PERSON_ROLE_VALUES`, gives `PERSON-LINK`;
  - `people[].person` pointing at a non-person gives `REF-FAMILY`;
  - a person link without Evidence gives `PLACE-ROLE-EVIDENCE` from `ready_for_build`, and one rated `secure` on pending locators only gives `PLACE-ROLE-SECURE`;
  - `person` is in `FAMILIES`.
- [ ] T037 [P] [US3] Add named mutations for `PERSON-NAMES` and `PERSON-LINK` to `tests/registry/support/mutations.ts`
- [ ] T038 [P] [US3] Write `tests/registry/integration/new-record.test.ts` cases for `registry new person "Coresi"`: one stub, held, with its checklist (spec 010 FR-001)
- [ ] T039 [P] [US3] Write a page test for `src/pages/people/[slug].astro`, following the existing page tests:
  - editions listed in date order with their production place and date;
  - only public editions listed;
  - no path element on the page;
  - the edition page links back to the person.

### Implementation

- [ ] T040 [US3] Add `person` to `FAMILIES` (`src/registry/families.ts`) and `PersonSchema` to `src/registry/schemas/families.ts` and `index.ts`: `names[]` of `{ name, language, kind }`, `life_dates`, `bibliography[]`.
- [ ] T041 [US3] Add `people` to `BibliographyEntrySchema`: `{ person, role, basis, confidence, evidence[] }`. Add its reference paths (`people[].person` → person, `people[].evidence` → evidence) and enum fields.
- [ ] T042 [US3] Implement `PERSON-NAMES` and `PERSON-LINK` in `src/registry/rules/place-roles.ts`, with `requires` declarations, and apply `PLACE-ROLE-EVIDENCE` and `PLACE-ROLE-SECURE` to `people[]` links. Project `person` and `people` in `src/registry/project.ts`. T036–T038 go green.
- [ ] T043 [US3] Build `src/pages/people/[slug].astro` and `src/pages/people/index.astro` as in `contracts/pages.md`, and add the printer line to the edition section. T039 goes green.
- [ ] T044 [US3] Mint Macarie, Ljubavić and Coresi (`registry new person`), and link them from their editions, with basis and confidence. Mint the 1545 Molitvenic and 1547 Apostol (`produced_at` Târgoviște; locators pending until the colophons are read), and Coresi's first Târgoviște and Brașov editions. All held, with Evidence carrying its `analytical_dimensions`.
- [ ] T045 [P] [US3] Spec amendment (ADR 0023): add `person` to the family table in `specs/001-scholarly-registry/spec.md` and `data-model.md`, and the rules to `contracts/rule-ids.md`. Run `npm run status -- --write`.
- [ ] T046 [US3] Full checks green. Update the dossier and Build Log rows.

---

## Phase 6: User Story 4 — Lost books and unread colophons (P3)

**Goal**: absence is stated, and pending readings are shown as pending. **Independent test**: the 1544 catechism shows its production place and "no copy is known"; the 1545 place-naming claim is marked pending.

- [ ] T047 [P] [US4] Write `tests/registry/unit/edition-survival.test.ts`:
  - `survival: none_known` with a current `held_at` gives `EDITION-SURVIVAL` (error);
  - `surviving` with no `held_at` warns from `ready_for_build`;
  - `unknown` with none passes.
  
  Add the named mutation.
- [ ] T048 [P] [US4] Add an edition page test: `survival: none_known` renders "No copy is known" and no holdings list, and a claim on a pending locator renders as pending.
- [ ] T049 [US4] Implement `EDITION-SURVIVAL` in `src/registry/rules/place-roles.ts`. T047 goes green.
- [ ] T050 [US4] Render survival and pending states in the edition section (`src/pages/bibliography/[slug].astro`). T048 goes green.
- [ ] T051 [US4] Mint the 1544 Sibiu catechism with `produced_at` Sibiu and `survival: none_known`, with Evidence carrying its `analytical_dimensions`. Held.
- [ ] T052 [US4] Full checks green. Update the dossier and Build Log rows.

---

## Phase 7: User Story 5 — Paper as a thread between the lands (P3)

**Goal**: the paper claim exists only as Evidence. **Independent test**: the edition shows the paper claim with its source, locator state and confidence, and nothing about paper is drawn without it.

- [ ] T053 [P] [US5] Add a case to `tests/atlas/unit/network-features.test.ts`: no feature or property is produced for paper. Add an edition page test: an Evidence record about the paper, targeting the edition, is listed with its source, locator state and confidence.
- [ ] T054 [US5] List Evidence about the edition (other than place roles) on the edition section, under "What else is known". T053 goes green.
- [ ] T055 [US5] Add the paper Evidence for the 1508 edition: Venetian paper through Sibiu merchants, `analytical_dimensions` including `economic`, `relations[]` to the corridors layer, locator pending until read. Held.
- [ ] T056 [US5] Full checks green. Update the dossier and Build Log rows.

---

## Phase 8: Polish & cross-cutting concerns

- [ ] T057 [P] Run `quickstart.md` end to end and fix anything it exposes
- [ ] T058 Run the `code-review` skill (standards and spec axes) against the spec 012 PRs and address the findings
- [ ] T059 [P] Re-run `rules-not-weakened`, and record the rules spec 012 added
- [ ] T060 **(author)** Run the SC-003 check: five readers, the 1508 edition in the default map view, asked "where was this book made?". Record the answers in the dossier
- [ ] T061 Update Jira (TCX-82 and epic TCX-79), the dossier, Build Log and any Decision Log draft (workflow step 4)

---

## Dependencies & Execution Order

- Setup → Foundation (T004, T005) → US1 → US2. US2 needs the place roles and the publicity rule from US1.
- US3 needs US1 (the edition entry it links from). US4 and US5 need US1 only, and are independent of US2 and US3.
- Within each story: tests first and red → schema and references → rules → projection and pages → content → checks.
- The content tasks (T020, T021, T044, T051, T055) need the author's reading for anything stated as `verified`. Until then, locators are `pending`.

### Parallel opportunities

- In every story, the test tasks marked [P] touch different files.
- T019 and T045 (spec 001 documentation) run beside implementation.
- US4 and US5 can run in parallel once US1 is merged.

### Parallel example: User Story 1

```text
T006 place-roles.test.ts   T007 mutations   T008 citations.test.ts   T009 references.test.ts   T010 dependents.test.ts   T011 entry-page.test.ts
→ T012 schema → T013 references → T014 enums → T015 rules → T016 publicEntryIds → T017 projection → T018 edition section
```

## Implementation Strategy

**MVP is US1**: once an edition can say where it was made and where its copies are, and the gate holds it to ADR 0021, the Princeton pin problem is solved at the source. US2 makes it visible. US3 adds the people, and US4 and US5 make absence and paper honest.

One story per pull request, red then green, with Jira and the dossier updated in the same PR.
