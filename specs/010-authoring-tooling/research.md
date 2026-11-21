# Research: Authoring Tooling (spec 010)

The open questions were settled by the grill (ADR 0018, ADR 0019) and by the spec's clarification of FR-019. What remained were the questions of *how*, answered here from the code as it stands on `main` at f0a9230.

## R1. Where the provenance checklist comes from

- **Decision**: `defineRule` gains an optional `requires: { family: string | '*'; field: string; notYet?: unknown; when?: (record) => boolean }[]`. Every rule that reports a missing field declares it there. `checklistFor(family)` in `src/registry/checklist.ts` collects the declarations of every registered rule, splits them by the rule's threshold (`ready_for_build` and `publishable`), and returns, per field, either its "not yet" value or a commented key.
- **Rationale**: ADR 0018 requires the checklist to be "derived from the rules' field lists, not typed". Today those lists are private constants inside the rule modules (`REQUIRED` in `rules/family.ts`, `NEEDS_RIGHTS` in `rules/rights.ts`, the `['source', 'evidence_type']` loop in `rules/provenance.ts`, and others). Declaring them on the rule keeps one home per fact (Principle V). A test closes the loop the other way: for every scaffoldable family, an untouched stub promoted to `ready_for_build` (then `publishable`) produces errors exactly on the declared fields (SC-002). A rule that demands a field without declaring it fails that test.
- **Two headings, not one**: ADR 0018 names one heading, `# To complete before ready_for_build`. Some fields are required only from `publishable` (map image `alt`, `RIGHTS-CLEARED`, `BIB-LISTED-HELD`). They go under a second heading, `# To complete before publishable`, so the editor sees them early without being told they block `ready_for_build`. This extends the ADR without contradicting it; the decision is recorded in the Build Log row for US1.
- **Alternatives considered**: a hand-written checklist per family (rejected by ADR 0018: drifts); deriving the checklist by running the rules on a stub and reading the findings (works for missing fields, but cannot tell a field with a "not yet" value from one without, and couples the scaffold to every rule's message text).

## R2. Which fields have a "not yet" value

- **Decision**: only those the vocabularies already define as an honest absence: locator `state: pending`, `confidence: unknown`, and for maps the `field_status` answers the editor already uses (`not_yet_verified`). Everything else (`verified_by`, `verified_on`, `consulted_copy`, `source`, `rights.licence`, `version`, `kind`, `place_type`, …) is a commented key.
- **Rationale**: Principle VI. A "not yet" value must be a value the rules read as "not yet", never a placeholder string that might be mistaken for an answer.
- **Alternatives**: empty strings (`present()` treats them as missing, but they read as answers in a diff and invite a guess).

## R3. Rollback and output of `registry new <family>`

- **Decision**: reuse `createEssay`'s pattern exactly: `loadAndCheck` before and after, compare the error keys, remove what was written if a new error appears. `new-essay.ts` keeps its behaviour and options (FR-006); `slugFromTitle` and the rollback move to a shared helper. Output on success is two lines, the stable ID and the file path, as `registry new essay` prints today; on refusal exit code 2 with a message on stderr; on rollback exit code 1.
- **Rationale**: one behaviour for both commands; the two-line stdout is what R parses (R5).
- **Families with required options**: an essay needs `--question`, `--author`, `--room` (unchanged). No other family takes options in this spec: anything else is a checklist item for the editor to fill, not a prompt (ADR 0018 rejected prompting for provenance).

## R4. Vocabulary definitions for the editor

- **Finding**: FR-012 wants every value of seven shared vocabularies to carry its `GLOSSARY.md` definition. The glossary defines the vocabularies (Confidence, Lifecycle, Geometry provenance, Silence state, Held / released, Pending locator) as single rows, and defines some values inline (`secure` (direct, verified) · …) but not all: the lifecycle values, the geometry-provenance values and the evidence types have no per-value text.
- **Decision**: add a **Vocabulary values** section to `GLOSSARY.md`: one table per vocabulary, one row per value, `| value | definition |`, wording taken from ADR 0003 where it has one. `src/registry/glossary.ts` parses that section; schema generation fails when a value in a `*_VALUES` constant has no row, or a row names a value the constant does not have.
- **Rationale**: the glossary is the home of domain language (CLAUDE.md); the parser makes the two-way agreement a test rather than a habit.
- **Scope**: the seven vocabularies FR-012 names: lifecycle, release, confidence, geometry provenance, silence state, locator state, evidence type (43 values). Others (`role`, `form`, `section`, `proposed_by`, Atlas vocabularies) get an enum without descriptions; they can be added later without a code change.
- **The definitions are the author's words**: the task drafts them from ADR 0003 and existing glossary text, and the PR asks the author to confirm them, as with any glossary change.

## R5. R pipelines and the minter

- **Finding**: there is no R code in the repository yet (`find . -name '*.R'` finds nothing outside `node_modules`), so there is no R pipeline, no `testthat` suite and no R in CI.
- **Decision**: spec 010 fixes the **calling contract** on the TypeScript side: `npm run --silent registry -- mint <family> --dir <root>` prints exactly one line, the local-id; `registry new <family>` prints the ID then the path; both exit non-zero with a message on stderr on failure. An integration test runs the real CLI as a child process, the way `system2()` would, and asserts that contract (FR-007's "one integration test runs the real command"). The R helper (`registry_mint()` via `system2()`) and its `testthat` test with a mocked call land with the first R pipeline, which will also add R to CI.
- **Rationale**: Principle X forbids closing a task with an untested path, and R cannot be tested in CI today. Writing the helper now would mean shipping untested R.
- **Flagged for the author**: this narrows FR-007 for now. If an R pipeline is planned before spec 010 closes, the helper should move into US1.
- **Alternatives**: add R and `testthat` to CI now for a three-line helper (cost without a consumer).

## R6. The dependents graph

- **Decision**: `buildDependents(records)` returns `{ nodes: { id, family, title, held }[], edges: { from, to, field }[] }`, edges from the referring record to the referenced one, one per `referenceFields` entry, self-references dropped, unknown targets kept as edges to an `unknown` node (the gate reports them; the editor should see them). `dependentsOf(graph, id)` runs a breadth-first search over reversed edges, recording the first path to each node: direct = depth 1, indirect = depth > 1; a visited set makes cycles terminate (FR-010).
- **External authorities**: `same_as[]` is not in `referenceFields` today, so it creates no edge; no change is needed for the spec's edge case.
- **Where it is written**: `registry check --out <dir>` already writes the integrity report there; it also writes `dependents.json` and `dependents.html`. CI uploads `reports/` as the `integrity-report` artefact already, so the graph is uploaded with no workflow change. `registry deps <id> [--dir]` loads the registry and queries without writing.
- **Viewer**: a static HTML page, one section per record listing its dependents with their paths; no script, no graph drawing (ADR 0019 rejected Mermaid at registry size). It reuses the integrity report's HTML conventions.
- **Alternatives**: extending `reverse.ts` (deliberately public-only, ADR 0019).

## R7. Editor schemas

- **Decision**: `scripts/editor-schemas.ts` calls `z.toJSONSchema()` (Zod 4, already a dependency) on each family schema in `src/registry/schemas/`, then post-processes:
  - `additionalProperties: false` at the record's top level, mirroring `FAM-UNKNOWN` (the Zod schemas are loose so that the gate, not the loader, reports unknown fields);
  - for each vocabulary field (the paths in `rules/enums.ts` `ENUM_FIELDS`, plus `lifecycle`, `release`, `origin`), `enum` and `markdownEnumDescriptions` from R4;
  - for each reference field (the paths in `schemas/references.ts`), an `anyOf` of `{ const: <id>, description: <title> }` for every record of the expected family **plus** `{ type: 'string' }`, so a stale suggestion list never rejects a valid ID (FR-013);
  - essays: the YAML record only; the MDX body is outside scope.
- **Output**: `.schemas/<family>.json`, ignored by git. `.vscode/settings.json` maps `content/<family>/*.yaml` to `.schemas/<family>.json` through `yaml.schemas`; `.vscode/extensions.json` recommends `redhat.vscode-yaml`.
- **When**: `postinstall`, `predev` and `prebuild` npm scripts, plus `npm run schemas` on demand. A failure in `postinstall` must not break `npm ci` in CI, so `postinstall` reports and exits 0, while `prebuild` and the unit test fail hard (FR-012).
- **Rationale**: Zod stays the only source (ADR 0019); the overlay data all comes from constants the rules already use.
- **Alternatives**: committing schemas with a drift test (rejected by ADR 0019); a hand-written JSON Schema (drifts).

## R8. The link and manifest checker

- **What it collects** (FR-015): every `https?://` URL in a locator's `consulted_copy`; map `images[].url` and `images[].static_url`, and for `type: iiif` the manifest URL; bibliography `digital_copy`; dataset `upstream.url` (TCX-65). Each URL maps to the records that use it.
- **Probe**: `HEAD`, falling back to `GET` with a byte range when a host rejects `HEAD`; three attempts with backoff; at most one request per host per second. **Dead** = 404 or 410, or a DNS failure, on every attempt. **Unreachable** = 429, 5xx or a timeout on every attempt. A dead URL opens its issue on the run that finds it, so a break is reported within eight days (SC-006). An unreachable URL is retried the next week rather than reported (spec edge case); only one unreachable on three consecutive runs opens an issue, marked unreachable rather than dead. The previous runs' results are kept in the workflow cache with the manifest fingerprints.
- **Jira** (FR-016): one issue per URL in project TCX, found again by a label `linkcheck-<first 12 hex of sha256(url)>` through JQL, so a rerun updates rather than duplicates. The issue lists the records. A URL that recovers gets a comment, not an automatic close.
- **Manifests** (FR-017): fingerprint = sorted canvas IDs plus their count, read from IIIF Presentation 3 `items` or 2 `sequences[0].canvases`. A change opens a separate review issue (lower priority, label `linkcheck-manifest-<hash>`), listing the maps and any layer `georef` pointing at that map.
- **Archived copies** (FR-018): for a verified locator with no `archived_copy`, request a snapshot through the Wayback Machine's save endpoint, then read the snapshot URL from the availability API. The workflow commits the two fields on a branch `linkcheck/archived-copies-<date>` and opens **one** pull request per run listing every locator it touched. A person merges it. The run itself writes nothing to `main`.
- **Secrets**: `JIRA_API_TOKEN` and `JIRA_USER` (email for basic auth), stored as Actions secrets; the workflow's `GITHUB_TOKEN` with `contents: write` and `pull-requests: write`, scoped to that workflow only. A missing secret fails the run loudly before any request (spec edge case).
- **Isolation**: the checker lives in `src/linkcheck/` and is run only by `scripts/link-check.ts` from `.github/workflows/link-check.yml`. A test asserts that no module reachable from `src/registry/cli.ts`, `astro.config.mjs` or `src/pages/` imports `src/linkcheck/` (SC-008).
- **Alternatives**: one PR per locator (noisy); closing issues automatically on recovery (a person should confirm the scan is the same scan).

## R9. Not weakening any rule (SC-003)

- **Decision**: a test snapshots `ALL_RULES.map(r => [r.id, r.from])` at the start of the spec (`main` at f0a9230: 94 rules) and asserts that every one of those pairs is still present at the end. New rules may be added; none may be removed or have its threshold raised.
- **Rationale**: the spec's central promise, made checkable.
