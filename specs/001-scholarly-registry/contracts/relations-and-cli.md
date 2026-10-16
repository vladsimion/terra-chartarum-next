# Contract: Relations index and registry CLI

## Relations index (consumed by specs 003–007)
Built at `dist/data/relations.json` (public, released-only) and `reports/relations.full.json` (editor, includes held).

```json
{
  "tc:tc:map:ortelius-dacia-1595": {
    "cited_in": ["tc:tc:essay:terra-sigillata"],
    "used_by": ["tc:tc:layer:roman-dacia-roads"]
  }
}
```

- Keys and values are qualified IDs.
- `cited_in` lists essays; `used_by` lists every other family. A source referencing a target through several fields is listed once; values are sorted.
- `superseded_by` is lineage, not use: it creates no relation.
- In the public file, only released entities appear, as keys or as values: a held entity is never a key, even when released content references it. A released target referenced only by held content appears with empty arrays.
- Release is judged after specialist vocabulary mapping (data/vocab-mappings).

## CLI

```
npm run registry:check [-- --data <dir>] [--assets <dir>] [--report <dir>]
```

| Exit code | Meaning |
|---|---|
| 0 | gate passed |
| 1 | one or more violations (report written) |
| 2 | could not run (unreadable input, bad arguments) |

- `--data` defaults to `data/registry`. R pipelines call the CLI on their output directory before committing.
- Always writes `integrity-report.json` (see `integrity-report.schema.json`) and `integrity-report.md` to `--report` (default `reports/`).
- Deterministic: the same input produces byte-identical reports, apart from `run_id` and `generated_at`.

## Redirects
`dist/_redirects` gains one line per previous slug → current slug, generated from `previous_slugs` (status 301).
- Only publicly addressable records get redirects: released (`published`) and `superseded` (tombstone). A held record's previous and current paths never appear (decided 2026-10-16; glossary "Held / released"). Addressability is judged after specialist vocabulary mapping.
- A previous slug that collides with any current page path, held or not, produces no rule.
