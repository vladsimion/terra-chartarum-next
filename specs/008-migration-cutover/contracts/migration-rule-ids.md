# Contract: migration rule IDs

New rules added to `specs/001-scholarly-registry/contracts/rule-ids.md` when they are implemented. Each has a named mutation.

| Rule ID | Checks | Spec | Severity |
|---|---|---|---|
| `MIG-SLUG` | a record with `origin: legacy` has its legacy local-id as its current slug or in its `slug_history`, so the old path keeps resolving | FR-001 | error at any lifecycle |
| `MIG-LEGACY` | `legacy_record_scope`, `legacy_custody` and `legacy_publication_status` appear only on `origin: legacy` records, take only the legacy value sets, and agree with `record_scope` and `witness_kind` (a legacy `work` is `record_scope: work`; legacy `custody` equals `witness_kind` for an object) | FR-013 | error at any lifecycle |
| `MIG-IMAGE-CLEARED` | an image of an `origin: legacy` map record has `reproduction_cleared: true` only when the record has `editor_confirmed` with a named person and date | FR-015 | error at any lifecycle |

Existing rules that still apply: the `IMPORT-*` rules (imported records stay held until confirmed), `ID-*` (legacy IDs verbatim), `SLUG-UNIQUE` (per family), `FAM-UNKNOWN`, `RIGHTS-CLEARED`, `MAP-SCOPE` (spec 004), and the held-leak scan.
