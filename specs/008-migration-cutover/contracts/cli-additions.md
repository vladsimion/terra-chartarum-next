# Contract: commands

Three commands are added to `registry` (spec 001's `contracts/cli.md`) and three scripts to the repository.

## `registry import-legacy`

```text
registry import-legacy --snapshot <path> --profile v1 --out <dir> [--apply --dir <root>] [--dry-run]
```

Reads the pinned snapshot at `<path>` (a checkout of the legacy repository), runs the profile's adapters, and writes records, layer sources, the manifest, `essay-links.json` and `import-report.json` into `<dir>` (staging). With `--apply` it copies into `<root>/content/` and `<root>/data/layers/` only files that do not exist there, never overwriting. The report lists: created, skipped (already present), changed upstream (present with different content), matched (inline citations), dropped (private fields, legacy map rooms; by name and count), lossy conversions, report-only keys, unmapped vocabulary terms. Exit 0 when the import completed; 1 on a failed extraction, an unmapped term, a slug collision or an unreadable snapshot; 2 on usage. The manifest records the snapshot commit SHA. Runs the integrity gate over staging and prints the summary without changing the exit code.

## `registry inventory`

```text
registry inventory --snapshot <path> --dir <root> [--out migration/redirect-inventory.json]
```

Builds the redirect inventory (research R3, [redirect-inventory.md](./redirect-inventory.md)). Exit 0; 1 on an unreadable snapshot.

## `registry archive-redirects`

```text
registry archive-redirects --dir <root> [--out archive/_redirects]
```

Generates the rule file from `migration/redirect-inventory.json` and the registry. Exit 0; 1 when an inventory entry cannot be resolved against the registry.

## `npm run cutover:check` (`scripts/cutover-check.ts`)

Runs, over the production build: the integrity gate, `shell:check --cutover`, the site-wide link check, the zero-404 check of the inventory against `archive/_redirects`, and the Lighthouse budgets. Prints each result and exits 1 if any failed, naming the page, URL or rule. Does not touch the network.

## `npm run archive:check -- <url> [<url>…]` (`scripts/archive-check.ts`)

Fetches each archive URL and checks the "archived edition" banner, the `X-Robots-Tag: noindex` header and the link to terra-chartarum.org. By hand at cutover; network.

## `npm run baseline -- <url> [<url>…]` (`scripts/baseline.ts`)

Runs Lighthouse with the ADR 0004 mobile profile against each URL and writes `docs/baseline/live-site-<date>.json` and a summary table. By hand before the freeze; network. A comparison, not a gate.
