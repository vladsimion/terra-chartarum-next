<!--
Sync Impact Report
- Version: 0.2.0 (DRAFT — all pending items resolved by ADRs 0001–0005; ready for ratification)
- Source: distilled from Terra Chartarum Confluence Volumes I, IV, V, VI, VII, VIII and Decision Log TC-D001–D018
- Open items: see "Pending ratification" at the end; resolve via /grill-with-docs, then re-run /speckit-constitution
-->

# Terra Chartarum Constitution

> A fresh, spec-driven successor build of Terra Chartarum that replaces the live site at v1 cutover (ADR 0001).

A digital historical atlas and scholarly cartographic publication: an interactive historical-atlas portal and curated intellectual world in which maps are treated as historical **arguments, objects, witnesses and interfaces** rather than illustrations alone. It combines visual essays, historical GIS, digitised maps, scholarly bibliography and a coherent editorial and design system.

## Core Principles

### I. History First
Every feature, interaction and dataset MUST answer a stated historical or historiographical question. A spec that cannot name the question it serves is incomplete and MUST NOT proceed to `/speckit-plan`.

### II. Cartography as Evidence
Maps are primary sources with authorship, production context, projection, omissions and agendas. Every map object has exactly one canonical record; essays, Atlas panels, search and citation export reference that record by ID and MUST NOT copy its description.

### III. Uncertainty Is Data
Temporal precision, geometry provenance, contested status, confidence and reconstruction state MUST be represented as structured fields, never in prose alone. Date precision and geometry precision are separate claims. Historical absence is a typed state (non-survival, non-survey, non-request, alternative naming, outside frame, source-not-applicable, meaningful silence), not a boolean. Modern reference geometry MUST never be styled or described as historical evidence.

### IV. Evidence Precedes Interaction
A bespoke interaction requires, before implementation: the historical question, the evidence it exposes and the expected interpretation. Prefer a shared component where it expresses the argument adequately. A technically working interaction without evidentiary purpose is not Done.

### V. One Canonical Home per Fact (NON-NEGOTIABLE)
Every scholarly entity (essay, map, cartographer, place, source, dataset, layer, collection, route, event, period, bibliography entry) has one immutable global ID and one canonical record. Titles and URL slugs may change; IDs may not. Essays are views over shared evidence and data; they MUST NOT own private geometry, place authorities or object descriptions. The registries form one linked scholarly graph: duplicate IDs, unknown references, invalid enumerations or missing required provenance on publishable records MUST fail the build.

### VI. Verified Provenance Only
Every dataset, feature, image and claim carries source, locator, licence/rights, temporal scope, confidence and last-verified date where applicable. A locator may be marked `verified` only when the cited pages were read by this project; locators taken from another scholar's citation remain `pending`. Out-of-copyright text and cleared reproduction rights are separate fields. OCR/HTR/LLM output is never itself evidence: raw evidence is retained, transformations are logged, and normalisation is human-adjudicated before publication.

### VII. Static First, Progressive Complexity
Publication is static/CDN-first (cloud-native formats such as GeoJSON, FlatGeobuf, PMTiles, COG; IIIF for imagery). Dynamic infrastructure (database, tile server, runtime API) requires a documented research, query or scale need that static delivery cannot reasonably meet, recorded as an ADR with an owner and maintenance plan.

### VIII. One Publication, Bespoke Interiors
A shared shell, metadata model, navigation and design-token system give coherence; individual essays keep their own narrative and visual character. Shared components MUST NOT flatten essay-specific design, and bespoke essays MUST NOT fork shared contracts.

### IX. Accessible and Performant by Contract
Keyboard operability, visible focus, reduced-motion behaviour, no colour-only encoding of uncertainty/state/selection, graceful degradation (including no-WebGL) and the numeric performance budget are publication requirements, not preferences. Budgets live once, in this repository's performance contract, and are enforced in CI.

### X. Test-First Delivery (NON-NEGOTIABLE)
Implementation follows red-green-refactor via the `tdd` skill, one vertical slice at a time. Every acceptance scenario in a spec maps to at least one automated test written before the code that satisfies it. Data contracts are tested with valid and invalid fixtures. This applies equally to R data-prep code (`testthat`). No task is closed with a failing or skipped test.

## Editorial Governance

Each essay progresses through: **Concept → Corpus → Research → Outline → Draft → Build → Design QA → Publish → Cross-link**. Each stage has an entry condition and an exit check (defined in spec 003). Research-gated essays MAY have outcome-dependent publication paths; a compelling visual cannot freeze an unsupported claim.

Every substantive chapter ends with a bibliography in seven sections: Primary sources · Historical maps / cartographic witnesses · Reference works · Specialised studies · Digital resources and repositories · Datasets and licences · Further reading / research backlog. Local bibliographies are authoritative; any site-wide bibliography is an aggregate index, not a second source of truth.

Private acquisition, price and negotiation details MUST NOT appear in public output by default.

## Audience

1. Curious general readers.
2. Map collectors and historians of cartography.
3. Students and researchers in history, geography and digital humanities.
4. Developers and researchers interested in historical GIS and digital editions.

Every spec MUST state which of these audiences each user story serves.

## Development Workflow

1. **Grill** — `/grill-with-docs` stress-tests a feature idea against `GLOSSARY.md` and records decisions as ADRs in `docs/adr/`.
2. **Specify** — `/speckit-specify` writes `specs/NNN-name/spec.md` (what and why, no technology).
3. **Clarify** — `/speckit-clarify` until no `[NEEDS CLARIFICATION]` markers remain.
4. **Plan** — `/speckit-plan` produces `plan.md`, `data-model.md`, `contracts/`, `quickstart.md`; the plan MUST pass the Constitution Check below.
5. **Tasks** — `/speckit-tasks`, then `/speckit-analyze` for cross-artifact consistency.
6. **Track** — each spec is one Jira epic; each user story is one Jira story under it.
7. **Implement** — `/speckit-implement` with the `tdd` skill, one user story (vertical slice) at a time.

### Constitution Check (gate for every plan.md)
- [ ] Names the historical question(s) served (I)
- [ ] No duplicated canonical records or private geometry (II, V)
- [ ] Uncertainty and provenance modelled as fields (III, VI)
- [ ] Each bespoke interaction states question / evidence / interpretation (IV)
- [ ] No dynamic infrastructure without an ADR (VII)
- [ ] Accessibility and performance-budget impact stated (IX)
- [ ] Test strategy maps every acceptance scenario to a test (X)

## Governance

This constitution supersedes other practice in this repository. Amendments require an ADR, a version bump (MAJOR: principle removed or redefined; MINOR: principle or section added; PATCH: wording) and a `/speckit-analyze` pass across open specs. Jira tracks delivery; it never overrides a spec or this constitution.

## Pending ratification

- ~~**P-1** Site identity~~ — **Resolved by ADR 0001**: successor to Terra Chartarum (same name); canonical data migrates with IDs preserved; essays rebuilt natively; cutover at v1 with a frozen archive and redirects.
- ~~**P-2** Performance budgets and browser matrix~~ — **Resolved by ADR 0004**.
- ~~**P-3** Lifecycle~~ — **Resolved by ADR 0003**: one shared lifecycle; essay lifecycle derived from editorial stage; layer availability derived.
- ~~**P-4** Portal dimensions~~ — **Resolved by ADR 0003**: optional essay metadata; no v1 UI.
- ~~**P-5** Rooms~~ — **Resolved by ADR 0003**: Earth, Map, City, Border, Road, Archive, Theatre; all seven public at v1.

**Version**: 0.2.0 (draft, ready to ratify) | **Ratified**: pending | **Last Amended**: 2026-10-15
