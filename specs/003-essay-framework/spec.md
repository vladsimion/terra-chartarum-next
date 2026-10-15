# Feature Specification: Essay Framework & Editorial Pipeline

**Feature Branch**: `003-essay-framework`
**Created**: 2026-10-15
**Status**: Draft
**Input**: "Each essay progresses through Concept → Corpus → Research → Outline → Draft → Build → Design QA → Publish → Cross-link." (Constitution, Editorial Governance; principles I, IV, V, VIII)

**Historical question served**: How can a visual essay make a cartographic argument whose every claim is traceable, while keeping its own narrative form?

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Read a visual essay as an argument (Priority: P1)
**Audience**: general readers; students.
As a reader, I read an essay whose thesis is stated up front, whose maps are shown as evidence (linked to their catalogue records), and which ends with a sectioned bibliography.

**Independent Test**: one fixture essay with two embedded map references and a bibliography renders; each map links to its catalogue record; the bibliography shows the seven canonical sections (empty sections hidden).

**Acceptance Scenarios**:
1. **Given** an essay referencing a map ID, **When** rendered, **Then** caption, attribution and rights come from the map's canonical record, not from essay text.
2. **Given** a chapter, **When** rendered, **Then** its bibliography groups entries into the seven canonical sections in canonical order.
3. **Given** an essay, **When** rendered, **Then** its primary room, secondary rooms and related essays/layers are listed.
4. **Given** a claim with a citation, **When** the reader activates it, **Then** source, locator and verification state are shown.

### User Story 2 — Move an essay through the editorial stages (Priority: P1)
**Audience**: editor.
As the editor, each essay records its current stage, and cannot advance unless that stage's exit check passes.

**Independent Test**: an essay fixture at "Draft" with an unresolved reference cannot be set to "Build"; the validator names the failed check.

**Acceptance Scenarios**:
1. **Given** an essay at Concept, **When** promoted to Corpus, **Then** a stated historical question and primary room are required.
2. **Given** an essay at Research, **When** promoted to Outline, **Then** a corpus list with rights state per object is required.
3. **Given** an essay at Build, **When** promoted to Design QA, **Then** every bespoke interaction declares question, evidence and expected interpretation.
4. **Given** an essay at Design QA, **When** promoted to Publish, **Then** integrity, accessibility and performance gates pass and historical, cartographic and data QA are signed off.
5. **Given** a published essay, **When** Cross-link completes, **Then** reverse links exist on every referenced map, layer, place and source.
The full nine-stage exit-check contract and the stage→lifecycle mapping are fixed in ADR 0003 §2 and §5. Pending locators may be published, visibly marked; secure claims require verified locators.

### User Story 3 — Hold an essay safely (Priority: P1)
**Audience**: editor.
As the editor, I can keep an essay held: its title, anchors and metadata never appear on public pages, Atlas payloads, search indexes, sitemaps or deep links.

**Independent Test**: build with one held essay referencing a public layer; grep the built output for the held title and slug — zero matches.

### User Story 4 — Shared interaction components (Priority: P2)
**Audience**: general readers; researchers.
As a reader, essays use consistent components where they fit: timeline, compare slider, scrollytelling, map-linked annotation, evidence panel, place/port profile, citation/export control.

**Independent Test**: each component has a documented question it serves, keyboard operation, reduced-motion variant and no-JS fallback.

### User Story 5 — Research-gated, outcome-dependent publication (Priority: P3)
**Audience**: editor.
As the editor, I can declare alternative publication paths that depend on a research result (e.g. a reserved title used only if evidence class A is reached), so the essay is not written ahead of its evidence.

### Edge Cases
- An essay crossing several rooms: one primary room, several secondary; no duplication.
- An essay that needs a bespoke page layout: allowed, but must still use shell, tokens and the citation contract.
- A citation to a finding aid only: rejected — finding aids are not sources.
- Legacy essays from the live site: none imported. Each is rebuilt natively; until then its old URL redirects to the frozen archive (ADR 0001, spec 008).
- v1 anchor essay is Terra Sigillata (Trench A) without CND: every test pit that would consume attestations needs a non-CND rendering, and the CND retrofit must be additive (ADR 0002). [NEEDS CLARIFICATION: which Trench A test pits depend on CND attestations?]

## Requirements *(mandatory)*
- **FR-001**: Each essay MUST record: ID, title, stage, release state, thesis/historical question, primary room, secondary rooms, corpus (map IDs), datasets/layers used, bibliography entry IDs, Jira epic key.
- **FR-002**: The nine stages MUST be an enumerated, ordered vocabulary; skipping a stage MUST fail validation.
- **FR-003**: Stage promotion MUST run that stage's exit checks.
- **FR-004**: Essays MUST reference maps, places, sources and layers by ID only.
- **FR-005**: Bibliographies MUST render in the seven canonical sections.
- **FR-006**: Held essays MUST leak no metadata into any public output.
- **FR-007**: Every bespoke interaction MUST declare question, evidence and expected interpretation before it can pass Build.
- **FR-008**: Essays MUST support per-essay accent and layout without forking shared contracts.
- **FR-009**: Each essay MUST display citations in Chicago notes-bibliography and offer export of itself as BibTeX, RIS and CSL-JSON (ADR 0004).

### Key Entities
- **Essay**: see FR-001.
- **Stage transition**: essay ID, from, to, checks run, result, date.
- **Interaction declaration**: component, question, evidence IDs, expected interpretation.

## Success Criteria *(mandatory)*
- **SC-001**: Zero held-essay strings in built public output (automated scan on every build).
- **SC-002**: 100% of published essays have a complete stage history and passed exit checks.
- **SC-003**: 100% of map captions in essays are generated from canonical records.
- **SC-004**: A new essay can be scaffolded at Concept with one command and pass validation.
