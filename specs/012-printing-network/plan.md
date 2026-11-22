# Implementation Plan: The Printing Network, 1508–1560s

**Branch**: `012-printing-network` | **Date**: 2026-11-22 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification `specs/012-printing-network/spec.md`, clarified 2026-11-22. Decisions: ADR 0021 (place roles), ADR 0023 (person records), ADR 0014 as amended (an edition with place roles is public when published and released).

## Summary

The registry learns where a printed book was made and where its copies are kept:
- Editions carry `place_roles` and `people` links.
- A new `person` family holds the printers.
- `publicEntryIds` makes an edition with place roles public on its own.

The Atlas shows the network as a layer **derived from the records at build time**: one pin per public edition and role, at the place's location. It is shown with the Carpathian corridors (layer-000001) through a new collection. Readers get an edition section on the existing bibliography page and a new person page.

Then the content is added: the four anchor editions plus Coresi's, the three printers and Dealu Monastery, each held, with Evidence on pending locators until read.

## Technical Context

**Language/Version**: TypeScript (strict), Node ≥ 24, Astro (ADR 0005); unchanged.
**Primary Dependencies**: existing only (`zod`, `yaml`, `flatgeobuf`, MapLibre).
**Storage**: YAML records under `content/`. The network layer has **no source file**: it is built from the records (research R4).
**Testing**: Vitest (unit and integration), Playwright and axe (the layer and the pages), Lighthouse CI (ADR 0004 budgets); valid and invalid fixtures (Principle X).
**Target Platform**: the static site on the Worker (ADR 0012).
**Project Type**: an addition to the registry, the Atlas build and the site, in the existing single project.
**Performance Goals**: within the ADR 0004 budgets. The layer has tens of features, far under the asset limit.
**Constraints**:
- No held record or held place reaches public output; the leak scan covers the derived layer.
- No pin without its role (FR-005).
- Nothing is drawn for superseded attributions or paper (FR-004, FR-012).

**Scale/Scope**: six editions, three people, one new place, one layer, one collection in the first slice; tens of holdings.

## Constitution Check

*GATE: passed before Phase 0; re-checked after Phase 1 below.*

- [x] **I. Historical question.** Named in the spec: how closely the three lands were tied by the making and circulation of printed books, 1508–1560s.
- [x] **II, V. No duplicated canonical records or private geometry.** The layer is derived from the records (R4): the place owns its location and the edition owns its roles, so no coordinate or role is stored twice. One person record per person (ADR 0023).
- [x] **III, VI. Uncertainty and provenance as fields.**
  - `basis` (stated or attributed) and `confidence` sit on every place role and person link.
  - `survival` states non-survival.
  - Superseded attributions are recorded with their sources.
  - Every role and link cites Evidence from `ready_for_build`, and pending locators can't support `secure`.
  - The corridors are `generalized_editorial`.
- [x] **IV. Interactions.** The layer is a standard Atlas layer and the pages are static; no bespoke interaction is added. The "Show copies" toggle answers "where are the copies now?" from the `held_at` evidence, interpreted as custody, not production.
- [x] **VII. No dynamic infrastructure.** Everything is built at build time; no runtime service.
- [x] **IX. Accessibility and performance.** Roles are told by symbol and text, never by colour alone. Accessible names state the role. The pages need no script. The budgets are those of ADR 0004, and the e2e and Lighthouse runs cover the new routes.
- [x] **X. Test strategy.** Every acceptance scenario maps to a test ([quickstart.md](quickstart.md)). Rules get named mutations; the spec 010 rule guard still passes.
- [x] **XI. One analytical framework.**
  - US1, US4: historical, methodological.
  - US2: geographical.
  - US3: historical, social and demographic.
  - US5: economic.
  - Linguistic (Church Slavonic, then Romanian) is carried on the editions' Evidence.

  The framework applies unchanged; no rule or vocabulary is restated.

**Result: PASS.** Complexity Tracking is empty.

**Re-check after Phase 1: PASS.** Two design choices were checked against the constitution:
1. **The derived layer (R4)** is a new asset kind. It stays within ADR 0013, because the registry is in the repository and the asset is still built at build time. It is the option that keeps Principle V; a committed GeoJSON would break it.
2. **The amended publicity rule (R5)** changes one function, `publicEntryIds`, the rule's only home. It widens publicity only for published, released editions with place roles, so held material still never leaks.

## Project Structure

### Documentation (this feature)

```text
specs/012-printing-network/
├── spec.md, plan.md, research.md, data-model.md, quickstart.md
├── contracts/
│   ├── rule-ids.md          # the gate rules added
│   ├── network-layer.md     # the derived layer and how it is drawn
│   └── pages.md             # the edition section and the person page
├── checklists/requirements.md
└── tasks.md                 # /speckit-tasks
```

### Source code (repository root)

```text
src/registry/
├── families.ts              # + 'person'
├── schemas/families.ts      # BibliographyEntrySchema: place_roles, people, survival, attribution_history; PersonSchema
├── schemas/shared.ts        # PLACE_ROLE_VALUES, BASIS_VALUES, PERSON_ROLE_VALUES, SURVIVAL_VALUES
├── schemas/references.ts    # place_roles[].place/evidence, people[].person, attribution_history[]
├── rules/place-roles.ts     # NEW: PLACE-ROLE-*, PERSON-LINK, PERSON-NAMES, EDITION-SURVIVAL
├── rules/enums.ts           # the new vocabularies
├── citations.ts             # publicEntryIds: + editions with place roles (ADR 0014 amended)
└── project.ts               # projection of the new fields; person family

src/atlas/build/
├── network-features.ts      # NEW: records → point features (pure)
└── write-outputs.ts         # asset kind derived:place-roles

src/atlas-client/            # role filter, copies toggle, role symbols, legend, accessible names
src/pages/bibliography/[slug].astro   # + "Where it was made and where it is kept"
src/pages/people/[slug].astro, index.astro   # NEW

GLOSSARY.md                  # Vocabulary values: place_role, basis, person_role, survival
specs/001-scholarly-registry/ # family table, data model, rule-ids (spec amendment, ADR 0023)

content/                     # editions, people, Dealu, the network layer and collection (held)
tests/registry/unit/         # place-roles, person, edition-survival, citations
tests/atlas/unit/            # network-features
tests/atlas/e2e/             # network.spec.ts
```

**Structure decision**: everything stays in the single project. The derived-layer builder is a pure module (`network-features.ts`), so it is tested without a build.

## Delivery

One pull request per user story, in priority order, each red → green with the `tdd` skill:
1. **US1:** the record model, rules, publicity amendment and the 1508 edition.
2. **US2:** the derived layer, collection and map behaviour.
3. **US3:** the person family and pages.
4. **US4:** survival and pending.
5. **US5:** paper through Evidence.

Each PR updates GLOSSARY.md, spec 001's tables, the status blocks and the dossier and Build Log for spec 012.

## Complexity Tracking

None.
