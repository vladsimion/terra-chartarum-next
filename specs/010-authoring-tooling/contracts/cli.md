# Contract: registry commands added or changed by spec 010

All commands run as `npm run registry -- <command>` (or `tsx src/registry/cli.ts <command>`), take `--dir <root>` (default `.`), print results on stdout and messages on stderr. Exit codes follow the existing CLI: `0` success, `1` the registry or the result is not valid, `2` usage error.

## `registry new <family> <title>` (US1, FR-001 to FR-006)

```text
registry new <family> <title> [--dir <root>]
registry new essay <title> --room <room> --question <text> --author <name> [--dir <root>]   # unchanged
```

| Case | Exit | stdout | stderr | Files |
|---|---|---|---|---|
| success | 0 | `<stable id>\n<relative path>\n` | — | one new YAML (essay: YAML + MDX) |
| `room` | 2 | — | `registry new: rooms are the seven fixed entities and cannot be created` | none |
| unknown family | 2 | — | `registry new: unknown family <name>; one of …` | none |
| empty title, or no letters or digits for a slug | 2 | — | as `registry new essay` today | none |
| the write adds a gate error | 1 | — | `registry new <family>: the new record is not valid, so nothing was written:` + violations | none (removed again) |

The ID is `tc:tc:<family>:<family>-NNNNNN`, from `mintNext` (highest counter in the working tree, `main` and `origin/main`, plus one). The file is `content/<family>/<local-id>.yaml`.

## `registry mint <family>` (unchanged; the R calling contract, FR-007)

Prints exactly one line, the local-id, and exits 0; exits 2 with a message on stderr for an unknown family. R pipelines call this or `registry new` through `system2()` and read stdout; they never compute an ID. An integration test runs the real CLI as a child process and checks this contract.

## `registry deps <id>` (US2, FR-010)

```text
registry deps <id> [--dir <root>] [--json]
```

Text output:

```text
tc:tc:bibliography_entry:bibliography_entry-000039  (published)
direct (2)
  tc:tc:source:src-honterus-chorographia      entry
  tc:tc:map:honterus                           bibliography[0]   held
indirect (3)
  tc:tc:evidence:evidence-000004               source → tc:tc:source:src-honterus-chorographia
  tc:tc:essay:essay-000001                     evidence[3] → tc:tc:evidence:evidence-000004 → …
```

`--json` prints `{ id, direct: [...], indirect: [...] }` as in [data-model.md](../data-model.md). An unknown ID exits 1 with `registry deps: no record <id>` on stderr. Held records are listed and marked; the command reads the registry and writes nothing.

## `registry check --out <dir>` (changed, FR-009)

Writes, beside `integrity-report.json` and its HTML:

- `dependents.json`, valid against [dependents.schema.json](dependents.schema.json);
- `dependents.html`, the static viewer.

Both are written whether or not the gate passes, as the integrity report is. CI already uploads `reports/` as the `integrity-report` artefact. Neither file is under `dist/` or committed.

## `npm run schemas` (US3, FR-011)

Writes `.schemas/<family>.json` for every family and `.schemas/index.json` (family → file). Runs on `postinstall` (reports and exits 0 on failure, so `npm ci` is not blocked), `predev` and `prebuild` (fail hard). See [editor-schemas.md](editor-schemas.md).
