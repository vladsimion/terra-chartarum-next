# Feature Specification: Authoring Tooling

**Feature Branch**: `010-authoring-tooling`
**Created**: 2026-11-21
**Status**: Draft (grill 2026-11-18, ADR 0018 and ADR 0019)
**Input**: Jira epic TCX-59. Tooling that removes authoring friction for a single maintainer **without weakening any validation rule**; no automation writes a canonical record. Stories TCX-61 (editor schemas), TCX-62 (record scaffolding), TCX-63 (dependents graph), TCX-64 (link and manifest checker); the checks of TCX-65 are done on `claude/modest-noether-nlycur`.

**Historical question served**: none directly. This spec serves the work that serves every question: it makes a new record, a correction and a dead citation cheaper for the one person who maintains the registry, so that the scholarly rules stay strict without becoming a reason to stop adding evidence.

## Clarifications

### Session 2026-11-18 (grill TCX-60, ADR 0018 and ADR 0019)

- Q: How are IDs minted for a new record? → A: By ADR 0006's family-prefixed counters (`place-000123`), unchanged. A collision between branches is caught by `ID-DUPLICATE` and the later branch re-mints. Random codes were considered and rejected: they would supersede `ID-SYNTAX` and every counter-minting caller to fix a case the gate already catches.
- Q: Which families can be scaffolded? → A: Every family except `room`, which has seven fixed entities. `registry new essay` keeps its current options and its MDX body stub.
- Q: How is provenance scaffolded? → A: As a visible checklist. A field with a defined "not yet" value gets it (locator `state: pending`, `confidence: unknown`); a field without one (`verified_by`, `verified_on`, `consulted_copy`, source, rights, licence) is written as a commented-out key under `# To complete before ready_for_build`. The stub validates as a draft; the rules flag the gaps once it is promoted. The checklist is derived from the rules' field lists, never typed.
- Q: How do R pipelines get IDs? → A: By calling the registry's own command (`registry mint` or `registry new`), pinned and recorded like any external tool. There is no second minter in R.
- Q: Which files get editor schemas? → A: Every YAML record under `content/`, essays included. The schemas are generated from the registry's schemas and never committed, so they cannot drift.
- Q: What does the dependents graph cover? → A: Every record, held included, by the same definition of a reference the gate uses. It is a CI artefact beside the integrity report, not committed and not deployed; it is not public in v1.
- Q: What does the link checker check, and when? → A: The URLs records depend on (consulted copies, map image sources and IIIF manifests, bibliography digital copies, dataset source URLs), weekly, outside the build and the gate. A broken URL opens one Jira issue; it never changes a record's verified state.

### Session 2026-11-21

- Q: TCX-65 found that collection, route, event and period records have no publication requirements, so an empty one passes at `publishable`. Does spec 010 add them? → A: No. Spec 010 stays tooling and adds or weakens no rule for them; their stubs carry an empty checklist, and the gap is owned by the first spec that publishes such a record (FR-019).

## User Scenarios & Testing *(mandatory)*

### User Story 1 — A new record, minted and checklisted (Priority: P1) · TCX-62

The maintainer runs one command naming a family and a title, and gets a new record file: a freshly minted ID that collides with nothing, at `proposed` and `held`, with every field its rules will later demand visible as a checklist. They never type an ID.

**Audience**: 4 (developers and researchers in historical GIS and digital editions), and the maintainer.

**Why this priority**: IDs are immutable once published (Principle V). A hand-typed ID is the one authoring mistake that cannot be corrected later, and the R pipelines need the same minter. Everything else in this spec is convenience; this is integrity.

**Independent Test**: Run the command once per scaffoldable family against a copy of the registry. Each run writes exactly one new file, the gate has no more errors than before, and promoting the stub to `ready_for_build` produces exactly the errors its checklist named.

**Acceptance Scenarios**:

1. **Given** a registry, **When** the maintainer scaffolds a record of any family except `room`, **Then** one file is written with the next free counter ID for that family, at lifecycle `proposed` and release `held`, and the gate reports no new error.
2. **Given** a family whose rules require provenance from `ready_for_build`, **When** its stub is written, **Then** each required field with a "not yet" value carries it, each without one is a commented-out key under `# To complete before ready_for_build`, and the list matches the rules' own field list for that family.
3. **Given** a stub, **When** it is promoted to `ready_for_build` with nothing filled in, **Then** the gate reports an error for each checklist item and for nothing else.
4. **Given** the maintainer asks for `room`, or for a family that does not exist, **When** the command runs, **Then** it refuses, writes nothing and says why.
5. **Given** a write that would leave the registry with more errors than before, **When** the command finishes, **Then** what it wrote is removed again and the registry is byte-for-byte as it was.
6. **Given** an R pipeline needs an ID, **When** it calls the registry command, **Then** it receives the same ID the command line would have minted, and its tests can replace the call with a stand-in.

---

### User Story 2 — What would a correction touch? (Priority: P2) · TCX-63

Before correcting a record, the maintainer asks which other records rely on it, held ones included, directly and through others, and sees each one with how it is linked.

**Audience**: 4, and the maintainer.

**Why this priority**: A correction to a source or a map can silently undercut an essay's claim two links away. The public "Cited in" and "Used by" lists show only public, direct referrers, which is the wrong view for an editor.

**Independent Test**: On a fixture registry with known chains (an essay citing evidence that cites a source that points at a bibliography entry), the query for the entry lists the source as direct and the evidence and essay as indirect, each with its path; the build's graph artefact contains the same edges.

**Acceptance Scenarios**:

1. **Given** any record, **When** the maintainer queries its dependents, **Then** direct dependents are listed apart from indirect ones, each with its reference type and the path that reaches it.
2. **Given** a held record that depends on the queried one, **When** the query runs, **Then** it is listed and marked held.
3. **Given** a reference cycle, **When** the query runs, **Then** it terminates and lists each record once.
4. **Given** an ID that does not exist, **When** the query runs, **Then** it says so and exits with a failure.
5. **Given** a build, **When** it finishes, **Then** the full graph (nodes and typed edges) and a static viewer are written as build artefacts beside the integrity report, and neither is committed nor deployed.
6. **Given** a record kind of reference the gate recognises, **When** the graph is built, **Then** it contains that edge: the graph and the gate share one definition of a reference.

---

### User Story 3 — The editor knows the schema (Priority: P2) · TCX-61

While editing a record, the maintainer sees misspelt fields and invalid values underlined as they type, gets the allowed values of a vocabulary field with their glossary definitions, and is offered existing IDs, with their titles, in a reference field.

**Audience**: 4, and the maintainer.

**Why this priority**: Most gate failures today are typos found minutes later in CI. Catching them at the keyboard is the cheapest friction to remove, but it is a convenience: the gate stays the authority.

**Independent Test**: Generate the schemas from a clean install and validate the repository's records against them: every record the gate accepts structurally is accepted, a record with a misspelt field or an unknown vocabulary value is rejected, and every vocabulary value carries its glossary definition.

**Acceptance Scenarios**:

1. **Given** a fresh install, **When** the schemas are generated, **Then** there is one for every family's record file, essays included, and none is committed to the repository.
2. **Given** a vocabulary value with no definition in `GLOSSARY.md`, **When** the schemas are generated, **Then** generation fails and names the value.
3. **Given** a record the gate's structural checks accept, **When** it is validated against its generated schema, **Then** it is accepted; **given** a field the family does not define or a value outside its vocabulary, **Then** it is rejected.
4. **Given** a reference field, **When** suggestions are generated, **Then** they list existing IDs of the right family with their titles; an ID added since the last generation is still accepted by the gate if it exists, and a missing one still fails the gate.
5. **Given** the recommended editor setup, **When** the maintainer opens the repository, **Then** the editor is pointed at the generated schemas without further configuration.

---

### User Story 4 — A dead link becomes a ticket, never an edit (Priority: P3) · TCX-64

Once a week, every external URL the registry depends on is checked. A broken one opens a single Jira issue naming the records that use it; a IIIF manifest whose images changed opens a lower-severity review issue; a verified reading with no archived copy gets a pull request proposing one. Nothing is written to a record without a person merging it.

**Audience**: 2 (map collectors and historians of cartography) and 3 (students and researchers), whose citations must stay followable; and the maintainer.

**Why this priority**: Link rot is slow and nothing reader-facing breaks the day a library moves a scan, so it can come last. It matters because a citation nobody can follow is a claim nobody can check (Principle VI).

**Independent Test**: Run the checker against a fixture registry and a stub network that answers each URL with a planned status: one issue per broken URL, none repeated on a second run, a review issue for a manifest whose canvases changed, a pull request for a verified locator with no archived copy, and no record file changed by the run itself.

**Acceptance Scenarios**:

1. **Given** the registry, **When** the weekly check runs, **Then** it checks the URLs in locators' consulted copies, map image sources and institutional IIIF manifests, bibliography entries' digital copies and datasets' upstream URLs, with per-host rate limits and retries.
2. **Given** a URL that fails after retries, **When** the run ends, **Then** one Jira issue exists for it, listing every record that uses it; **given** the same failure next week, **Then** no second issue is opened.
3. **Given** a verified locator whose consulted copy is now dead, **When** the run ends, **Then** the locator is still verified: a dead link never changes a reading that happened.
4. **Given** a IIIF manifest whose canvases changed by ID or count since the last run, **When** the run ends, **Then** a separate, lower-severity review issue names the manifest and the records and georeferences that point into it.
5. **Given** a verified locator with no archived copy, **When** the run ends, **Then** a snapshot has been requested and a pull request proposes the archived copy's URL and date on that locator; nothing is merged automatically.
6. **Given** the build or the gate, **When** either runs, **Then** neither makes a network request for this check, so an outage elsewhere cannot block a deploy.

---

### Edge Cases

- Two branches each scaffold the next place before either merges: both mint the same counter; `ID-DUPLICATE` fails the second merge and that branch re-mints (ADR 0006). No lock or central counter is introduced.
- The scaffold command is run in a registry that already has errors: the rollback compares error counts before and after, so pre-existing errors neither block it nor are blamed on it.
- A family gains a new provenance rule after this spec: its field appears in the next stub with no edit to the scaffold, because the checklist is read from the rules.
- A reference field holds an ID from an external authority (`same_as[]`): the graph records it as an external edge and the checker does not treat it as a URL.
- A record cited only by held records: the dependents query lists them; the public "Cited in" still shows nothing.
- A host rate-limits or blocks the checker: after retries the URL is reported as unreachable, not as dead, and is retried next week before an issue is opened.
- The same broken URL is used by twenty records: one issue, listing the twenty.
- The Jira or GitHub token is missing or expired: the run fails loudly in its own workflow and changes nothing; the build is unaffected.
- Collection, route, event and period records currently have no publication requirements, so an empty record of theirs passes at `publishable` (found by TCX-65). Their stubs carry an empty checklist; adding requirements is left to the first spec that publishes such a record (FR-019).

## Requirements *(mandatory)*

### Functional Requirements

**Scaffolding (US1, TCX-62, ADR 0018)**

- **FR-001**: The registry command MUST scaffold a record of any family except `room` from a family and a title, minting its ID with the existing counter minter (ADR 0006 item 1), at lifecycle `proposed` and release `held`.
- **FR-002**: The command MUST refuse `room` and unknown families, writing nothing.
- **FR-003**: The stub MUST carry, for each field the family's rules require from `ready_for_build` upward, either the field's defined "not yet" value or a commented-out key under the heading `# To complete before ready_for_build`. The list MUST be derived from the rules, not typed into the scaffold.
- **FR-004**: The stub MUST validate as a draft: the gate reports no new error after it is written.
- **FR-005**: If the registry has more errors after the write than before, the command MUST remove what it wrote and report failure.
- **FR-006**: `registry new essay` MUST keep its current options, record and MDX body stub.
- **FR-007**: R data-prep pipelines MUST obtain IDs only by calling the registry command; the call MUST be pinned and recorded like any external tool, and one integration test MUST run the real command.

**Dependents (US2, TCX-63, ADR 0019 §2)**

- **FR-008**: The dependents graph MUST be built from the same definition of a reference the gate and the public reverse lists use, and MUST include held records.
- **FR-009**: Every build MUST write the graph (nodes and typed edges) and a static viewer as artefacts beside the integrity report; neither may be committed or deployed.
- **FR-010**: A query by ID MUST list direct dependents separately from indirect ones, each with its reference type, its path, and whether it is held; it MUST terminate on cycles and fail on an unknown ID.

**Editor schemas (US3, TCX-61, ADR 0019 §1)**

- **FR-011**: A schema for every family's YAML record, essays included, MUST be generated from the registry's own schemas on install, on starting the development server and on build, and MUST NOT be committed.
- **FR-012**: Every value of a shared vocabulary (lifecycle, release, confidence, geometry provenance, silence state, locator state, evidence type) MUST carry its `GLOSSARY.md` definition; a value with no definition MUST fail generation.
- **FR-013**: Reference fields MUST offer existing IDs of the right family with their titles, regenerated on demand. The suggestions MUST NOT change what the gate accepts.
- **FR-014**: The repository MUST recommend the editor extension that reads the schemas and point it at them. The schemas are a convenience and never a gate.

**Link and manifest checker (US4, TCX-64, ADR 0019 §3)**

- **FR-015**: A weekly scheduled workflow MUST check the URLs of locators' consulted copies, map image sources and institutional IIIF manifests, bibliography entries' digital copies and datasets' upstream URLs, with per-host rate limits and retries. It MUST NOT run in the build or the gate.
- **FR-016**: Each URL still failing after retries MUST have exactly one open Jira issue listing the records that use it, not duplicated across runs. A failure MUST NOT change any record, and in particular never a locator's verified state.
- **FR-017**: A IIIF manifest whose canvases changed by ID or count since the last run MUST open a separate, lower-severity review issue. The fingerprints MUST be kept in the workflow's cache, not in the repository.
- **FR-018**: For a verified locator with no archived copy, the checker MUST request a web-archive snapshot and open a pull request adding `archived_copy` (URL) and `archived_on` (date) to that locator. The evidence locator MUST gain these two optional fields, with valid and invalid fixtures.

**Scope question from TCX-65**

- **FR-019**: This spec MUST NOT add publication requirements for collection, route, event or period records. Their stubs carry an empty checklist, and FR-003 fills it automatically once a later spec adds rules for them. The gap (an empty record of these families passes at `publishable`) is owned by the first spec that publishes such a record.

### Key Entities

- **Stub**: a new record file written by the scaffold: identity, `proposed`, `held`, and the provenance checklist. Becomes an ordinary record the moment the maintainer edits it.
- **Provenance checklist**: the fields a family's rules require from `ready_for_build`, written into the stub as "not yet" values or commented-out keys; derived from the rules.
- **Dependents graph**: every record as a node and every reference as a typed edge, held included; a build artefact.
- **Dependents** (GLOSSARY.md): every record that relies on a given record directly or through others.
- **Editor schema**: a generated, uncommitted description of one family's record file for the editor, with glossary definitions and ID suggestions.
- **Link finding**: a URL a record depends on that failed after retries, with the records that use it; held as one Jira issue.
- **Manifest fingerprint**: the canvas IDs and count of a IIIF manifest at the last run, kept in the workflow's cache.
- **Archived copy** (GLOSSARY.md): `archived_copy` and `archived_on` on an evidence locator, proposed by the checker and merged by a person.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: No ID in a record created after this spec is typed by hand: every new record of a scaffoldable family is created by the command, and a test runs the command once per family (13 families, plus essay's existing case).
- **SC-002**: For every scaffoldable family, promoting an untouched stub to `ready_for_build` produces exactly the errors its checklist names: no checklist item without a rule, no rule without a checklist item.
- **SC-003**: The number of validation rules, and the lifecycle from which each is an error, is the same after this spec as before it, apart from rules this spec adds. No rule is weakened.
- **SC-004**: For any record, the maintainer can list everything a correction would touch, held included, in one command that answers in under five seconds on the current registry (311 entities).
- **SC-005**: Every record the gate accepts structurally is accepted by its editor schema, and every one of a set of seeded typos (misspelt field, unknown vocabulary value) is rejected by both.
- **SC-006**: A URL that breaks is reported within eight days, as one issue, however many records use it; a second run opens no duplicate.
- **SC-007**: Across a full checker run, the number of record files changed by the run itself is zero; every change to a record arrives as a pull request a person merges.
- **SC-008**: The build and the gate make zero network requests attributable to this spec.

## Assumptions

- One maintainer writes every record; there is no concurrent-editing or permissions model to design.
- VS Code with a YAML language extension is the editor; other editors may read the same schemas but are not tested.
- The web archive is the Internet Archive's Wayback Machine, whose save endpoint is reachable from the workflow.
- The checker's Jira issues go to project TCX; the Jira API token and a GitHub token with pull-request write are stored as Actions secrets, never in the repository.
- Datasets' upstream URLs are the `upstream.url` field added by TCX-65; no dataset carries one yet, so the checker has none to check until one does.
- Out of scope: publication requirements for collection, route, event and period records (FR-019); a rename codemod (IDs never change, and slugs already redirect); extracting the registry engine as a package (after v1); a public dependents page (a later spec, which would need a Principle IV statement, the ADR 0004 budgets and the held-leak rules); a reader-facing link status.
- Dependencies: ADR 0006 (IDs, progressive strictness), ADR 0010 (`registry new essay`), ADR 0011 (map image sources), ADR 0014 (digital copies), ADR 0018, ADR 0019, and the TCX-65 checks (draft relaxation proven per family; `upstream` on datasets).
