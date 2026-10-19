---

description: "Task list for 006 Bibliography & Citation"
---

# Tasks: Bibliography & Citation

**Input**: Design documents from `/specs/006-bibliography/`

**Prerequisites**: plan.md, spec.md (clarified 2026-10-17), research.md, data-model.md, contracts/ (bib-rule-ids.md, bibliography-pages.md, import-bib-cli.md, cite-inputs.md), quickstart.md. Decision: ADR 0014.

**Tests**: REQUIRED (Constitution X). Every acceptance scenario has an automated test written first, and each story is built red → green with the `tdd` skill: in every phase the test tasks come first and must be seen failing before the task that makes them pass. Refactoring happens in review, not inside the loop. Every new rule gets a named mutation in the same task that adds it (the rule-coverage test fails otherwise).

**Seams** (to confirm with Vlad at T001): (1) the registry through `validateRegistry` and the CLI `main` (schemas, rules, `import-bib`); (2) the pure modules in `src/bibliography/` (`entry-public`, `cited-in`, `index-data`, `match`, `cite-inputs`: records or plain data in, plain data out); (3) the built output (pages, index, export files) through build tests and Playwright. No test reaches inside a component.

**Organization**: Grouped by user story. Slice order: **Foundation → US1 → US3 → US2 → US4 → cross-cutting checks → Polish**. The registry half (Foundation, US4) needs no Astro. The site half needs spec 002's shell and registry integration, and the exports need spec 003's shared generator (`src/essays/citations.ts`); US1 and US3 need only the generator's Chicago rendering for the entry's bibliography form, so the export tasks (US2) come after it exists.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1–US4, matching `spec.md`
- Paths are relative to the repository root. Registry tests are under `tests/registry/`, bibliography tests under `tests/bibliography/`.
- Jira: each story's checklist is copied into its TCX story under epic TCX-7 (TCX-39 US1, TCX-40 US2, TCX-41 US3, TCX-50 US4; Setup, Foundation and the cross-cutting checks sit in TCX-39); Jira and Confluence are updated after each story (workflow step 4); `/speckit-taskstoissues` is not used.

---

## Phase 1: Setup

- [x] T001 Agree the three seams above with Vlad (tdd skill) and record any change here Agreed as written by Vlad on 2026-10-19.
- [x] T002 [P] Create `tests/bibliography/fixtures/registry/` with a small hand-authored registry: entries with CSL files (cited by two public essays and a map; cited only by a held essay; uncited; two editions and a translation; a finding aid reached through a flagged Source; one with a DOI and one without; one per section), Sources pointing at entries, Evidence records with verified and pending locators, public essays listing `bibliography[]` and `evidence[]`, a dataset and a layer listing entries, a cartographer listing an entry, and a held essay. Add `tests/bibliography/fixtures/import/` with one sample each in BibTeX, RIS and CSL-JSON (some duplicating fixture entries by DOI, ISBN and weak key). Add invalid variants named for the rule they trip Done: copied from spec 003's essay fixture and extended (38 entities, 14 entries, `registry check` clean); invalid variants are built in `tests/bibliography/unit/fixture.test.ts` (one per rule), as the Atlas fixtures do. The import samples carry a table of what each item should do (`fixtures/import/README.md`).
- [x] T003 [P] Extend `src/registry/synthetic.ts` and `registry synth` to generate `n` entries with CSL files, Sources, Evidence and citing essays (1,000 entries for SC-005); a test asserts the same seed gives byte-identical output Done: `generateBibliographyRegistry`, `generatedCsl`, `writeSyntheticBibliography` and `registry synth --bibliography`; 1,000 entries pass the gate; the citing essays are held (a public essay needs a body and nine stages), so the public citing records are cartographers.
- [x] T004 Confirm `@citation-js/core` with the BibTeX and RIS plugins are installed by spec 003; if not, add them at exact pinned versions (each at least two weeks old) and run `npm audit --omit=dev` Done: `@citation-js/core`, `plugin-bibtex`, `plugin-csl` and `plugin-ris` are at 0.9.0 exact, installed by spec 003; `npm audit --omit=dev` finds 0 vulnerabilities.

---

## Phase 2: Foundation (registry; blocks every story)

**Goal**: the schemas, the four rules, the public allowlist and spec 001's documents brought in step (FR-016).

- [x] T005 [P] Write failing `tests/registry/unit/bibliography-schema.test.ts`: an entry with `section`, `edition_of`, `translation_of` and `digital_copy` loads; `digital_copy` takes only an `https` URL; a Source with `entry` loads; a dataset and a layer accept `bibliography[]`; `entry`, `bibliography[]`, `edition_of` and `translation_of` resolve through `REF-UNKNOWN` and `REF-FAMILY`; `FAM-UNKNOWN` still rejects an unlisted field (and rejects `rights` on an entry or a Source)
- [x] T006 Implement the extended `BibliographyEntrySchema`, `SourceSchema`, `DatasetSchema` and `LayerSchema` in `src/registry/schemas/families.ts` and the reference fields in `schemas/references.ts`; update existing fixtures Done; the loader now reads each entry's CSL file (`LoadResult.cslFiles`, only from inside the registry root) for `BIB-CSL`.
- [x] T007 [P] Write failing `tests/registry/unit/src-entry.test.ts` for `SRC-ENTRY` (a Source without `entry`, or whose `entry` is the wrong family or missing, or a public Source whose entry is held; warns at `ready_for_build`, errors at `publishable`) with a named mutation
- [x] T008 Implement `SRC-ENTRY` in `src/registry/rules/bibliography.ts` and register it
- [x] T009 [P] Write failing `tests/registry/unit/bib-csl.test.ts` for `BIB-CSL` (a missing file; invalid JSON; more than one item; a missing `type` or `title`; an `id` that is not the entry's stable ID) with a named mutation
- [x] T010 Implement `BIB-CSL`
- [x] T011 [P] Write failing `tests/registry/unit/bib-edition.test.ts` for `BIB-EDITION` (an unresolved reference; the entry itself; a two-entry cycle through `edition_of`; a cycle mixing `edition_of` and `translation_of`) with a named mutation
- [x] T012 Implement `BIB-EDITION`
- [x] T013 [P] Write failing `tests/registry/unit/bib-listed-held.test.ts` for `BIB-LISTED-HELD` (a public essay, map, cartographer, dataset or layer listing a held or unpublished entry: warning at `ready_for_build`, error at `publishable`; a held record listing a held entry is fine) with a named mutation
- [x] T014 Implement `BIB-LISTED-HELD`
- [x] T015 [P] Write failing `tests/registry/unit/bibliography-project.test.ts`: the public projection of an entry and a Source carries exactly the allowlist of data-model.md plus the CSL-JSON contents; nothing else; a held entry is not projected Done: the CSL contents are not projected (a projection is records, not files); the pure modules read the file at the path `csl`.
- [x] T016 Extend `src/registry/project.ts` with the entry and Source allowlists
- [x] T017 Register the four rules in `src/registry/rules/index.ts`, make the rule-coverage test pass (each has a named mutation), and add them to `specs/001-scholarly-registry/contracts/rule-ids.md`; update spec 001's `data-model.md` source, dataset, layer and bibliography entry rows to point at spec 006's, and correct any text there that says a finding aid is not a source Done: 4 rules (86 registered) and 6 named mutations (108); the older fixtures and generators that predate `SRC-ENTRY` and `BIB-CSL` were brought in step (the shared essay world, the map generator, the rename test); one test (`essay-body-public`) passed only because a source had no entry and was rewritten to say what it meant.

---

## Phase 3: User Story 1 — Browse the bibliography as evidence (P1)

**Goal**: browse entries by section, essay and search, see where each is cited by which route, and never see anything held.

**Independent Test**: three fixture entries cited by two essays and one map record show correct "Cited in" lists; a held essay's citations are excluded.

- [ ] T018 [P] [US1] Write failing `tests/bibliography/unit/entry-public.test.ts`: an entry is public only when published, released and cited by a public record by either route; held-only and uncited entries are not; an entry cited only through a held Source or held Evidence is not
- [ ] T019 [US1] Implement `src/bibliography/entry-public.ts` (pure)
- [ ] T020 [P] [US1] Write failing `tests/bibliography/unit/cited-in.test.ts` (scenarios 1, 4, 5): the listed route from `bibliography[]` of essay, map, cartographer, dataset and layer; the evidence route essay → Evidence → Source → entry with the locator value, locator state and verification state; a pending locator is marked pending; a finding-aid Source is skipped on the evidence route; held citing records are omitted; public editions and translations are returned with their relation, in either direction
- [ ] T021 [US1] Implement `src/bibliography/cited-in.ts` (pure)
- [ ] T022 [P] [US1] Write failing `tests/bibliography/unit/index-data.test.ts` (scenario 3) and `index-data.perf.test.ts`: the index holds only the contract's fields for public entries; a substring match on author, title, year and keyword, ignoring case and diacritics; ordering by section, author, year; filters by section and essay combine; the 1,000-entry fixture filters in under 200 ms (SC-005)
- [ ] T023 [US1] Implement `src/bibliography/index-data.ts` (pure) and write `data/bibliography-index.json` in `src/integrations/bibliography.ts`; register the integration in `astro.config.mjs`
- [ ] T024 [P] [US1] Write failing `tests/bibliography/build/index-page.test.ts` and `entry-page.test.ts`: the index groups public entries under the seven section headings in order and hides empty ones; the filter form is present and submits as GET; an entry page shows the Chicago form, identifiers from the CSL-JSON, `digital_copy`, other editions, and both "Cited in" groups with routes labelled, locators and verification states; the held-only and the uncited entries have no page; no layer or Atlas binary is linked
- [ ] T025 [US1] Implement `src/pages/bibliography/index.astro` and `[slug].astro` (Chicago form through spec 003's generator); set the Bibliography destination to `built`
- [ ] T026 [P] [US1] Write failing `tests/bibliography/e2e/filters.spec.ts` (CI-verified): with JavaScript, section, essay and search filters apply and write the query string, and a copied address reopens the same view; with JavaScript off, the form filters by reloading and the list is complete
- [ ] T027 [US1] Implement `src/bibliography-client/filters.ts`
- [ ] T028 [US1] Add the index and entry page types to `tests/shell/ci-templates.json` and `lighthouserc.json`; axe on both in both colour schemes; check first-load JS against 100 KB

**Checkpoint**: a reader can browse the bibliography and see where each work is used; TCX-39 checklist updated.

---

## Phase 4: User Story 3 — Distinguish sections and finding aids (P2)

- [ ] T029 [P] [US3] Write failing additions to `tests/bibliography/build/entry-page.test.ts` and `unit/cited-in.test.ts`: the seven section labels appear as in data-model.md ("Historical maps", not "cartographic witnesses"); an entry whose pointing Source is a finding aid carries the "Finding aid" badge and appears under no "Cited as evidence" group; an entry with no `section` is not public
- [ ] T030 [US3] Implement the section labels, the badge and the missing-section handling in `entry-public.ts` and `[slug].astro`

---

## Phase 5: User Story 2 — Cite the site and its parts (P1)

- [ ] T031 [P] [US2] Write failing `tests/bibliography/unit/cite-inputs.test.ts`: the CSL item for an entry (unchanged, with `URL` and `accessed` added), a dataset, a layer and the site matches the contract; the stable URL uses the `site` origin and the slug; the access date is `BUILD_DATE` when set, otherwise today's UTC date; a held input produces no item
- [ ] T032 [US2] Implement `src/bibliography/cite-inputs.ts` (pure)
- [ ] T033 [P] [US2] Write failing `tests/bibliography/build/exports.test.ts` (SC-002): each entry has `cite.bib`, `cite.ris` and `cite.json`; datasets and layers have theirs under `/data/cite/`; every file parses with its format's parser; each carries the canonical URL and the injected access date; no export exists for a held or non-public input
- [ ] T034 [US2] Implement the export writing in `src/integrations/bibliography.ts` using spec 003's generator, add the "Cite this site" statement and exports to the index page, and the export control to the entry page
- [ ] T035 [US2] Link the layer and dataset exports from the Atlas inspector (spec 005 T043), extending its e2e check; blocked until that inspector exists, so it can follow the other stories

---

## Phase 6: User Story 4 — Import entries from a reference manager (P2)

- [ ] T036 [P] [US4] Write failing `tests/bibliography/unit/match.test.ts`: DOI normalisation (case, `https://doi.org/` prefix); ISBN-10 converted to ISBN-13 with hyphens removed; the weak key (first author family name + year + first six title words, diacritics folded, punctuation removed); the first matching rule decides; two different works by one author in one year do not match
- [ ] T037 [US4] Implement `src/bibliography/match.ts` (pure)
- [ ] T038 [P] [US4] Write failing `tests/registry/integration/import-bib.test.ts` (SC-004): one sample per format creates held entries with minted IDs, slugs per research R2, no `section`, valid CSL files whose `id` is the stable ID and which hold nothing site-specific; a file that does not parse is rejected whole with the line number; an item without `type` or `title` is skipped and reported; duplicates are reported with the existing ID and rule and written nowhere; importing the same file twice creates nothing the second time; `--dry-run` writes nothing; `--out` writes `import-report.json`; no existing file is modified
- [ ] T039 [US4] Implement `src/registry/import-bib.ts` and the `import-bib` command in `src/registry/cli.ts`

---

## Phase 7: Cross-cutting checks

- [ ] T040 [P] Write failing `tests/bibliography/build/leak.test.ts` (SC-003): no id, slug or title of the held entry, the entry cited only by the held essay, the held essay or any held Source appears in any Bibliography page, index, export or URL; add the named mutation to `tests/registry/mutations.test.ts`; make it pass
- [ ] T041 [P] Write failing `tests/bibliography/build/citations-resolve.test.ts` (SC-001): every `bibliography[]` entry of every public essay and every evidence citation resolves to a public entry page

---

## Phase 8: Polish & cross-cutting concerns

- [ ] T042 [P] Run the quickstart end to end and fix anything it exposes
- [ ] T043 [P] Update `README.md` and `docs/` for the bibliography and the import command; add ADR 0014 to the Read-first list in `CLAUDE.md`
- [ ] T044 Confirm the accessibility and performance gates on the new page types in CI (Lighthouse CI budgets and axe)
- [ ] T045 Run the `code-review` skill against the commit before this work began (standards and spec axes) and address findings
- [ ] T046 Update Jira (TCX-7 description, story checklists, statuses), the Confluence dossier for spec 006, the Build Log and the Decision Log (workflow step 4); record that spec 008 owns the import of the live bibliography and its section mapping

---

## Dependencies & Execution Order

- Setup → Foundation → US1 → US3 → US2 → US4 → cross-cutting → Polish. Foundation blocks everything; US4 needs only Foundation and can be built any time after it.
- The site half needs spec 002's shell and registry integration (merged). US1's Chicago form and US2's exports need spec 003's `src/essays/citations.ts`.
- T035 needs spec 005's inspector. Until it exists, the export files are still written and tested.
- Spec 008's importer targets this schema (each legacy source becomes a Source with an `entry`); nothing here imports legacy data.

## Implementation Strategy

MVP is Foundation plus US1: a fixture bibliography browses with honest, release-filtered "Cited in" lists. US4 is independent and valuable early, because it is how entries arrive. Ship one story per PR, red tests pushed first for the browser specs, verified in CI.
