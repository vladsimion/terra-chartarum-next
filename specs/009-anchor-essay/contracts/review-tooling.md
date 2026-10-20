# Contract: the review tooling

Three scripts and two ledger-style files. They add no registry rule and no change to `registry promote`; the editorial steps they support are enforced by Vitest tests in CI.

## `npm run essay:preview -- <slug> [--without <map-slug> …]` (`scripts/essay-preview.ts`)

Builds a preview of an essay that is still held.

1. Finds the essay by slug in the real registry; fails (exit 2) if there is none.
2. Collects the records it uses: its `maps`, `evidence`, `sources` and `bibliography`, each evidence record's `source` and that source's `entry`.
3. Copies `content/`, `vocab-mappings/` and the layer data to a temporary folder. The real registry is never written.
4. In the copy only: the essay becomes stage `Publish`, `release: released`, with `design_qa_passed: true`, placeholder `signoffs`, a full `stage_history` and `published_on` stamped as a preview; every used record becomes published and released. `--without <map>` removes that map from the copy's `maps` and its `<MapFigure>` tag from the copy's body.
5. Builds the copy with `REGISTRY_ROOT` into `dist-anchor`. The site build runs the whole integrity gate on the copy; a record that is not ready to be published makes it fail, printing the gate's errors (the release-readiness report).

**Exit**: 0 built; 1 the copy failed the gate or the build (errors printed, the temporary folder named); 2 usage (no such essay, bad flag). The temporary folder is removed on success.

**Tested**: the record selection, the flips and `--without` as pure functions over an in-memory registry (`tests/essays/unit/preview.test.ts`), and that the real registry is byte-identical afterwards.

## `npm run essay:ledger` (`scripts/essay-ledger.ts`) and its test

Reads `docs/review/anchor-essay-changes.md`, a table with columns `id | legacy line | legacy text | proposed text | reason | status | approved by | date`. `status` is `pending`, `approved` or `rejected`.

- Prints any `pending` row and exits 1 while there is one; exit 0 otherwise.
- `tests/essays/unit/ledger.test.ts` reads the essay record's `stage` and **fails when the stage is Build or later and a row is `pending`**, and when an `approved` row has no `approved by` or `date`.

## `npm run essay:reconcile -- <legacy clone>` (`scripts/essay-reconcile.ts`) and its test

Compares the essay's cell file with the legacy `data/dacia/attestations.csv` pit rows (read from the clone; the clone is an argument, never committed) and writes `docs/review/pit-cells-reconciliation.md`, one row per cell: `pit | stratum | essay name | CSV name_original | CSV name_normalized | CSV class | difference | resolution | resolved by`. The difference is `none`, `name`, `language`, `note`, `missing in CSV` or `missing in essay`.

- `tests/essays/unit/reconcile.test.ts` fails when the stage is Build or later and a row with a difference has no `resolution`.
- The essay's table stays the source of truth unless the author's resolution says otherwise.

## `scripts/essay-legacy-manifest.ts <legacy clone>` (run once)

Reads the legacy `dacia.mdx`, normalises each paragraph (markup and whitespace removed, case folded) and writes `docs/review/anchor-essay-legacy-paragraphs.json`, `[{line, sha256}]`. `tests/essays/unit/port-fidelity.test.ts` normalises the rebuilt body the same way and requires every legacy hash to be present in it or covered by a ledger row.

## CI

`tests/essays/unit/{ledger,reconcile,port-fidelity,cells-file,release-list,preview}.test.ts` run in `npm test`. A `playwright.anchor.config.ts` (`npm run test:e2e:anchor`) builds the preview and runs the essay's e2e specs against it; the essay's page type is added to `tests/shell/ci-templates.json` and `lighthouserc.json` at the Design QA slice.
