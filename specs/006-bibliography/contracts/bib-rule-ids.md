# Contract: bibliography rule IDs

New rules added to `specs/001-scholarly-registry/contracts/rule-ids.md` when they are implemented. Severity follows the registry's lifecycle ranking: "warn from" is the lowest lifecycle at which the finding is a warning, "error from" the lowest at which it is an error. Each has a named mutation.

| Rule ID | Checks | Spec | Warn from | Error from |
|---|---|---|---|---|
| `SRC-ENTRY` | a Source has `entry`, it resolves to a bibliography entry, and a public Source's entry is published and released | FR-006 | `ready_for_build` | `publishable` |
| `BIB-EDITION` | `edition_of` and `translation_of` resolve to bibliography entries, are not the entry itself, and form no cycle through either field | FR-010 | | any |
| `BIB-CSL` | the file named by `csl` exists, parses as exactly one CSL-JSON item with a `type` and a `title`, and its `id` equals the entry's stable ID | FR-014 | | any |
| `BIB-LISTED-HELD` | a public record's `bibliography[]` names only entries that are published and released | FR-013 | `ready_for_build` | `publishable` |

Existing rules that now also apply: `FAM-REQUIRED` and `FAM-UNKNOWN` (the new fields are checked by the rules above so that early research records still load), `REF-UNKNOWN` and `REF-FAMILY` for `Source.entry`, `bibliography[]`, `edition_of` and `translation_of`, `REF-FINDING-AID` (a finding aid is never cited as evidence), and the held-leak scan.

Related checks that are not gate rules: whether an entry is cited by a public record is derived at build time and decides only whether the entry is shown, not whether the registry is valid.
