# Contract: CLI additions

One command is added to `registry` (spec 001's `contracts/cli.md`).

## `registry completeness`

```text
registry completeness --dir <root> --out <dir>
```

Loads the registry, runs the gate, and writes two files into `<dir>`:

- `completeness.json`: for every map record (public or held), `{ id, lifecycle, displayed: n, recorded: n, gaps: [field], statuses: { field: status } }`.
- `enrichment-queue.json` and `enrichment-queue.md`: records ranked by impact × risk × reuse (research R7), each showing the three parts and the product, ties by id.

The files are editor reports and CI artefacts. They are never copied into the site output, and the build leak scan fails if either name appears there.

**Exit codes**: 0 on success (the gate result does not change the exit code; the report lists what is incomplete); 1 when the registry cannot be loaded; 2 on a usage error. The command names a gate failure on stderr but still writes the reports, because an incomplete record is exactly what the queue is for.
