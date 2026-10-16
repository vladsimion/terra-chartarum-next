# Feature Specification: Scholarly Entity Registry & Integrity Gate

**Feature Branch**: `001-scholarly-registry`
**Created**: 2026-10-15
**Status**: Draft
**Input**: "Every scholarly entity has one immutable ID and one canonical record; the registries behave as one linked graph and broken references fail the build." (Constitution II, III, V, VI)

**Historical question served**: How can every claim on the site be traced to the evidence that supports it, at the level of detail the evidence allows?

## Clarifications

### Session 2026-10-16
Resolved in `/grill-with-docs` (decisions recorded in ADR 0006; `GRILL-AGENDA.md`).
- Q: What are the ID authority and local-id rules, and who mints IDs? → A: `tc` plus an allowlist of external authorities; new local-ids are opaque family-prefixed counters minted by a registry command; legacy IDs kept verbatim.
- Q: How are records stored? → A: One Zod-validated content-collection file per entity, filename = local-id; bulk geometry referenced by path.
- Q: How do lifecycle, held and released relate? → A: Held/released is a separate flag (default held); public output needs lifecycle `published` and `released`.
- Q: What is an evidence record? → A: A first-class entity with its own ID, pointing at a target and a source; essays and layers cite it by ID.
- Q: How do old URLs keep working? → A: Slug history generates redirects; superseded redirects to successor; no successor shows a withdrawn page.
- Q: How strict is validation by lifecycle? → A: ID, family, lifecycle and references always errors; provenance, rights and locators errors from `ready_for_build`; everything else below that warns.
- Q: How is silence recorded? → A: As an Attestation with form `silence` and one typed silence state; never `secure` without verified source coverage.
- Q: How are automated extractions handled? → A: Raw snippets and a transformation log under `provenance/`; large artefacts by checksummed reference; a named person must adjudicate before publication.
- Q: What does the integrity report look like? → A: Versioned JSON plus HTML as CI artefacts, stable rule IDs, warnings counted but non-failing.
- Q: What is the family list? → A: Closed: the 14 in FR-001 plus `evidence`; rooms are seven fixed entities; new families need a spec amendment.
- Q: What `local-id` syntax do imports use? → A: The live site's pattern verbatim; every record carries `origin: legacy | minted`.
- Q: What happens to legacy `port` and `project`? → A: `port` imports as a `place` with a port type (logged exception); `project` is not imported.
- Q: How is legacy confidence mapped? → A: high→probable, medium→possible, low→conjectural, never auto-`secure`; original kept.
- Q: How is legacy review state treated? → A: Not lifecycle; imports start at `researching`; `llm_assisted` rows need adjudication; reviewer data carried over only after editor confirmation.
- Q: How are private fields kept out of public output? → A: Separate private block, per-family allowlist projection, post-build leak scan.
- Q: How are dates stored? → A: As EDTF level 0-1 strings with four-digit signed years; precision is derived from the value and never authored; `date_label` is optional free text (ADR 0007, which supersedes the earlier integer-year model).
- Q: How are external authority links stored? → A: `same_as[]` of `{authority, id}`, syntax-validated, no network in the gate.
- Q: What happens when two branches mint the same counter ID? → A: The mint command takes the highest number across the working tree and `main`; the duplicate-ID gate catches a collision in the pull request and the later branch re-mints; an ID is immutable only once merged to `main`.
- Q: Which user stories are in v1, and in what order? → A: All five, built US1 → US3 → US2 → US5 → US4.

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

**Independent Test**: a fixture with one source-geometry feature and one reconstructed feature renders distinguishable provenance for each, and an invalid enumeration value fails validation.

**Acceptance Scenarios**:
1. **Given** a feature whose geometry is a scholarly reconstruction, **When** it is validated, **Then** `geometry_provenance = scholarly_reconstruction` is required and accepted.
2. **Given** a locator marked `verified`, **When** validated, **Then** `verified_by` (a person), `verified_on` and `consulted_copy` (edition + scan URL or shelfmark) are all required; AI-proposed locators stay `pending` until a person confirms them (ADR 0003).
5. **Given** a claim rated `secure`, **When** any of its locators is `pending`, **Then** validation fails.
3. **Given** a publishable record missing rights/licence, **When** the build runs, **Then** it fails.
4. **Given** a place absent from a source, **When** recorded, **Then** the absence carries one of the typed silence states rather than a null.

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
As the editor, every entity carries one shared lifecycle state (`proposed → researching → verified → ready_for_build → in_build → qa → publishable → published`, plus `superseded`/`blocked`) and a release state (`held | released`, default `held`). Only `published` and `released` entities appear publicly. Essay lifecycle is derived from editorial stage; layer availability is derived from asset existence (ADR 0003, ADR 0006).

**Independent Test**: a fixture with one entity per lifecycle value, half released, produces public output containing exactly the `published` + `released` ones.

**Acceptance Scenarios**:
1. **Given** a `published` entity left `held`, **When** public output is built, **Then** it appears in no page, payload, search index, export or redirect.
2. **Given** a `released` entity at any lifecycle other than `published`, **When** public output is built, **Then** it does not appear.
3. **Given** a record below `ready_for_build` missing provenance or rights, **When** the gate runs, **Then** it reports a warning and passes; the same record at `publishable` fails.
4. **Given** an essay at stage Draft, **When** its lifecycle is read, **Then** it is `verified` and cannot be set by hand.
5. **Given** a `published` layer with no runnable asset, **When** the build runs, **Then** it fails.

### Edge Cases
- A retired entity still referenced by an old deep link: must degrade gracefully, never 500. A `superseded` entity redirects to its successor; a retired entity with no successor serves a withdrawn page.
- A former slug that collides with a live slug: the build fails.
- A legacy ID imported from the live Terra Chartarum: preserved locally and qualified at the boundary (`tc:{authority}:{family}:{local-id}`), never mass-renamed. Import is in scope (ADR 0001; spec 008).
- An entity referenced only by a held essay: the reference is valid but must not surface publicly.
- Specialist vocabularies stricter than the shared one: kept, with an explicit mapping to the shared semantic layer.

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001**: The system MUST support exactly these entity families: essay, map, cartographer, place, source, attestation, dataset, layer, collection, route, event, period, room, bibliography entry, evidence. The list is closed; adding a family requires a spec amendment. The seven rooms are fixed entities with permanent IDs.
- **FR-002**: IDs MUST be immutable, unique per family, syntax-validated and independent of titles and slugs. Boundary form is `tc:{authority}:{family}:{local-id}`. Authority is `tc` or an allowlisted external code. New local-ids are opaque, lowercase, family-prefixed counters minted by a registry command (highest number across the working tree and `main`; a collision between branches is caught by the duplicate-ID gate and the later branch re-mints before merge, since an ID is immutable only once on `main`); imported local-ids follow the legacy pattern verbatim. Every record carries `origin: legacy | minted`.
- **FR-003**: The system MUST record, per feature or claim where applicable, through evidence records (own ID, target, source ID): locator, locator verification state, evidence type, `valid_from`/`valid_to` as EDTF level 0-1 dates with four-digit signed years (ADR 0007; precision is derived from the value and never authored) and optional `date_label`, geometry provenance, confidence, reconstruction state, rights/licence/attribution, last verified date, related entity IDs. Essays and layers cite evidence records by ID and never embed provenance. External authority links are `same_as[]` entries of `{authority, id}`, validated by syntax only.
- **FR-004**: Historical absence MUST be an Attestation with form `silence` carrying exactly one typed silence state. It MUST NOT be rated `secure` unless the source's coverage is verified, and silence states are invalid on any other entity.
- **FR-005**: The build MUST fail, at every lifecycle state, on invalid ID, unknown family, invalid lifecycle, duplicate IDs, unknown references and invalid enumeration values. Missing provenance, rights or locator fields MUST fail from `ready_for_build` upward and be reported as warnings below it. `publishable` and `published` records are checked against the full rule set.
- **FR-006**: The build MUST emit a versioned `integrity-report.json` and a rendered HTML summary as CI artefacts (not committed). Violations carry a stable rule ID (e.g. `ID-DUPLICATE`), severity, entity, file, field, value and expected. The CLI exits non-zero on any error; warnings are counted and never fail the build.
- **FR-007**: The system MUST derive reverse relationships for every declared reference, listing only entities that are `published` and `released`.
- **FR-008**: Automated (OCR/HTR/LLM) extractions MUST retain small raw extractions and a transformation log (tool, version, input, date, parameters) under `provenance/`, with large artefacts referenced by checksummed URL or shelfmark. A step stays `proposed` until a named person adjudicates it; a publishable record whose chain holds an unadjudicated automated step MUST fail the gate.
- **FR-009**: Private acquisition and price fields MUST live in a separate private block and be excluded from every public output. Public output MUST be projected from a per-family allowlist (new fields are private by default), and a post-build scan MUST fail the build on any private value or held ID in the output.
- **FR-010**: Confidence MUST use the ordinal scale `secure | probable | possible | conjectural`, plus `unknown`, with written criteria (ADR 0003).
- **FR-011**: Imported layer lifecycle terms MUST map at the boundary: planned→proposed, in-preparation→in_build, in-review→qa, published→published (the layer stays `held` until the editor releases it). The original term is kept as `legacy_layer_status`.
- **FR-012**: Essays MAY carry optional portal-dimension tags (Measure, Witness, Use, Cosmos, Power, Silence); no UI in v1.
- **FR-013**: Each entity MUST keep a slug history. The build MUST generate a redirect rule for every former slug, fail on collision with a live slug, redirect `superseded` entities to their successor and serve a withdrawn page for retired entities with no successor.
- **FR-014**: Legacy import MUST preserve IDs verbatim; fold `port` records into `place` with a port place type (logged as the one family exception) and not import `project`; map confidence high→probable, medium→possible, low→conjectural (never `secure`, original kept as `legacy_confidence`); start non-layer imports at `researching` (imported layers follow FR-011); keep `legacy_review_state`; and carry reviewer data over as `verified_by`/`verified_on` only after editor confirmation.
- **FR-015**: Every record MUST carry a release state (`held | released`, default `held`); public output requires lifecycle `published` and `released`.

### Key Entities
- **Entity**: id, family, origin (`legacy | minted`), title, slug, slug_history[], lifecycle, release state (`held | released`), same_as[], relations[], optional private block.
- **Evidence record**: own stable ID, target (entity ID, or entity plus feature ID), source ID, locator, verification state, evidence type, precision fields, provenance, confidence, rights, last verified.
- **Integrity report**: schema version, run ID, commit, timestamp, pass/fail, counts, violations[] (rule ID, severity, entity, file, field, value, expected).

## Success Criteria *(mandatory)*
- **SC-001**: 100% of publishable records pass the integrity gate on `main`; any violation blocks merge.
- **SC-002**: Renaming any title or slug changes zero IDs and breaks zero links (verified by a regression test over all fixtures).
- **SC-003**: Every named seeded mutation (duplicate ID, unknown reference, bad enumeration, missing rights, pending locator under `secure`, and so on) produces its specific rule ID in CI; a mutation that produces no violation fails the suite.
- **SC-004**: Integrity gate runs in under 60 seconds on a 5,000-entity synthetic fixture (≈ 80× the current catalogue).
