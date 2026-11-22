# Contract: editor schemas (US3, FR-011 to FR-014, ADR 0019 §1)

## Files

| Path | Committed | Content |
|---|---|---|
| `.schemas/<family>.json` | no (`.gitignore`) | JSON Schema 2020-12 for one family's YAML record |
| `.schemas/index.json` | no | `{ "<family>": "<family>.json" }` |
| `.vscode/settings.json` | yes | `"yaml.schemas": { "./.schemas/<family>.json": "content/<family>/*.yaml", … }` for all 15 families |
| `.vscode/extensions.json` | yes | `{ "recommendations": ["redhat.vscode-yaml"] }` |

## What each schema says

1. **Structure**: `z.toJSONSchema(<Family>Schema)`, from `src/registry/schemas/`. Zod is the only source.
2. **No unknown fields**: top-level `additionalProperties: false`, as `FAM-UNKNOWN` (the Zod schemas stay loose so that the gate reports unknown fields).
3. **Vocabularies**: on `lifecycle`, `release`, `confidence`, `geometry_provenance`, `silence_state`, `locator.state` and `evidence_type`, `enum` from the `*_VALUES` constant and `markdownEnumDescriptions` from GLOSSARY.md's **Vocabulary values** section. On the items of `analytical_dimensions[]`, `enum` from `ANALYTICAL_DIMENSION_VALUES` and `markdownEnumDescriptions` from `FRAMEWORK.md` (constitution Principle XI, ADR 0020). On the items of `portal_dimensions[]`, `enum` from `PORTAL_DIMENSION_VALUES` with the glossary's **Portal facet** text. Other enumerated fields (`origin`, `role`, `form`, `section`, `locator.proposed_by`) get `enum` only.
4. **References**: on every path in `schemas/references.ts`, `anyOf: [ { "const": "<id>", "description": "<title>" } …, { "type": "string" } ]`, the suggestions being the records of the expected family (any family for `relations[]` and `target.entity`). The trailing plain string means a suggestion list can be stale without rejecting anything; whether the ID exists stays `REF-UNKNOWN`'s call.

## Failure

Generation fails, naming the value, when a value in one of the seven glossary vocabularies has no row in GLOSSARY.md's **Vocabulary values**, or a row names a value the constant lacks; and when an analytical dimension has no definition in `FRAMEWORK.md`, or a framework section names a value the constant lacks (FR-012).

## Agreement with the gate (SC-005)

For every record on `main` that loads without a `LOAD-PARSE` error and has no `FAM-UNKNOWN` or `ENUM-INVALID` finding, its schema accepts it. For a set of seeded typos (a misspelt field, an unknown value in each of the seven glossary vocabularies, an unknown entry in `analytical_dimensions` and in `portal_dimensions`), both the schema and the gate reject the record. A unit test runs both over the real registry and the seeded set.

## Not a gate

Nothing in CI reads `.schemas/`. Editor validation is a convenience: the gate remains the authority (ADR 0019).
