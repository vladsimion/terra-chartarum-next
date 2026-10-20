# Feature Specification: The Anchor Essay (Terra Sigillata · Lapidarium Dacicum)

**Feature Branch**: `009-anchor-essay`
**Created**: 2026-10-20
**Status**: Specified (grill 2026-10-20, ADR 0017)
**Input**: ADR 0002 (the v1 anchor is Trench A) and spec 008 (`cutover:check` fails until the anchor essay is published and released). Rebuild the legacy essay "Terra Sigillata · Lapidarium Dacicum" natively for v1 and publish it.

**Historical question served**: the essay's own framing is *nineteen centuries of mapping Dacia and Romania, staged as an excavation: maps as artefacts above the ground line, and as stratified silences below it*. The formal `question` and `thesis` are the author's to write (at Concept and Outline); this spec does not put words in them.

## Clarifications

### Session 2026-10-20 (grill, ADR 0017)

- Q: What is rebuilt? → A: The whole essay as one page, a **faithful port** of the author's text. The legacy source is `src/content/essays/dacia.mdx` at the pinned snapshot `e82afd990fd473a2cdf80896401bc64602a1bd29` (14,988 words; an introduction, six sections: the church that is both, the lapidarium, the comparison desk, the trench, the section comparison, the test pits; and the "Finds shed" appendix). Only what the framework forces changes, and every changed claim is listed and approved by the author one by one.
- Q: What does "Trench A" name? → A: The whole essay. The **Lapidarium** is its first part and a **Stone** is one exhibit of it (GLOSSARY.md). Sections keep their own titles.
- Q: Identity? → A: Title "Terra Sigillata · Lapidarium Dacicum"; slug `dacia-lapidarium`; `legacy_url` `/essays/dacia/`; `authors` Vlad Simion; accent `gold`; rooms Border (primary) and Archive (secondary), the legacy per-section room tags dropped; `portal_dimensions` Measure and Silence (the legacy lenses `mensvra` and `silentium`; the other three have no equivalent).
- Q: Question and thesis? → A: Written by the author; candidate wordings are offered, drawn from the essay's own summary.
- Q: Legacy frontmatter with no successor field? → A: Dropped: `eras`, `regions`, `mapCount`, `yearFrom`, `yearTo`, `readingMinutes`, `metaScores`, `featured`, `order`, `status`, `cover`, `hero`, `publishedAt`, `updatedAt`. `published_on` is the real date of the Publish step.
- Q: Who signs? → A: Vlad Simion signs all four (`historical`, `cartographic`, `data`, `redirect_switched`); the dossier records that no independent review took place.
- Q: JavaScript? → A: None. The legacy scripts total about 4.4 KB gzipped, but three of the five interactive pieces fail without script (a dead toggle, a slider frozen at 50%, a drawing that is probably invisible), so every interaction is rebuilt in native HTML and CSS (ADR 0017).
- Q: Which pieces are declared interactions? → A: Five, one per question the reader is asked to interpret: the compare slider (Hereford against Vesconte), the core-sample scrollytelling, and the three radar charts. The timeline (ported unchanged) and the squeeze toggle (a CSS-only checkbox) are plain presentation, held to the same keyboard, focus and reduced-motion rules.
- Q: How much formal evidence? → A: Only what the framework requires: one evidence record for the source of each of the twelve stones that has one, and one for each declared interaction. The author supplies the locators; the legacy essay has none.
- Q: Which maps does the essay show? → A: `MapFigure` for the six stones that have a map record: `ptolemy`, `peutinger`, `hereford`, `trade-vesconte-1311`, `honterus`, `ortelius`. `trade-vesconte-1321` stays out. The six stones with no map record (Cantacuzino, Cantemir, Josephine, Russian staff 1835, Szathmari, the secret century) are source-only. The satellite stone, which has no source, is ported as written.
- Q: What is released? → A: Only what the essay uses: the twelve sources and their bibliography entries, the six maps, and the evidence. Everything else stays held, and the prose names only released things.
- Q: The test-pit data? → A: The essay's own 52 table rows (four pits, thirteen strata each) are the source of truth, as local data with no CND attestation behind them (ADR 0002's amendment stands). They are cross-checked once against the legacy `data/dacia/attestations.csv` (50 pit rows) and the differences are reported for the author.
- Q: What replaces the legacy `CorpusRef` lines? → A: A plain source line (a citation backed by its evidence record), with the per-stone attestation tallies as literal text re-verified at Design QA. No link to a CND layer or the Atlas (the CND layers stay held).
- Q: How is it delivered? → A: About ten small pull requests by stage group, each merged by the editor, the essay held (no public page) until Publish.

### Session 2026-10-20 (clarify)

- Q: How are the essay and the checks to see the rendered page before Publish, when a held essay has no page? → A: A preview script copies the real registry to a temporary folder, marks the essay and the records it uses published and released in the copy only, and builds and tests that copy. The real registry is never changed, the site gains no path that renders held records, and nothing is duplicated.

- Q: What if a licence statement cannot be made for one of the six maps? → A: That stone drops to source-only, the essay still publishes with the remaining figures, and the dossier records which stones lost theirs and why. A figure is an enhancement, not part of the argument.

### Plan findings 2026-10-20 (amendments the design forced)

- Spec 003 planned the timeline, the compare slider and the scrollytelling as shared components "built when an essay's Outline needs one", so this spec builds those three as shared components (each documented in `docs/essay-components.md` with its question, keyboard operation, reduced-motion variant and no-script equivalent). The radar chart, the squeeze toggle, the stone plate and the pit table are essay-specific. The earlier "no new framework components" out-of-scope line is corrected accordingly.
- Spec 003 FR-016 requires each local Trench A cell to be shown as not yet corpus-backed, and keeps the cells in a cell file beside the essay. The legacy tables show neither; both are added, and the label is a ledger entry.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Read Trench A from start to finish (Priority: P1)
**Audience**: curious readers, map historians, students and researchers.
As a reader, I open `/essays/dacia-lapidarium/` and read the whole of Terra Sigillata · Lapidarium Dacicum: its introduction, the Lapidarium of thirteen stones, the comparison desk, the trench, the section comparison, the four test pits and the appendix, in the author's words.

**Why this priority**: it is the v1 anchor (ADR 0002) and the last gate of the cutover; nothing else here matters if the essay cannot be read.

**Independent Test**: build the site with the essay published and read the page with JavaScript off: all six sections, thirteen stones and four pits are present, in order, and every word of the legacy text is either present or on the approved changed-claim ledger.

**Acceptance Scenarios**:
1. **Given** the published essay, **When** I open its address, **Then** I see the title, the six sections in the legacy order, the thirteen stones with their drawings and the four pits with their thirteen strata each (52 rows).
2. **Given** the legacy text and the rebuilt text, **When** they are compared, **Then** every difference is an entry on the approved changed-claim ledger.
3. **Given** the essay's rooms, **When** I open the Border or Archive room page, **Then** the essay is listed (Border as primary, Archive as secondary).
4. **Given** the page, **When** it loads with JavaScript disabled, **Then** it is complete and nothing on it is a dead control.

### User Story 2 — Work the interactions without a script (Priority: P1)
**Audience**: readers, including keyboard and screen-reader users and people who prefer reduced motion.
As a reader, I compare Hereford with Vesconte on the slider, follow the core sample through its thirteen strata, read the three section comparisons as charts, jump along the timeline, and switch the stones between drawing and squeeze, using only the keyboard if I choose.

**Why this priority**: the interactions are the essay's argument made visible (Constitution IV and VII); the legacy ones fail without script.

**Independent Test**: for each of the five declared interactions, the page shows its question, interpretation and evidence as plain text; it works by keyboard alone; under reduced motion nothing moves; with JavaScript disabled it still does its job. The e2e specs prove this in both colour schemes.

**Acceptance Scenarios**:
1. **Given** the compare slider, **When** I move it by keyboard, **Then** the reveal changes, and with script disabled it still moves.
2. **Given** the core sample, **When** I scroll, **Then** the 13-stratum core drawing is always visible beside the steps, and with script disabled it is visible too.
3. **Given** any of the three radar charts, **When** I read it, **Then** a table of its values sits beneath it, and focusing a legend entry emphasises its series without script.
4. **Given** the squeeze toggle, **When** I use it, **Then** it is a native checkbox with a label and visible focus, and it works with script disabled.
5. **Given** a browser without a newer CSS feature the design uses, **When** the page loads, **Then** the content and every control still work in a plain static form.
6. **Given** `prefers-reduced-motion: reduce`, **When** I use any interaction, **Then** nothing animates.

### User Story 3 — Check what the essay claims (Priority: P1)
**Audience**: historians, students and researchers who cite or test the essay.
As a reader, I can see where each stone's account comes from: a numbered source note with its locator, the source's bibliography entry, and, for each of the stones that has one, a figure that gives the map's caption, credit and licence and links to its collection record.

**Why this priority**: evidence precedes interaction (Constitution IV) and uncertainty is data (III). The legacy essay sourced its stones in prose only.

**Independent Test**: every stone that has a corpus source cites it; each citation resolves to an evidence record with a locator, whose source and bibliography entry are public; each `MapFigure` resolves to a public map.

**Acceptance Scenarios**:
1. **Given** a stone with a corpus source, **When** I read it, **Then** a source line cites it, with a note and locator, and no link to an Atlas layer.
2. **Given** a stone shown with a map figure, **When** I open a figure's link, **Then** I reach that map's collection record, which shows its image only if its reproduction is cleared.
3. **Given** the Hereford stone, **When** the figure is shown, **Then** the title and caption come from the record, not from the prose.
4. **Given** a stone with no map figure (one of the six with no map record, one whose map lost its figure for want of a licence statement, or the satellite), **When** I read them, **Then** they show no map figure and no broken reference.
5. **Given** the essay's notes and bibliography, **When** I read them, **Then** they list exactly the sources cited, grouped as the bibliography page groups them.

### User Story 4 — Old links and the cutover gate (Priority: P1)
**Audience**: anyone with a link to `/essays/dacia/`; the editor at cutover.
As a reader with an old link, I land on the new essay; as the editor, I run `cutover:check` and its anchor-essay step passes.

**Why this priority**: it is what spec 008 requires of this work, and it preserves citations (ADR 0001).

**Independent Test**: with the essay published and released, the redirect inventory has exactly one rule for `/essays/dacia/` pointing at the new page, the generated rule file contains it, and `cutover:check` reports the anchor-essay step as passing.

**Acceptance Scenarios**:
1. **Given** the published essay with `legacy_url`, **When** `registry inventory` is re-run, **Then** `/essays/dacia/` has the outcome `rule` to `/essays/dacia-lapidarium/`.
2. **Given** the archive project, **When** the rule file is applied by pull request, **Then** the old address redirects (301) and `redirect_switched` is signed.
3. **Given** the essay held, **When** `cutover:check` runs, **Then** the anchor-essay step fails naming the slug; **Given** it published and released, **Then** the step passes.

### User Story 5 — Approve what changed in the port (Priority: P2)
**Audience**: the author and editor.
As the author, I approve every change to my text and my data before the essay moves past Draft, and I see where the 52 test-pit rows differ from the legacy attestation data.

**Why this priority**: the essay is the author's own argument; a silent edit would break trust and the record of what was published (Constitution VI).

**Independent Test**: the changed-claim ledger and the reconciliation report exist, every entry is marked approved or resolved by the author, and the essay cannot move past Draft (a test in CI fails from the Build stage on) while any is not.

**Acceptance Scenarios**:
1. **Given** a claim the successor's data contradicts ("thirteen stones" against twelve corpus sources, `yearTo` 2024 against 2026, a derived duration such as "seventeen centuries"), **When** the port reaches it, **Then** it is on the ledger with the legacy text, the proposed text and the reason, and waits for approval.
2. **Given** the two appendix titles the body rule rejects ("Tabula Peutingeriana" and "Hereford Mappa Mundi"), **When** the port reaches them, **Then** they are on the ledger and reworded only after approval.
3. **Given** the 52 test-pit rows and the legacy attestation rows, **When** the reconciliation runs, **Then** every row is compared and every difference is reported; the essay's table stays the source of truth unless the author says otherwise.

### User Story 6 — Release exactly what the essay needs (Priority: P2)
**Audience**: the editor.
As the editor, publishing the essay releases the twelve sources and their bibliography entries, the maps it shows and the evidence, and nothing else; no held record's title, slug or id appears anywhere public.

**Why this priority**: a released record is public (TC-D019); the smallest set is the safest.

**Independent Test**: after Publish, the set of newly public records equals the plan, and the leak scan finds no held identifier in the built site.

**Acceptance Scenarios**:
1. **Given** the essay's references, **When** the Publish promotion is attempted, **Then** it is refused if any referenced map, evidence, source or bibliography entry is not public.
2. **Given** the prose, **When** it names an unreleased record, **Then** the leak scan fails.
3. **Given** the other imported records, **When** the essay is published, **Then** they remain held and absent from every public page.

### Edge Cases
- A map's registry title typed in the prose is rejected by the body rule; both occurrences are in the appendix (the Peutinger and Hereford items).
- The Vesconte stone's heading says "Portolan of the Black Sea" while the registry title is "Eastern Mediterranean portolan"; the figure shows the registry's wording, and the difference is flagged to the author at Design QA.
- The satellite stone has no corpus source and no evidence reference; it is ported as written.
- A source's bibliography entry is thin (title, author, year, note); it is public as it is unless the author enriches it first.
- CSS features the rebuilt interactions use (`:has()`, scroll-driven animation) are missing in an older browser: the content, the controls and the evidence remain, only the enhancement is absent.
- Attestation tallies in the prose are literal text and would drift if the data behind them changed; they are re-verified at Design QA.
- A map the author cannot license is left out of the essay's maps (its stone becomes source-only); a map with no `rights` object cannot enter the Corpus stage; a map still missing `witness_kind` or `makers` fails the gate when it is released.
- The preview copy marks records released only in a temporary folder: if the real registry's records change (a map's rights, an evidence locator), the next preview run reflects it, and a preview that builds does not prove the real registry passes its own gate (that is checked separately before each promotion).
- Re-running `registry inventory` is required after Publish; an out-of-date inventory is refused by the rule-file generator.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The essay record MUST have the title "Terra Sigillata · Lapidarium Dacicum", slug `dacia-lapidarium`, `legacy_url` `/essays/dacia/`, `authors` Vlad Simion, accent `gold`, primary room Border and secondary room Archive, `portal_dimensions` Measure and Silence, and none of the dropped legacy fields.
- **FR-002**: The author MUST write the `question` and the `thesis`; the process MUST NOT promote past Concept or Outline without them.
- **FR-003**: The rebuilt text MUST contain the whole legacy essay (the introduction, the six sections, the thirteen stones, the four pits of thirteen strata, the appendix) in the legacy order, in the author's words, except for entries on the approved changed-claim ledger.
- **FR-004**: Every change to the legacy text or data MUST be an entry on a changed-claim ledger (legacy text, proposed text, reason) approved by the author before the essay is promoted past Draft. The ledger MUST cover at least: the "thirteen stones" count, every derived duration, `yearTo` 2024 against 2026, and the two appendix titles rejected by the body rule.
- **FR-005**: The published page MUST ship no JavaScript. Its interactions MUST work with script disabled, by keyboard alone, and with reduced motion honoured.
- **FR-006**: The essay MUST declare exactly five interactions (the compare slider, the core-sample scrollytelling, and three radar charts), each with an id, a component, a question, one or more evidence records and an interpretation; every `<Interaction>` in the body MUST be declared and every declared one used.
- **FR-007**: The compare slider MUST be built on a native range input; the core sample MUST be a sticky static layout with the drawing always visible; each radar chart MUST be static SVG with a table of its values; the squeeze toggle MUST be a CSS-only labelled checkbox; the timeline MUST be ported unchanged.
- **FR-008**: There MUST be one evidence record for the source of each stone that has one (twelve), each with a locator supplied by the author and none citing a finding aid, plus the evidence for each declared interaction, and no other.
- **FR-009**: `MapFigure` MUST be used for the six maps `ptolemy`, `peutinger`, `hereford`, `trade-vesconte-1311`, `honterus` and `ortelius`, except that a map for which the author cannot make a licence statement MUST drop to source-only (its stone keeps its text and source line), the essay MUST still publish with the remaining figures, and the dossier MUST record which stones lost theirs and why. The other six stones MUST be source-only; the satellite stone MUST carry no citation.
- **FR-010**: Each stone's former `CorpusRef` line MUST become a plain source line backed by its evidence record, with its attestation tallies as literal text; the page MUST NOT link to a CND layer or the Atlas.
- **FR-011**: The 52 test-pit rows MUST be the essay's own local data, kept in a cell file beside the essay with no CND attestation behind them, and each row MUST be shown as not yet corpus-backed (spec 003 FR-016). A one-off reconciliation against the legacy `attestations.csv` MUST report every difference to the author.
- **FR-012**: Each map the essay shows MUST have a `rights` object, and MUST pass the integrity gate when released, including `witness_kind` for each map that is a single object and `makers` resolved (a cartographer, or `unknown` or `not_applicable` with its status).
- **FR-013**: Publishing MUST release exactly the twelve sources and their bibliography entries, the maps it shows (up to six) and the evidence; all other records MUST stay held; the prose MUST name only released records; the leak scan MUST pass.
- **FR-014**: The essay MUST move through the nine stages one at a time with a contiguous `stage_history`, MUST stay held with no public page until the Publish stage, and MUST carry the four sign-offs by Vlad Simion with `published_on` the real publication date; the dossier MUST state that no independent review took place.
- **FR-015**: The essay's page type MUST be added to the accessibility (axe) template list and to the Lighthouse URLs; the page MUST meet accessibility 100 and the ADR 0004 budgets. Before Publish, the rendered essay MUST be available to the author and to the automated checks through a preview build: a script that copies the real registry to a temporary folder, marks the essay and the records it uses as published and released in the copy only, and builds that copy. The script MUST leave the real registry untouched, MUST derive the copy on each run (nothing duplicated), and the accessibility, no-script, keyboard, reduced-motion and budget checks MUST run against that build until the essay is published, and against the production build after.
- **FR-016**: At Publish, `registry inventory` and `registry archive-redirects` MUST be run (neither `migration/redirect-inventory.json` nor `archive/_redirects` has been committed yet) and both files committed for the whole site, so that `/essays/dacia/` has one `rule` outcome to the new page; the archive redirect MUST be applied by pull request and `redirect_switched` signed.
- **FR-017**: `cutover:check`'s anchor-essay step MUST fail while the essay is held and pass once it is published and released.
- **FR-018**: The spec 009 epic, its stories and the Confluence dossier, Build Log and Decision Log MUST be kept in step with `main` (workflow step 4).

### Key Entities
- **Trench A** (the essay record), its **Stones** (thirteen: twelve anchored to a Corpus source, one satellite anchored to none), its four **Pits** and their 52 **Cells** (the essay's own local data).
- **Cell file** (the 52 cells beside the essay, in the framework's cell shape).
- **Evidence record** (a source plus a locator) and **Interaction declaration** (id, component, question, evidence, interpretation).
- **Changed-claim ledger** and **reconciliation report** (the author's approval trail for the port).
- **Release list** (the records made public by Publish), the **preview registry** (a temporary copy with the essay and its records marked released, used only for review and checks) and the **redirect rule** for `/essays/dacia/`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the legacy essay's text is present in the rebuilt essay or is on the approved changed-claim ledger (an automated comparison).
- **SC-002**: The published page ships 0 bytes of JavaScript, and the five interactions pass their keyboard, no-script and reduced-motion checks in both colour schemes.
- **SC-003**: The essay page scores accessibility 100, LCP at most 2.5 s and CLS at most 0.1 in the CI Lighthouse run.
- **SC-004**: All twelve stone sources are cited; every citation resolves to a public evidence record, source and bibliography entry (0 `ESSAY-BODY-PUBLIC` errors).
- **SC-005**: After Publish the newly public records equal the release list exactly, and the leak scan finds 0 held identifiers, titles or slugs in the built site.
- **SC-006**: `/essays/dacia/` redirects (301) to the new essay and `cutover:check`'s anchor-essay step passes.
- **SC-007**: All 52 test-pit rows are compared against the legacy data, and 100% of differences are resolved by the author before the essay leaves Draft.

## Assumptions

- Spec 003's framework, spec 007's rooms, spec 008's inventory and `cutover:check` exist as merged; the framework changes only by gaining the three shared components spec 003 planned (timeline, compare slider, scrollytelling).
- The author, Vlad Simion, supplies: the question and thesis; the licence statement for each map lacking `rights` (`ptolemy`, `peutinger`, `honterus`, `ortelius`); the open worksheet answers for those maps (`ptolemy` and `ortelius`: work or object scope; `peutinger` and `honterus`: which holder; `hereford`: a named maker or `unknown`); the twelve locators; approval of each ledger entry. Those are the critical path.
- The first redirect inventory and rule file have never been committed (spec 008 generates them nearer cutover); this spec's Publish step generates and commits them for the whole site, since `cutover:check` needs both.
- The twelve sources' bibliography entries are thin (title, author, year, note); the author may enrich them before release.
- The other open questions in `docs/review/map-warnings-2026-10-20.csv` concern maps the essay does not use and do not matter here.
- The essay's illustrations are authored inline SVG ("authored reconstructions rather than reproductions"), so no image rights are involved; the legacy cover and hero images are dropped.
- Out of scope: other programmes, CND attestations, new framework components other than the timeline, the compare slider and the scrollytelling that spec 003 planned to build when an essay needs them, any JavaScript, and a first-cut subset of the essay.
