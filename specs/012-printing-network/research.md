# Research: The Printing Network, 1508–1560s (spec 012)

Phase 0. Each decision names the code it rests on. Nothing here changes a decision of ADR 0021, 0022 or 0023; it chooses how to carry them out.

## R1. Where place roles live

- **Decision**: a `place_roles` list on `BibliographyEntrySchema` (`src/registry/schemas/families.ts`). Each item has:
  - `place` (a Place ID) and `role` (`produced_at | held_at`);
  - `basis` (`stated | attributed`) and `confidence` (the shared scale);
  - `valid_from` and `valid_to` (EDTF, `src/registry/dates.ts`);
  - `holder` and `shelfmark` (`held_at` only);
  - `evidence` (Evidence IDs).

  The `place` and `evidence` values are added to `src/registry/schemas/references.ts` (`LISTS` and `POINTS_AT`), so `REF-UNKNOWN`, `REF-FAMILY`, the dependents graph (spec 010) and the editor schemas pick them up with no further code.
- **Rationale**: ADR 0021 decisions 2 and 5; one reference definition (spec 010 FR-008).
- **Alternatives**: a separate link family, rejected because ADR 0021 stores the links on the record.

## R2. The `person` family

- **Decision**: add `person` to `FAMILIES` (`src/registry/families.ts`) and a `PersonSchema`:
  - `names[]`, each with `name`, `language` and `kind`, as `PlaceName` does;
  - `life_dates` (EDTF, free label);
  - `bibliography[]`.

  Person is added to the families that `registry new` scaffolds (spec 010). Its `requires` are declared on the rules, so the checklist follows (ADR 0018). The family list is closed (ADR 0006 item 10), so this is the spec amendment ADR 0023 calls for. Spec 001's data model and family table are updated in the same PR.
- **Rationale**: ADR 0023.

## R3. How an edition names its printer

- **Decision**: a `people` list on `BibliographyEntrySchema`, each item `{ person, role, basis, confidence, evidence[] }` with `role` from a new vocabulary `PERSON_ROLE_VALUES = ['printer']`. `person` points at `person` (`POINTS_AT`). Adding a role later is a vocabulary change, plus a row in GLOSSARY.md's Vocabulary values (spec 010's two-way check).
- **Alternatives**:
  - `makers[]`, as on maps: rejected, because it has no role or basis.
  - Printers in the CSL `author` field: rejected, because a CSL name is text, not a record.

## R4. The network layer is derived, not drawn

- **Decision**: the network layer is a `layer` record whose asset is **built from the registry**, not from a GeoJSON file. Its `asset` is `derived:place-roles`, a new source kind. At build time, `src/atlas/build/write-outputs.ts` turns each **public** edition's `place_roles` into point features:
  - a feature's geometry is its place's location;
  - its properties are `edition`, `role`, `basis`, `confidence`, `holder`, `valid_from`, `valid_to`, and a derived `formerly` (true when `valid_to` is set);
  - the result is converted to FlatGeobuf like any GeoJSON layer.

  No point is stored twice: the place owns the coordinates, the edition owns the role.
- **Rationale**:
  - Principle V (one canonical home per fact). A hand-drawn GeoJSON would copy each place's location and each edition's roles, and the two would drift.
  - ADR 0013's "assets built from sources kept in the repository" still holds, because the registry is in the repository.
- **Consequence**: the layer gate rules (`LAYER-TIME`, `LAYER-FACET`) accept the derived kind. `LAYER-ASSET-SIZE` measures the built asset. An edition with no public place yields no feature and is reported by the build (the place is held, so it cannot be drawn).
- **Alternatives**: a GeoJSON source written by a script and committed. Rejected: two homes, so drift.

## R5. Which editions are public (ADR 0014 as amended)

- **Decision**: `publicEntryIds` in `src/registry/citations.ts` is the one home of the rule. It gains a third route: a published and released entry with at least one `place_roles` item is public in its own right. `reverse.ts`, the bibliography pages and the leak scan all read `publicEntryIds`, so they follow without changes of their own.
- **Test**: an edition with place roles and no citing record is public; the same entry without place roles is not; a held one is never public.

## R6. Pages

- **Edition**: the existing `src/pages/bibliography/[slug].astro` gains a section, **Where it was made and where it is kept**:
  - production place, basis and confidence, in words;
  - holdings, current then former, with holder and shelfmark;
  - the historiography note;
  - non-survival, where it applies;
  - a link to the layer centred on the edition.

  Reached as now, from the Bibliography lens.
- **Person**: a new route `src/pages/people/[slug].astro` (names, life dates, editions in date order with their production places). It is listed from a person index at `/people/`. Whether that index joins the header lenses is a shell question (spec 002), left for later; the page is reachable from editions.
- **Rationale**: FR-014, ADR 0023 decision 2 (the Cartographers lens unchanged).

## R7. Non-survival and the historiography note

- **Decision**: two new optional fields on `BibliographyEntrySchema`:
  - `survival`: `surviving | none_known | unknown`. This is the stated value FR-010 needs: an empty list of holdings is never read as "lost".
  - `attribution_history[]`: each item `{ place, source, note }`, holding superseded attributions (FR-004). These items are not place roles and are never drawn.
- **Rules**:
  - `none_known` with any current `held_at` is an error;
  - `surviving` with no `held_at` is a warning from `ready_for_build`.

## R8. Paper and other material claims

- **Decision**: no new field. The paper's origin is an Evidence record whose target is the edition, with `analytical_dimensions` including `economic`. A link to the corridor (layer-000001) is a `relations[]` entry on the Evidence. Nothing is drawn for paper in this spec (FR-012).

## R9. The corridors

- **Decision**: the network is shown as a **collection**, "The printing network, 1508–1560s", whose `default_layers` are the derived network layer and the corridors layer (layer-000001, TCX-86). Collections already set what opens together (spec 005), so no new mechanism is needed.

## R10. Tests touching the map

- **Decision**: the pin rules (FR-005 to FR-007) are tested at two levels:
  1. unit tests on the derived features (role, basis and `formerly` present on every feature);
  2. a Playwright and axe test on a fixture registry:
     - the default view shows production places only;
     - the copies toggle adds holdings;
     - every pin's accessible name states its role;
     - the legend lists only the roles drawn.

  This follows spec 005's e2e pattern (`playwright.atlas.config.ts`).
