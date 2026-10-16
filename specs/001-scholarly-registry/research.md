# Research: Scholarly Entity Registry & Integrity Gate

No `NEEDS CLARIFICATION` remained after `/grill-with-docs` and `/speckit-clarify`. The items below record the technical choices that the plan depends on.

## R1 — Gate independent of Astro
- **Decision**: `src/registry/` depends on Zod and a YAML parser only. Astro content collections (spec 002) import the same schemas.
- **Rationale**: the gate must run in CI and from R pipelines without a site build, and must be testable in milliseconds. One schema source avoids drift between the gate and the site.
- **Alternatives**: validate only inside Astro's content layer (couples the gate to the site build, slow tests, cannot run on R output alone); duplicate schemas (drift).

## R2 — Record format
- **Decision**: YAML for records; Markdown/MDX body only for essays and prose. Filename equals `local-id`.
- **Rationale**: readable diffs for a scholarly editor, comments allowed, easy to write from R (`yaml` package), no escaping problems with long quotations (the legacy CSVs embed long quotes with commas).
- **Alternatives**: JSON (no comments, noisy diffs); CSV (legacy format, poor for nested evidence and `same_as[]`); TOML.

## R3 — Pure validator
- **Decision**: `validateRegistry(records) → IntegrityReport` is pure; file I/O stays in `loadRegistry` and the CLI.
- **Rationale**: tests build records in memory, so rules and mutations run fast and without disk state. SC-004 then measures the algorithm, not disk speed.
- **Alternatives**: rules that read files directly (slow, untestable in isolation).

## R4 — Graph checks by index
- **Decision**: build a `Map<canonicalId, Record>` once, then run each rule in one pass over records using index lookups; reverse relationships are computed in one pass over declared references.
- **Rationale**: O(n + references); 5,000 entities with a few references each is far below 60 s.
- **Alternatives**: pairwise checks (O(n²)).

## R5 — Stable rule IDs and report schema
- **Decision**: rules are registered with a stable string ID (`ID-DUPLICATE`), a severity function of lifecycle and a message template. The report schema is versioned JSON ([contracts/integrity-report.schema.json](./contracts/integrity-report.schema.json)).
- **Rationale**: tests and CI assert on rule IDs rather than message text; the mutation suite (SC-003) needs a one-to-one mutation→rule mapping.
- **Alternatives**: assert on messages (brittle); numeric codes (unreadable).

## R6 — Progressive strictness
- **Decision**: each rule declares the lowest lifecycle at which it is an error (`always`, `ready_for_build`, `publishable`); below that it is reported as a warning.
- **Rationale**: matches the accepted Q6 behaviour, lets the editor register early research, and keeps one rule definition per check.
- **Alternatives**: two rule sets (duplication); validate only publishable records (misses broken references early).

## R7 — Minting
- **Decision**: `registry mint <family>` scans `content/<family>/` in the working tree and the same path in `main` (via `git ls-tree`, falling back to the working tree if git is unavailable), takes the highest counter and adds one. Collisions across branches are caught by `ID-DUPLICATE`.
- **Rationale**: matches the accepted collision rule; no shared state or lock file.
- **Alternatives**: random suffix, per-branch ranges (rejected in clarify).

## R8 — Redirects and withdrawn pages
- **Decision**: `redirects.ts` returns a list of `{from, to, status}` rules and withdrawn-page descriptors; spec 002 renders them to Cloudflare `_redirects` and static pages. The gate checks collisions and dangling successors.
- **Rationale**: keeps hosting-specific output outside the registry while making the logic testable.
- **Alternatives**: write `_redirects` inside the gate (couples to hosting).

## R9 — Public projection and leak scan
- **Decision**: per-family allowlists are Zod `pick` shapes; anything not listed is dropped. The leak scan reads a manifest of private values and held IDs from the registry, then searches `dist/` text files and JSON payloads for them.
- **Rationale**: private-by-default is safe against new fields; scanning the built output catches leaks from any generator, not only ours.
- **Alternatives**: denylist (fails open on new fields); scan source only (misses leaks introduced by templates).

## R10 — Synthetic fixture and mutations
- **Decision**: a seeded generator (small PRNG, no dependency) builds a valid 5,000-entity registry in memory for the timing test; the same generator feeds the mutation suite via named mutations.
- **Rationale**: deterministic, not committed, and the mutation list is the executable spec for SC-003.
- **Alternatives**: committed large fixture (repo bloat); random data without a seed (flaky).

## R11 — Legacy audit inputs
- **Decision**: the importer lives in spec 008, but spec 001 ships the boundary types it needs: the legacy ID pattern, `origin`, `legacy_confidence`, `legacy_review_state` and the `port → place` exception.
- **Rationale**: FR-014 is a registry rule; the adapters are not.
- Evidence: legacy contract `data/contracts/terra-chartarum.json` in `vladsimion/terra-chartarum` (pattern `^tc:[a-z0-9][a-z0-9-]*:[a-z][a-z0-9-]*:[A-Za-z0-9][A-Za-z0-9._:-]*$`).
