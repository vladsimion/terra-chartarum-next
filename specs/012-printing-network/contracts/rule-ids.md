# Contract: gate rules added by spec 012

These rules are added to `specs/001-scholarly-registry/contracts/rule-ids.md` in the same PR. Each has a named mutation (spec 001 SC-003), and the status blocks are regenerated. The spec 010 guard (`rules-not-weakened`) must still pass: rules are added, none removed or relaxed.

| Rule | What it checks | Requirement | Error from |
|---|---|---|---|
| `PLACE-ROLE-PRODUCED` | at most one `produced_at` on a record | FR-001, ADR 0021 §3 | always |
| `PLACE-ROLE-HOLDING` | a `held_at` names its `holder` and a `valid_from` (EDTF, may be uncertain) | FR-002, FR-003 | always |
| `PLACE-ROLE-FAMILY` | `place_roles` only on `bibliography_entry`; refused on maps until their migration | FR-002, ADR 0021 §6 | always |
| `PLACE-ROLE-EVIDENCE` | every place role and person link cites one or more Evidence records | FR-011, Principle VI | `ready_for_build` |
| `PLACE-ROLE-SECURE` | a place role or person link rated `secure` cites at least one Evidence record whose locator is `verified` | FR-011, SC-005, Principle VI | always |
| `PERSON-LINK` | a person link has `person`, `role`, `basis` and `confidence`; the role is from `PERSON_ROLE_VALUES` | FR-009 | always |
| `PERSON-NAMES` | a person record has one or more names, each with language and kind | FR-015 | `ready_for_build` |
| `EDITION-SURVIVAL` | `survival: none_known` with a current `held_at` is an error; `surviving` with no `held_at` is a warning | FR-010 | always (error) / `ready_for_build` (warning) |

The enumerated values (`role`, `basis`, `person_role`, `survival`) are added to `ENUM_FIELDS` in `src/registry/rules/enums.ts`, so `ENUM-INVALID` reports them. The references (`place_roles[].place`, `place_roles[].evidence[]`, `people[].person`, `attribution_history[].place` and `.source`) are added to `src/registry/schemas/references.ts`, so `REF-UNKNOWN` and `REF-FAMILY` cover them.
