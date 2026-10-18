# Feature Specification: Essay Framework & Editorial Pipeline

**Feature Branch**: `003-essay-framework`
**Created**: 2026-10-15
**Status**: Clarified (2026-10-16)
**Input**: "Each essay progresses through Concept → Corpus → Research → Outline → Draft → Build → Design QA → Publish → Cross-link." (Constitution, Editorial Governance; principles I, IV, V, VIII)

**Historical question served**: How can a visual essay make a cartographic argument whose every claim is traceable, while keeping its own narrative form?

## Clarifications

### Session 2026-10-16 (grill, ADRs 0002, 0006 and 0010)
- Q: What does an essay record hold, and where do rooms live? → A: `rooms: {primary, secondary[]}` is an essay-only field (at most two secondary rooms); spec 007 decides room membership for other families. The record also has `question`, `thesis` (required from Outline), `layers`, `bibliography` (bibliography-entry IDs), `accent` (an accent-slot name, ADR 0008), `authors`, `published_on` (EDTF), `legacy_url`, `jira` (never on the public allowlist), `open_questions`, `interactions`, `signoffs`, `redirect_switched` and `stage_history`.
- Q: How does an essay advance a stage? → A: `registry promote <essay-id> <stage>` runs the cumulative exit checks for the target stage and only then rewrites `stage` and appends to `stage_history` (stage, date, person). The gate re-checks the recorded stage on every run, that the history is contiguous, and that its last entry equals `stage`.
- Q: Human sign-offs? → A: `signoffs: {historical, cartographic, data}`, each with `by` (a person) and `on` (a date); Design QA to Publish fails without all three; a tool cannot sign.
- Q: Where do interaction declarations live? → A: In the record, as `interactions[]` (`id`, `component`, `question`, `evidence[]`, `interpretation`); the MDX body refers to one by `id`; the gate checks that every used `id` is declared and every declared evidence ID resolves, scanning the body for tags rather than parsing MDX in full.
- Q: What does a citation point at? → A: A claim-level citation references an Evidence record; the note is rendered in Chicago notes-bibliography from the source's bibliography entry plus the locator, with the verification state shown (pending is visibly marked). Rendering and the BibTeX, RIS and CSL-JSON exports happen at build time.
- Q: Which shared components ship in v1? → A: The interaction-declaration contract, the citation/export control and the evidence panel. Timeline, compare slider, scrollytelling, map-linked annotation and place/port profile are built when an essay's Outline needs one, each with its question, keyboard operation, reduced-motion variant and no-JS fallback.
- Q: Research-gated publication (US5)? → A: Out of v1; it gets its own grill when a real case needs it.
- Q: Which Trench A test pits depend on CND attestations? → A: All four Sondaje pits. Each has 13 name cells; 12 per pit are attestation-shaped (48 cells) and stratum 0 (the Present Survey) is local and never migrates. In v1 the cells are the essay's own local data file, each marked `corpus: none` and shown as "not yet corpus-backed"; the CND retrofit adds an `attestation` ID to a cell and changes nothing else.
- Q: Section-level room tags? → A: Not in v1; rooms are per essay only.
- Q: Is the Terra Sigillata rebuild part of this spec? → A: No. This spec delivers the framework and one fixture essay; the rebuild is its own Jira epic, run through the nine stages, starting after this spec's first slice.
- Q: How is "redirect switched" recorded? → A: A rebuilt essay records `legacy_url`; reaching Cross-link requires `redirect_switched: {by, on}` (the archive project's redirect file is outside this repository); spec 008 generates the archive redirect list from `legacy_url`.
- Q: Who proves accessibility and performance at Design QA to Publish? → A: CI. Promoting to Publish requires `design_qa_passed`; the pull request that sets Publish cannot merge unless the required `gate` check, which includes the axe and Lighthouse steps, is green, and the essay's page type must be in the CI template list for it to measure the page. `promote` prints this rather than claiming it ran the checks or testing the list (the list is keyed by page type, so a per-essay test would always pass; amended 2026-10-18 with ADR 0010).
- Q: Must everything an essay shows be public at Publish? → A: Yes for the body: Publish fails if anything the body embeds or cites (a map figure, a layer, a claim citation, an evidence panel) is not published and released. Entities listed only in the record's metadata may stay held and are not shown.
- Q: How are related essays declared? → A: Through the existing `relations[]`; the page lists the entries that are public essays, in title order; a held related essay is not listed.
- Q: The thesis? → A: A one-sentence `thesis` field, required from Outline; the essay page renders it up front and cards and metadata reuse it. The question is required from Concept.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Read a visual essay as an argument (Priority: P1)
**Audience**: general readers; students.
As a reader, I read an essay whose thesis is stated up front, whose maps are shown as evidence (linked to their catalogue records), and which ends with a sectioned bibliography.

**Independent Test**: one fixture essay with two embedded map references and a bibliography renders; each map links to its catalogue record; the bibliography shows the seven canonical sections (empty sections hidden).

**Acceptance Scenarios**:
1. **Given** an essay referencing a map ID, **When** rendered, **Then** caption, attribution and rights come from the map's canonical record, not from essay text.
2. **Given** a chapter, **When** rendered, **Then** its bibliography groups entries into the seven canonical sections in canonical order.
3. **Given** an essay, **When** rendered, **Then** its primary room, secondary rooms and related essays/layers are listed (related essays come from `relations[]`, public essays only, in title order).
4. **Given** a claim with a citation, **When** the reader activates it, **Then** source, locator and verification state are shown.

### User Story 2 — Move an essay through the editorial stages (Priority: P1)
**Audience**: editor.
As the editor, each essay records its current stage, and cannot advance unless that stage's exit check passes.

**Independent Test**: an essay fixture at "Draft" with an unresolved reference cannot be set to "Build"; the validator names the failed check.

**Acceptance Scenarios**:
1. **Given** an essay at Concept, **When** promoted to Corpus, **Then** a stated historical question and primary room are required.
2. **Given** an essay at Research, **When** promoted to Outline, **Then** a corpus list with rights state per object is required.
3. **Given** an essay at Build, **When** promoted to Design QA, **Then** every bespoke interaction declares question, evidence and expected interpretation.
4. **Given** an essay at Design QA, **When** promoted to Publish, **Then** the integrity gate passes, the three sign-offs are present, and accessibility and performance are proved by the CI run on the pull request that sets Publish.
5. **Given** a published essay, **When** Cross-link completes, **Then** reverse links exist on every referenced map, layer, place and source, and a rebuilt essay carries a named `redirect_switched` confirmation.
6. **Given** any essay, **When** `registry promote` moves it to a later stage, **Then** `stage_history` gains an entry (stage, date, person) and the next gate run accepts it; a hand edit that skips a stage or breaks the history fails the gate.
7. **Given** an essay at Design QA, **When** promoted to Publish, **Then** all three sign-offs name a person and a date, `design_qa_passed` is set, and `promote` prints that the CI template list must hold the essay's page type and the `gate` check must be green on the pull request.
The full nine-stage exit-check contract and the stage→lifecycle mapping are fixed in ADR 0003 §2 and §5. Pending locators may be published, visibly marked; secure claims require verified locators.

### User Story 3 — Hold an essay safely (Priority: P1)
**Audience**: editor.
As the editor, I can keep an essay held: its title, anchors and metadata never appear on public pages, Atlas payloads, search indexes, sitemaps or deep links.

**Independent Test**: build with one held essay referencing a public layer; grep the built output for the held title and slug — zero matches.

### User Story 4 — Shared interaction components (Priority: P2; v1 ships the declaration contract, the citation/export control and the evidence panel)
**Audience**: general readers; researchers.
As a reader, essays use consistent components where they fit: timeline, compare slider, scrollytelling, map-linked annotation, evidence panel, place/port profile, citation/export control.

**Independent Test**: each component has a documented question it serves, keyboard operation, reduced-motion variant and no-JS fallback.

### User Story 5 — Research-gated, outcome-dependent publication (Priority: P3; out of v1, to be grilled when a real case needs it)
**Audience**: editor.
As the editor, I can declare alternative publication paths that depend on a research result (e.g. a reserved title used only if evidence class A is reached), so the essay is not written ahead of its evidence.

### Edge Cases
- An essay crossing several rooms: one primary room, several secondary; no duplication.
- An essay that needs a bespoke page layout: allowed, but must still use shell, tokens and the citation contract.
- A citation to a finding aid only: rejected — finding aids are not sources.
- Legacy essays from the live site: none imported. Each is rebuilt natively; until then its old URL redirects to the frozen archive (ADR 0001, spec 008).
- v1 anchor essay is Terra Sigillata (Trench A) without CND: all four Sondaje test pits consume CND attestations (48 cells; stratum 0 is local). Each needs a non-CND rendering, which is the essay's own local cell data marked `corpus: none`, and the CND retrofit is additive (ADR 0002 amendment). The rebuild itself is a separate epic.
- A held essay generates no page, appears in no related list and leaks no title, slug or anchor into any output.

## Requirements *(mandatory)*
- **FR-001**: Each essay MUST record: ID, title, authors, publication date (EDTF), stage and stage history, release state, historical question (from Concept) and thesis (from Outline), primary room and up to two secondary rooms, corpus (map IDs), datasets/layers used, bibliography entry IDs, accent slot, the legacy URL it supersedes (if any), open questions, interaction declarations, sign-offs, redirect confirmation (if rebuilt) and Jira epic key (never public).
- **FR-002**: The nine stages MUST be an enumerated, ordered vocabulary; skipping a stage MUST fail validation.
- **FR-003**: Stage promotion MUST go through `registry promote`, which runs the cumulative exit checks for the target stage, then records the stage and appends to `stage_history`; the gate MUST re-check the recorded stage, the contiguity of the history and that its last entry equals `stage`.
- **FR-004**: Essays MUST reference maps, places, sources and layers by ID only.
- **FR-005**: Bibliographies MUST render in the seven canonical sections.
- **FR-006**: Held essays MUST leak no metadata into any public output.
- **FR-007**: Every bespoke interaction MUST declare question, evidence and expected interpretation, in the essay record, before it can pass Build; the essay body refers to it by id and the gate checks both directions.
- **FR-008**: Essays MUST support per-essay accent and layout without forking shared contracts.
- **FR-009**: Each essay MUST display citations in Chicago notes-bibliography and offer export of itself as BibTeX, RIS and CSL-JSON (ADR 0004), generated at build time.
- **FR-010**: A claim-level citation MUST reference an Evidence record and show source, locator and verification state; a pending locator is visibly marked and never carries a `secure` claim.
- **FR-017**: Publish MUST fail if anything the essay body embeds or cites is not public (published and released); metadata-only references to held entities remain valid and are never shown.
- **FR-011**: Sign-offs (historical, cartographic, data QA) MUST each name a person and a date; an automated tool cannot sign.
- **FR-012**: Accessibility and performance at Publish MUST be proved by CI: the essay's page type is in the CI template list and the required `gate` check is green on the pull request that sets Publish.
- **FR-013**: A rebuilt essay MUST record `legacy_url`, and reaching Cross-link MUST require `redirect_switched` (a person and a date).
- **FR-014**: `rooms` MUST be an essay-only field; the primary room is required from Concept; at most two secondary rooms.
- **FR-015**: A new essay MUST be scaffoldable at Concept with one command, `registry new essay`, and pass validation.
- **FR-016**: Trench A cells that would consume CND attestations MUST be the essay's local data marked `corpus: none` and shown as not yet corpus-backed; a later `attestation` ID MUST be the only change a retrofit makes to a cell.

### Key Entities
- **Essay**: see FR-001.
- **Stage history entry**: stage, date, person (appended by `registry promote`).
- **Sign-off**: kind (historical, cartographic, data, redirect), person, date.
- **Interaction declaration**: id, component, question, evidence IDs, expected interpretation.
- **Claim citation**: reference to an Evidence record, plus an optional note.

## Success Criteria *(mandatory)*
- **SC-001**: Zero held-essay strings in built public output (automated scan on every build).
- **SC-002**: 100% of published essays have a complete stage history and passed exit checks.
- **SC-003**: 100% of map captions in essays are generated from canonical records.
- **SC-004**: A new essay can be scaffolded at Concept with `registry new essay` and pass validation.
- **SC-005**: No essay's stage can be recorded without its cumulative exit checks and a contiguous stage history (asserted by named mutations in the gate's suite).
