# Research: Scholarly Entity Registry & Integrity Gate

No `NEEDS CLARIFICATION` items remained in the spec. This file records the technical decisions the plan depends on.

## R1. Where canonical records live and in what format
- **Decision**: One YAML file per entity under `data/registry/<family>/`, with the ID declared inside the file (`id:`), not derived from the filename.
- **Rationale**: YAML is the most readable format for hand-editing scholarly records and diffs cleanly in review. Declaring the ID in content makes US1-AS3 (duplicate IDs fail, naming both files) a real, testable check, and lets legacy imports keep their IDs whatever their file names.
- **Alternatives**: JSON (noisier to hand-edit); one file per family (merge conflicts, slow review); Markdown frontmatter (fine for essays, which keep MDX bodies and use the same schema for frontmatter, but awkward for pure records).

## R2. Schema technology
- **Decision**: Zod schemas are the single source of truth, shared by Astro content collections and a standalone validator. JSON Schema is generated from them for external consumers (R pipelines, contributors).
- **Rationale**: ADR 0005 fixes Zod. A standalone core means the same rules run in the Astro build, in CI and against R outputs via a CLI, with no second definition of the rules.
- **Alternatives**: JSON Schema as the source with a TS validator (loses Astro integration and type inference); validating only inside Astro (cannot be run on R outputs without a full build).

## R3. Identifier grammar
- **Decision**: Stored IDs are **local IDs** unique within `(authority, family)`. In-repo references use `family:local-id` (authority defaults to `tc`) or `authority:family:local-id`. At export boundaries every ID is qualified as `tc:{authority}:{family}:{local-id}` (TC-D016).
  - `authority`: `[a-z][a-z0-9]{1,15}` (e.g. `tc`, `cnd`, `vmn`, `hse`, `atlas`)
  - `family`: closed enum from FR-001
  - `local-id`: `[a-z0-9][a-z0-9._-]{0,127}`, lowercase. This is permissive enough to accept legacy TC IDs unchanged (ADR 0001).
- **Rationale**: preserves legacy identities, keeps references short in authored files, and gives one unambiguous exported form.
- **Alternatives**: UUIDs (unreadable, break legacy); slug-as-ID (violates FR-002).

## R4. Slugs and old URLs
- **Decision**: Each routable entity has `slug` and optional `previous_slugs[]`. The build generates redirect rules from previous slugs to the current one. A retired entity (`lifecycle: superseded`) keeps a tombstone page linking to its successor; unknown IDs in deep links render a "not found in the registry" page, never a server error.
- **Rationale**: satisfies US1-AS2 and the retired-entity edge case on static hosting (Principle VII).

## R5. Lifecycle, release and essays
- **Decision**: One `lifecycle` enum (ADR 0003). Essays carry `stage` only; their lifecycle is computed by a pure mapping, and an essay that declares `lifecycle` fails validation. "Released" means `lifecycle === published`. Layer availability is computed from asset existence at build time and never stored.
- **Rationale**: removes any chance of the two axes contradicting each other (ADR 0003 §2).

## R6. Evidence and provenance
- **Decision**: An `Evidence` object (FR-003) is attachable to entities and to individual GeoJSON features (in `properties.evidence`). The rules from ADR 0003 are enforced as Zod refinements:
  - `verified` locators need `verified_by`, `verified_on` and `consulted_copy`;
  - a `secure` claim may not rest on a `pending` locator;
  - publishable records need rights.
- **Rationale**: dataset-level citation is insufficient where features rely on different evidence (Volume VI).

## R7. Automated extraction
- **Decision**: An `extraction` block (`method: manual|ocr|htr|llm`, `raw_evidence_ref`, `transformation_log_ref`, `adjudicated_by`, `adjudicated_on`). Any non-manual method without adjudication blocks lifecycle beyond `verified`.
- **Rationale**: FR-008; model output is never itself evidence (Principle VI).

## R8. Private fields
- **Decision**: Private data lives only under a top-level `private:` block. Every public output is produced through one projection, `toPublic()`, which drops it. A test scans all built public JSON and HTML for private keys and fixture values.
- **Rationale**: FR-009, with one choke point instead of per-page discipline.

## R9. Specialist vocabularies
- **Decision**: Per-authority mapping files in `data/vocab-mappings/<authority>.yaml` map specialist terms to the shared layer (lifecycle, evidence type, confidence, geometry provenance). Unmapped specialist terms fail validation.
- **Rationale**: TC-D016 (preserve locally, map at the boundary); FR-011.

## R10. Integrity gate execution
- **Decision**: A pure function `validateRegistry(records, assets?) → IntegrityReport`, wrapped by the CLI `npm run registry:check`. The CLI runs in CI and as an Astro integration hook before page generation, so a failing gate fails `astro build`. The report is written as JSON (`reports/integrity-report.json`, schema in `contracts/`) and Markdown (`reports/integrity-report.md`).
- **Rationale**: one implementation, three callers (build, CI, R outputs).

## R11. Reverse relationships
- **Decision**: The build derives a relations index from all declared references, keyed by qualified ID. It is filtered to released sources for public output; held sources are kept for editor views only.
- **Rationale**: FR-007 and the held-essay edge case.

## R12. Performance verification
- **Decision**: A deterministic generator produces a 5,000-entity synthetic registry across all families with realistic cross-references. A Vitest benchmark asserts the gate completes in under 60 s in CI (SC-004); the target is under 10 s locally. Mutation tests seed broken references and assert 100% detection (SC-003).

## Versions
Astro, TypeScript, Zod and Vitest use the latest stable releases at implementation time, pinned exactly in `package.json`; Zod v4's built-in JSON Schema output is preferred.
