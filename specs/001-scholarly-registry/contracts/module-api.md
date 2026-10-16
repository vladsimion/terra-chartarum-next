# Contract: registry module API

The seams (Q18). Tests are written against these signatures first.

```ts
// Seam 1 — filesystem to typed records
loadRegistry(rootDir: string): Promise<{ records: Record[]; loadErrors: LoadError[] }>

// Seam 2 — all rules, pure, no I/O
validateRegistry(records: Record[], options?: { now?: Date; commit?: string; completeness?: boolean; featureIndex?: FeatureIndex; assetIndex?: AssetIndex }): IntegrityReport

// Derived outputs (pure)
projectPublic(records: Record[]): PublicRecord[]
reverseRelationships(records: Record[]): Map<StableId, StableId[]>
redirects(records: Record[]): { rules: Redirect[]; withdrawn: Withdrawn[] }
nextLocalId(family: Family, existing: string[]): string

// Post-build
scanOutput(distDir: string, records: Record[]): Promise<Violation[]>
```

Rules:
- `validateRegistry` never touches disk or network and is deterministic for equal input.
- `LoadError` (unparseable YAML, filename ≠ id, wrong directory) is reported into the same report as a violation.
- Every violation carries a stable rule ID from [rule-ids.md](./rule-ids.md).
- `loadRegistry` validates structure and types only. Enumerated fields (`lifecycle`, `release`, `origin`, `confidence`, `geometry_provenance`, `date_precision`, `evidence_type`, `silence_state`, `locator.state`, `portal_dimensions`) are read as plain strings at this stage. `validateRegistry` reports bad values as `LIFE-VALUE`, `REL-VALUE`, `ID-ORIGIN` or `ENUM-INVALID`, so records built in memory and records loaded from disk go through the same checks. `LOAD-PARSE` is reserved for unparseable files or wrong structure.
- References: `referenceFields(record)` (see data-model.md "Reference fields") is the single source for every field `REF-UNKNOWN` checks.
