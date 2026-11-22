# Data Model: The Printing Network (spec 012)

Decisions: ADR 0021 (place roles), ADR 0023 (person records), ADR 0014 as amended (publicity of editions). Research: R1–R9.

## Bibliography entry: fields added

| Field | Type | Rule |
|---|---|---|
| `place_roles[]` | list of Place role (below) | optional; `PLACE-ROLE-*` rules |
| `people[]` | list of Person link (below) | optional; `PERSON-LINK` |
| `survival` | `surviving \| none_known \| unknown` | optional; `EDITION-SURVIVAL` |
| `attribution_history[]` | `{ place, source, note }` | optional; never drawn; `place` → Place, `source` → Source |

### Place role

| Field | Type | Required | Rule |
|---|---|---|---|
| `place` | Place ID | yes | `REF-UNKNOWN`, `REF-FAMILY` (must be a place) |
| `role` | `produced_at \| held_at` | yes | `ENUM-INVALID` |
| `basis` | `stated \| attributed` | yes | `ENUM-INVALID` |
| `confidence` | shared Confidence | yes | `ENUM-INVALID` |
| `valid_from` | EDTF | `held_at`: yes | `PLACE-ROLE-HOLDING` |
| `valid_to` | EDTF | no | open interval = currently held; closed = "formerly at" |
| `holder` | text (institution) | `held_at`: yes | `PLACE-ROLE-HOLDING` |
| `shelfmark` | text | no | — |
| `evidence[]` | Evidence IDs | from `ready_for_build`: one or more | `PLACE-ROLE-EVIDENCE` |

Record-level rules:
- `PLACE-ROLE-PRODUCED`: at most one `produced_at`.
- `PLACE-ROLE-FAMILY`: `place_roles` only on `bibliography_entry`. A map is refused until its migration (ADR 0021 decision 6).

### Person link

| Field | Type | Required |
|---|---|---|
| `person` | Person ID | yes |
| `role` | `printer` (`PERSON_ROLE_VALUES`) | yes |
| `basis` | `stated \| attributed` | yes |
| `confidence` | shared Confidence | yes |
| `evidence[]` | Evidence IDs | from `ready_for_build` |

## Person (new family, ADR 0023)

| Field | Type | Rule |
|---|---|---|
| entity base | id, title, slug, lifecycle, release, same_as … | as every family (ADR 0006) |
| `names[]` | `{ name, language, kind }` | one or more from `ready_for_build` (`PERSON-NAMES`) |
| `life_dates` | EDTF interval, may be unknown | `DATE-INVALID` |
| `bibliography[]` | Bibliography entry IDs | listing route (ADR 0014) |

Public when published and released (ADR 0013, no exception). Its page lists the editions that name it as a public record, by `people[].person`. That list is derived, never stored.

## Vocabularies added (ADR 0003 shared vocabularies; GLOSSARY.md Vocabulary values)

| Vocabulary | Values |
|---|---|
| `place_role` | `produced_at`, `held_at` |
| `basis` | `stated`, `attributed` |
| `person_role` | `printer` |
| `survival` | `surviving`, `none_known`, `unknown` |

Each gets a table in GLOSSARY.md's Vocabulary values section, so the editor schemas show its definitions (spec 010 US3).

## Derived, never stored

- **Network layer features** (R4): one point per public edition × place role, at the place's location. Properties: `edition`, `role`, `basis`, `confidence`, `holder`, `valid_from`, `valid_to`, `formerly`.
- **Public editions** (R5): `publicEntryIds` adds an entry with one or more `place_roles` that is published and released.
- **A person's editions**: from `people[]`.
- **A printer's movement**: the person's editions in date order, each with its production place. No path.

## The registry records this spec adds (content)

| Record | Family | Notes |
|---|---|---|
| Liturghier, 1508 (Macarie) | bibliography_entry | `produced_at` Dealu (attributed, high); `held_at` per located copy; `survival: surviving`; `attribution_history`: Venice, Bistrița, Snagov, Govora, Cetinje |
| Molitvenic, 1545; Apostol, 1547 (Ljubavić) | bibliography_entry | `produced_at` Târgoviște (stated if the colophon names it; locator pending until read) |
| Catechism, Sibiu, 1544 | bibliography_entry | `produced_at` Sibiu; `survival: none_known` |
| Coresi's first Târgoviște and Brașov editions | bibliography_entry | one `produced_at` each, with dates |
| Macarie, Ljubavić, Coresi | person | names and life dates (pending where unknown) |
| Dealu Monastery | place | new; distinct from Târgoviște (spec edge case) |
| Network layer | layer | `asset: derived:place-roles` |
| The printing network, 1508–1560s | collection | `default_layers`: network layer, corridors (layer-000001) |

All are minted with `registry new`, start held, and carry Evidence with pending locators until read.
