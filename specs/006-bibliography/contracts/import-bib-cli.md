# Contract: `registry import-bib`

One command is added to `registry` (spec 001's `contracts/cli.md`).

```text
registry import-bib <file> --dir <root> [--format bibtex|ris|csl-json] [--dry-run] [--out <dir>]
```

`<file>` is a reference-manager export. The format is taken from the extension (`.bib`, `.ris`, `.json`) unless `--format` is given.

## Behaviour

1. Parse the file into CSL-JSON items (`@citation-js/core` with the BibTeX and RIS plugins). A file that does not parse is rejected whole with the line of the first error; nothing is written.
2. For each item: skip and report it if it has no `type` or no `title`; otherwise match it against the existing entries (DOI, then ISBN, then normalised first author + year + title; research R1).
3. A match is reported with the existing entry's ID and the rule that matched. Nothing is written for it and no existing file is touched.
4. A new item gets an ID from the registry's minting (opaque counter), a slug (research R2), `release: held`, `lifecycle: researching`, no `section`, and a CSL file `<id>.csl.json` whose `id` is the entry's stable ID. Nothing else is added to the CSL file.
5. `--dry-run` reports what would be written and writes nothing. `--out` writes a report (`import-report.json`) listing created entries, matches and skipped items with reasons.
6. The command runs the integrity gate over the result and prints a summary; its exit code reports the import, not the gate.

## Exit codes

0 when the file parsed (even if every item matched or was skipped); 1 when the file could not be parsed or the registry could not be loaded; 2 on a usage error.

## Guarantees

- Idempotent: running the same file twice creates no second entry.
- Never overwrites or edits an existing file.
- The reference manager is an input only; site-specific fields are never written into the CSL file.
