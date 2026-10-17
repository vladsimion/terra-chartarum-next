# Data Model: Migration & Cutover

Builds on the map row of spec 004's data model (amended by ADR 0016, implemented by spec 004's Foundation) and on the import-only `legacy_*` fields of spec 001 (FR-014), which this spec extends. Fields are those of the clarified FR-013 and FR-021; `FAM-UNKNOWN` rejects anything not listed.

## Map record, additions (the first three are spec 004's, the last row is this spec's)

| Field | Rule |
|---|---|
| `record_scope` | `object` (default), `work` or `concept` |
| `witness_kind` | `held`, `institutional` or `unlocated`; required from `ready_for_build` when `record_scope` is `object`; absent otherwise (`MAP-SCOPE`) |
| `open_questions[]` | `{ field*, question*, would_resolve* }`; `field` is one of the displayed fields |
| `legacy_record_scope`, `legacy_custody`, `legacy_publication_status` | imports only (`origin: legacy`); the original legacy values; `MIG-LEGACY` |

Layers gain `documentation[]` (`{ label*, url* }`, `https` URLs) in spec 005's data model, because the inspector shows methodology documentation and the legacy layers carry `documentationLinks`.

## Existing import-only fields, unchanged

`legacy_family`, `legacy_confidence`, `legacy_review_state`, `legacy_layer_status`, `legacy_reviewer`, `legacy_review_date`, `legacy_normalization_method`, `editor_confirmed`, `confirmed_by`, `confirmed_on` (spec 001).

## Import manifest (`migration/import-manifest.json`)

`{ profile, snapshot: { repository, sha, date }, importer_version, counts: { <family>: n }, created_by }`. Committed with the records; changes only when an import is applied.

## Import report (`import-report.json`, staging only)

`{ created: [id], skipped: [id], changed_upstream: [{ id, fields }], matched: [{ citation, entry, rule }], dropped: [{ field, count }], lossy: [{ id, field, from, to }], report_only: [{ registry, key, count }], unmapped_terms: [{ vocabulary, term, id }] }`, sorted, deterministic.

## Redirect inventory and rule file

See [contracts/redirect-inventory.md](./contracts/redirect-inventory.md).

## Essay links (`migration/essay-links.json`)

See [contracts/field-mappings.md](./contracts/field-mappings.md).
