# Contract: registry module API

The seams (Q18). Tests are written against these signatures first.

```ts
// Seam 1 — filesystem to typed records
loadRegistry(rootDir: string): Promise<{ records: Record[]; loadErrors: LoadError[] }>

// Seam 2 — all rules, pure, no I/O
validateRegistry(records: Record[], options?: { now?: Date; commit?: string }): IntegrityReport

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
