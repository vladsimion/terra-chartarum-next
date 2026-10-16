# Contract: registry module API

The seams (Q18). Tests are written against these signatures first. Source: `src/registry/`.

```ts
// Seam 1 — filesystem to typed records (load.ts)
loadRegistry(rootDir: string): Promise<{
  records: RegistryRecord[]
  loadErrors: LoadError[]                              // unparseable or mis-shaped files
  provenanceIndex: Map<string, ProvenanceStep>         // provenance/*.yaml by step id
  featureIndex: Map<string, Set<string>>               // feature ids per geometry file records point to
  assetIndex: Set<string>                              // asset paths, named by layers, that exist
}>

// Seam 2 — all rules, pure, no I/O (validate.ts)
validateRegistry(records: readonly RegistryRecord[], options?: {
  now?: Date; commit?: string
  completeness?: boolean                               // also run registry-level rules (ROOM-SET)
  provenanceIndex?: ReadonlyMap<string, ProvenanceStep>
  featureIndex?: ReadonlyMap<string, ReadonlySet<string>>
  assetIndex?: ReadonlySet<string>
}): IntegrityReport

// Load + validate + fold load errors into one report (check.ts); turns completeness on by default
checkRegistry(rootDir: string, options?: ValidateOptions): Promise<IntegrityReport>

// Derived outputs (pure)
projectPublic(records): PublicRecord[]                 // project.ts
reverseRelationships(records): Map<string, string[]>   // reverse.ts
redirects(records): { rules: Redirect[]; tombstones: Tombstone[] }   // redirects.ts; a tombstone is { path, id, successor: string | null }
renderRedirects(rules): string                         // redirects.ts, the Cloudflare _redirects text
isPublic(record) / isReleased(record) / isRetired(record)           // publication.ts, the one definition of "public"
parseDate(value): ParsedDate | null                    // dates.ts, EDTF level 0-1 (ADR 0007): precision, uncertain, approximate, earliest, latest
isEdtf(value): boolean; datePrecision(value): DatePrecision         // dates.ts; precision is derived, never authored
referenceFields(record): { field: string; id: string }[]            // schemas/references.ts
lifecycleFor(stage, designQaPassed?): Lifecycle        // stages.ts
nextLocalId(family, existing: string[]): string        // mint.ts, pure
mintNext(family, rootDir): Promise<string>             // mint.ts, reads the working tree and main

// Post-build (leak-scan.ts)
scanOutput(distDir: string, records): Promise<Violation[]>

// Test and timing support (synthetic.ts)
generateRegistry(count, seed): RegistryRecord[]
writeSyntheticRegistry(outDir, count, seed): Promise<void>
```

Rules:
- `validateRegistry` never touches disk or network and is deterministic for equal input and options.
- A record carries `file`, its path relative to the registry root. It is how violations name files and how `LOAD-PATH` checks that the filename is the local-id and the directory the family.
- A `LoadError` (unparseable YAML, mis-shaped structure, invalid GeoJSON, duplicate step id) is reported into the same report as `LOAD-PARSE` by `checkRegistry`.
- Every violation carries a stable rule ID from [rule-ids.md](./rule-ids.md). Rules that judge more than the records (`REF-FEATURE`, `LIFE-AVAILABILITY`, the `AUTO-*` rules, provenance chain references) need their index option and say nothing without it.
- `loadRegistry` validates structure and types only, per family (`schemas/`). Enumerated fields (`lifecycle`, `release`, `origin`, `confidence`, `geometry_provenance`, `evidence_type`, `silence_state`, `locator.state`, `portal_dimensions`) are read as plain strings at this stage. `validateRegistry` reports bad values as `LIFE-VALUE`, `REL-VALUE`, `ID-ORIGIN` or `ENUM-INVALID`, so records built in memory and records loaded from disk go through the same checks. Whether a family's fields are present is `FAM-REQUIRED`, by lifecycle.
- Paths named by records (`geometry`, `asset`) are resolved on their real path inside the registry root: neither `../` nor a symlink (to a file or a directory) can lead out. A path that leaves the root is never read and is reported as a load error (`LOAD-PARSE`) on the record that names it; a path that simply does not exist is missing, which the rules that need it report.
- `projectPublic`, `reverseRelationships` and `redirects` all decide who is public through `publication.ts`; the reverse map has entries for public targets only.
- References: `referenceFields(record)` (see data-model.md "Reference fields") is the single source for every entity reference `REF-UNKNOWN` checks; `provenance_chain` entries are checked against `provenanceIndex`.
