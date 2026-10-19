Programme dossier for spec 006, written against the fourteen-point contract in [Programme Dossier Contract & Reconciliation Register](https://vladsimion.atlassian.net/wiki/spaces/~7012186ee7d7085f34fff9bc2bf8fbe8de309/pages/18481169), as the dossiers for specs 001 to 005 are.

## 1. Programme metadata

| | |
|---|---|
| Programme type | Instrument: the bibliography as a scholarly navigation surface, and citation of the site and its parts |
| Status | **Code complete and polished.** Setup and Foundation (#65), User Story 1 (#68), Stories 3, 2 and 4 (#71), the cross-cutting checks (#72) and Polish (#73: `relations.json` filtered, quickstart and README, code-review fixes) are merged to `main`, all on 19 October 2026. The stories stay In Review until Vlad moves them to Done. |
| Jira | **TCX-7** epic (In Progress); stories **TCX-39** (US1 browse the bibliography as evidence; also holds Setup, Foundation and the cross-cutting checks), **TCX-40** (US2 cite the site and its parts), **TCX-41** (US3 sections and finding aids), **TCX-50** (US4 import from a reference manager) |
| Canonical parent | A standalone page at the root of the space, as for specs 001 to 005 |
| Repository | https://github.com/vladsimion/terra-chartarum-next (public). Spec `specs/006-bibliography/`; code `src/bibliography/`, `src/bibliography-client/`, `src/registry/` (`citations.ts`, `import-bib.ts`, `rules/bibliography.ts`), `src/pages/bibliography/`, `src/pages/data/`; decision `docs/adr/0014` |
| Successor relationship | Replaces the live site's bibliography at cutover; spec 008 imports the live bibliography and maps its section types onto the seven sections |
| Last reconciliation | 2026-10-19 against `main` at `869e132` (#73 merged; the same tree as the reviewed branch): 86 registry rules and 108 named mutations; 2142 Vitest tests in 171 files, all passing; Chromium Playwright for the Bibliography, 26 passing. CI `gate` green on `main` at `869e132` (Lighthouse budgets, accessibility and the leak scan included); the run was delayed about half an hour by a GitHub Actions incident. |

## 2. Purpose / thesis

What does this publication rest on, and where is each work used? The falsifiable claim: **a reader can see every work the publication rests on, grouped by kind, and for each work every public record that lists it or cites it as evidence; every entry, dataset, layer and the site itself can be cited in BibTeX, RIS and CSL-JSON with a stable address and an access date; and nothing cited only by held content appears in any page, file or address.**

## 3. Scope and non-goals

### In scope
- The bibliography entry (an entry's YAML plus its CSL-JSON), a Source that points at exactly one entry, `bibliography[]` on datasets and layers; four registry rules.
- `/bibliography/` by the seven sections with filters by section and essay and search over author, title, year and keywords; one page per entry with the Chicago form, identifiers, editions and translations, "Cited in" (listed and as evidence, labelled differently) and exports.
- Citation exports for an entry, a dataset, a layer and the site, from spec 003's shared generator; a Cite section in the Atlas inspector.
- `registry import-bib` for BibTeX, RIS and CSL-JSON.

### Non-goals
- Importing the live bibliography and its section mapping (spec 008).
- A stored Citation entity (ADR 0014: citations are derived).
- Rights on entries or Sources in v1: the site cites, it does not reproduce.
- Bibliography links from essay pages to entry pages (open, section 14).

## 4. Outputs / deliverables

`src/registry/rules/bibliography.ts` (`SRC-ENTRY`, `BIB-CSL`, `BIB-EDITION`, `BIB-LISTED-HELD`, a named mutation each), the schema additions, `src/registry/citations.ts` (the two citation routes and which entries are public), `src/registry/import-bib.ts`; `src/bibliography/` (index data, entry view, "cited in", editions, match, cite inputs, cite paths, export routes) and `src/bibliography-client/filters.ts`; `src/pages/bibliography/` and `src/pages/data/`; `registry synth --bibliography`; build outputs `data/bibliography-index.json`, per entry `cite.bib`, `cite.ris`, `cite.json`, and `data/cite/{dataset,layer}/` and `data/cite/site.*`.

## 5. Research, sources and rights framework

Entries and Sources carry no `rights` (FR-011); a `rights` field on either fails `FAM-UNKNOWN`. An entry may link an external `digital_copy` (https only) with no claim about it. A dataset or layer export names its attribution from the Rights shape (the dataset's, else the layer's). Every citation carries one access date for the whole build: `BUILD_DATE`, then `SOURCE_DATE_EPOCH`, then today in UTC.

## 6. Evidence and data architecture

ADR 0014. A Source points at exactly one entry; several Sources may share one; an entry no Source points at is further reading. A finding aid is a Source flagged `is_finding_aid`, never evidence. Citations are derived by two routes: listed (a public record's `bibliography[]`: essay, map, cartographer, dataset, layer) and evidence (essay, Evidence, Source that is not a finding aid, entry). An entry is public only when published, released, in a valid section and cited by at least one public record; the derivation lives in the registry so the registry build and the site agree, and `data/relations.json` names no unlisted entry as a target or a referrer. Identifiers and keywords live only in the entry's CSL-JSON.

## 7. Essay and editorial architecture

Essays list entries in `bibliography[]` and cite them as evidence through Evidence and Source. Spec 003's claim citation is rendered from the entry's CSL-JSON plus the locator. Essay pages do not yet link an entry to its page.

## 8. Interaction and technical implementation

### 8.1 Seams (where tests live)
1. The registry through `validateRegistry` and the CLI (schema, four rules, projection, `synth --bibliography`, `import-bib`).
2. Pure modules in `src/bibliography/` (index, filters, match, cited-in, cite inputs), and `citations.ts` in the registry.
3. The built fixture site through `node-html-parser` (a fourth Vitest global setup, build date fixed at 2026-10-17) and Playwright with axe on the bibliography fixture (its own config, port 4326).

### 8.2 Rules that tests enforce
- With no JavaScript the filter form submits as a GET and the list is complete; the filter script (browser-safe, no citation library) is the only script on the index.
- Every export parses with its own format's parser; the same build is the same bytes.
- The entry cited only by the held essay, the held entry, the uncited entries and held Sources appear in no page, index, export, URL or `relations.json` (eleven named leaks, `tests/bibliography/build/leak.test.ts`).
- Every citation in the built site resolves to a public entry page.
- An import is rejected whole when the file does not parse (with its line) and stops before its first write when a target file exists; a second import of the same file creates nothing.

### 8.3 CI and repository
The index and an entry page are in the CI template list and the Lighthouse URLs. `npm run test:e2e:bibliography` is a CI step. The leak scan now reads `.bib` and `.ris`, which no spec's exports had been scanned for before.

## 9. Implementation phases and dependency model

Setup and Foundation, US1, US3, US2, US4, cross-cutting checks, Polish. The registry half needs no Astro. US2 follows US1 for the entry exports; the Atlas inspector link needed spec 005. Stacked pull requests #69 and #70 merged into their stacked bases and so did not reach `main`; #71 carried the same commits to `main`.

## 10. Jira hierarchy and reconciliation history

TCX-7 holds TCX-39, TCX-40, TCX-41 and TCX-50, each with its Spec Kit checklist; TCX-39 also holds Setup, Foundation and the cross-cutting checks. Departures from the plan, recorded in `tasks.md`: the leak mutations live in `build/leak.test.ts` because PRIV-LEAK is an output scan; the code review (T045) changed the entry export's URL to always be the page address, as the spec says, and corrected the contract that said otherwise.

## 11. Programme acceptance criteria

- Every acceptance scenario of US1 to US4 has a passing automated test written first (exceptions are listed in the pull requests).
- `gate` is green on `main`: accessibility 100 and the ADR 0004 budgets on the Bibliography page types. Confirmed on `main` at `869e132`, 19 October 2026.
- No `[NEEDS CLARIFICATION]` remains in the spec.

## 12. Verification ledger

| Claim | Evidence |
|---|---|
| Schema, references, four rules with a mutation each | `tests/registry/unit/bibliography-schema.test.ts`, `src-entry`, `bib-csl`, `bib-edition`, `bib-listed-held` tests, `mutations.ts` |
| Public projection and which entries are public | `bibliography-project.test.ts`, `tests/bibliography/unit/entry-public.test.ts`, `reverse` additions |
| Browse, filter, search; entry page; "cited in" | `build/index-page.test.ts`, `build/entry-page.test.ts`, `unit/index-data.test.ts`, `unit/cited-in.test.ts`, `e2e/filters.spec.ts` |
| Sections and finding aids | `build/entry-page.test.ts` |
| Exports parse in their own format; the site, dataset and layer exports | `unit/cite-inputs.test.ts`, `build/exports.test.ts`, `tests/atlas/unit/inspector-data.test.ts`, `tests/atlas/e2e/inspector.spec.ts` |
| Import: mapping, matching, idempotence, rejection, no partial write | `tests/registry/integration/import-bib.test.ts`, `unit/match.test.ts` |
| Nothing held leaks | `build/leak.test.ts`, `tests/registry/unit/leak-scan.test.ts` (`.bib`, `.ris`) |
| A thousand entries filter in time (SC-005) | `unit/index-data.perf.test.ts` (Node only) |
| Not verified | Firefox, WebKit and Lighthouse (CI runs them); the filter timing in a browser |

## 13. Canonical ownership and propagation

Owned here: the entry, the Source's `entry`, `bibliography[]` on datasets and layers, the four rules, the Bibliography pages, the citation exports, `import-bib`, the public-entry derivation (`citations.ts`). Spec 001 owns the registry, its rule table (four rows added) and `registry scan` (extended for `.bib` and `.ris`); spec 003 owns the shared citation generator; spec 005 owns the inspector the Cite section sits in; **spec 008 owns importing the live bibliography and mapping its section types onto the seven**. The Build Log carries the shipped work; the Decision Log carries the bibliography model (ADR 0014) as [TC-D037](https://vladsimion.atlassian.net/wiki/spaces/~7012186ee7d7085f34fff9bc2bf8fbe8de309/pages/12648509).

## 14. Current checkpoint and delivery authority

Everything is merged, Polish (#73) last: `relations.json` no longer names an unlisted entry (decided by Vlad), quickstart and README, and the code review. Left open: essay pages do not link bibliography entries to entry pages; a Finding-aid badge needs the flagged Source to be published (a warning rule is undecided); follow-up smells from the review (repeated small helpers, three spellings of the format name). Delivery authority: Vlad merges; no story is marked Done until this page is published.
