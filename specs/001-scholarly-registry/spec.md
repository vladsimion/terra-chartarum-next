# Feature Specification: Scholarly Entity Registry & Integrity Gate

**Feature Branch**: `001-scholarly-registry`
**Created**: 2026-10-15
**Status**: Draft
**Input**: "Every scholarly entity has one immutable ID and one canonical record; the registries behave as one linked graph and broken references fail the build." (Constitution II, III, V, VI)

**Historical question served**: How can every claim on the site be traced to the evidence that supports it, at the level of detail the evidence allows?

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Register an entity with a stable identity (Priority: P1)
**Audience**: editor (author-facing); indirectly all four reader audiences.
As the editor, I add a map, place, source, cartographer, dataset or essay record and it receives a stable ID that never changes when I later rename its title or slug.

**Why this priority**: every other feature references entities by ID; without this nothing else can be built.
**Independent Test**: add a record, rename its title and slug, rebuild; the ID and every inbound reference are unchanged.

**Acceptance Scenarios**:
1. **Given** a new place record, **When** it is registered, **Then** it gets a unique ID within its family that is valid against the ID syntax.
2. **Given** an existing record, **When** its title or slug changes, **Then** its ID is unchanged and its old public URL still resolves (redirect or alias).
3. **Given** two records declaring the same ID, **When** the build runs, **Then** it fails and names both files.
4. **Given** an ID that violates the syntax, **When** the build runs, **Then** it fails with the offending value and the rule broken.

### User Story 2 — Record evidence and uncertainty as data (Priority: P1)
**Audience**: historians of cartography; students and researchers; GIS developers.
As a researcher reading a claim, I can see its source, locator, evidence type, date precision, geometry provenance, confidence, reconstruction state, rights and last-verified date.

**Independent Test**: a fixture with one source-geometry feature and one reconstructed feature validates with distinguishable provenance for each, and an invalid enumeration value fails validation. (Displaying provenance to readers belongs to specs 003–005.)

**Acceptance Scenarios**:
1. **Given** a feature whose geometry is a scholarly reconstruction, **When** it is validated, **Then** `geometry_provenance = scholarly_reconstruction` is required and accepted.
2. **Given** a locator marked `verified`, **When** validated, **Then** `verified_by` (a person), `verified_on` and `consulted_copy` (edition + scan URL or shelfmark) are all required; AI-proposed locators stay `pending` until a person confirms them (ADR 0003).
3. **Given** a publishable record missing rights/licence, **When** the build runs, **Then** it fails.
4. **Given** a place absent from a source, **When** recorded, **Then** the absence carries one of the typed silence states rather than a null.
5. **Given** a claim rated `secure`, **When** any of its locators is `pending`, **Then** validation fails.

### User Story 3 — One linked scholarly graph (Priority: P1)
**Audience**: editor; GIS developers.
As the editor, I am stopped at build time if any essay, layer, collection, map record or bibliography refers to something that does not exist.

**Independent Test**: introduce a reference to an unknown `map` ID in an essay fixture; build fails naming the essay, the field and the missing ID.

**Acceptance Scenarios**:
1. **Given** an essay referencing a non-existent map ID, **When** the build runs, **Then** it fails.
2. **Given** a collection whose default layers are not a subset of its members, **When** the build runs, **Then** it fails.
3. **Given** all references resolve, **When** the build runs, **Then** the gate passes and emits a machine-readable integrity report.

### User Story 4 — Reverse relationships ("Cited in", "Used by") (Priority: P2)
**Audience**: collectors; researchers.
As a reader on a map, source or place page, I see every released essay, layer and object that references it.

**Independent Test**: two essays reference one map; the map page lists both, and a held essay is not listed.

### User Story 5 — Shared lifecycle and publication authority (Priority: P2)
**Audience**: editor.
As the editor, every entity carries one shared lifecycle state (`proposed → researching → verified → ready_for_build → in_build → qa → publishable → published`, plus `superseded`/`blocked`), and only `published` entities appear publicly. Essay lifecycle is derived from editorial stage; layer availability is derived from asset existence (ADR 0003).

### Edge Cases
- A retired entity still referenced by an old deep link: must degrade gracefully, never 500. This spec supplies the redirect to the successor; the tombstone and not-found pages are delivered by spec 002 (FR-011).
- A legacy ID imported from the live Terra Chartarum: preserved locally and qualified at the boundary (`tc:{authority}:{family}:{local-id}`), never mass-renamed. Import is in scope (ADR 0001; spec 008).
- An entity referenced only by a held essay: the reference is valid but must not surface publicly.
- Specialist vocabularies stricter than the shared one: kept, with an explicit mapping to the shared semantic layer.

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001**: The system MUST support entity families: essay, map, cartographer, place, source, attestation, dataset, layer, collection, route, event, period, room, bibliography. A `source` points to its `bibliography` entry, which is the only record holding the citation.
- **FR-002**: IDs MUST be immutable, unique per family, syntax-validated and independent of titles and slugs.
- **FR-003**: The system MUST record, per feature or claim where applicable: source ID, locator, locator verification state, evidence type, `valid_from`/`valid_to` (EDTF, ADR 0006), date precision (derived), geometry provenance, confidence, reconstruction state, rights/licence/attribution, last verified date, related entity IDs.
- **FR-004**: Historical absence MUST use the typed silence vocabulary.
- **FR-005**: The build MUST fail on duplicate IDs, unknown references, invalid enumeration values, and missing required provenance/rights fields on publishable records.
- **FR-006**: The build MUST emit an integrity report (machine-readable and human-reviewable).
- **FR-007**: The system MUST derive reverse relationships for every declared reference, filtered by release state.
- **FR-008**: Automated (OCR/HTR/LLM) extractions MUST retain raw evidence and a transformation log, and MUST NOT become publishable without human adjudication.
- **FR-009**: Private acquisition and price fields MUST be excluded from every public output.
- **FR-010**: Confidence MUST use the ordinal scale `secure | probable | possible | conjectural`, plus `unknown`, with written criteria (ADR 0003).
- **FR-011**: Imported layer lifecycle terms MUST map at the boundary: planned→proposed, in-preparation→in_build, in-review→qa.
- **FR-012**: Essays MAY carry optional portal-dimension tags (Measure, Witness, Use, Cosmos, Power, Silence); no UI in v1.

### Key Entities
- **Entity**: id, family, title, slug, lifecycle, release state, relations[].
- **Evidence record**: claim target, source ID, locator, verification state, evidence type, precision fields, provenance, confidence, rights, last verified.
- **Integrity report**: run ID, timestamp, pass/fail, violations[] (rule, entity, field, value).

## Success Criteria *(mandatory)*
- **SC-001**: 100% of publishable records pass the integrity gate on `main`; any violation blocks merge.
- **SC-002**: Renaming any title or slug changes zero IDs and breaks zero links (verified by a regression test over all fixtures).
- **SC-003**: A deliberately broken reference is caught by CI in 100% of seeded mutation tests.
- **SC-004**: Integrity gate runs in under 60 seconds on a 5,000-entity synthetic fixture (≈ 80× the current catalogue).
