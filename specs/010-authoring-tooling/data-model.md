# Data Model: Authoring Tooling (spec 010)

Spec 010 adds two optional record fields and a handful of derived, uncommitted structures. Nothing here is public, and no existing field changes meaning.

## Record fields added

### Evidence locator: `archived_copy`, `archived_on` (FR-018, ADR 0019 §3)

| Field | Type | Rule |
|---|---|---|
| `locator.archived_copy` | `https` URL of a web-archive snapshot | optional; when present, `archived_on` is required and the URL must be `https` (`LOC-ARCHIVED`, from `always`) |
| `locator.archived_on` | ISO date `YYYY-MM-DD` | optional; when present, `archived_copy` is required, and the date is not in the future |

An archived copy records where the copy a verified locator was read against can still be seen; it does not change `state`, `verified_by`, `verified_on` or `consulted_copy`. Valid and invalid fixtures are added under `tests/registry/fixtures/`. **Archived copy** is already in `GLOSSARY.md`.

The new rule `LOC-ARCHIVED` is added to `specs/001-scholarly-registry/contracts/rule-ids.md` with a named mutation (SC-003 of spec 001), and the counts are regenerated.

## Rule metadata added

### `Rule.requires` (R1)

```text
requires?: Array<{
  family: string           # which family the field is demanded of
  field: string            # the field the rule's finding names on a bare record, e.g. 'rights', 'place_type'
}>
```

Declarative only: the rule's `check` is unchanged, and `requires` never decides a finding. Its threshold is the rule's own `from`. As built (US1), it has no `notYet` or `when`: no current rule needs either (research R2, amended); each is added with the first rule that does.

## Derived structures (never committed, never deployed)

### Provenance checklist

| Attribute | Meaning |
|---|---|
| family | one of the 14 scaffoldable families |
| before `ready_for_build` | the fields whose rules are errors from `ready_for_build`, each a "not yet" value or a commented key |
| before `publishable` | the fields whose rules are errors only from `publishable` |

Invariant (SC-002): an untouched stub promoted to `ready_for_build` has errors on exactly the first list, and at `publishable` on exactly both. Collection, route, event and period have empty lists (FR-019).

### Stub

A record file written by `registry new <family> <title>`:

```yaml
id: tc:tc:<family>:<family>-NNNNNN   # minted, never typed
family: <family>
origin: minted
title: <title>
slug: <slug from title>
slug_history: []
lifecycle: proposed
release: held
relations: []
# To complete before ready_for_build
# source:
# evidence_type:
# rights:
```

That is an evidence stub as written. A place's has `# place_type:` before `ready_for_build` and `# names:`, `# location:` under `# To complete before publishable`; a collection, route, event or period has no headings (FR-019).

Lifecycle `proposed`, release `held`. Becomes an ordinary record when edited; nothing marks it as a stub afterwards.

### Dependents graph (`dependents.json`)

| Part | Fields |
|---|---|
| node | `id`, `family`, `title`, `held` (true unless published and released), `unknown` (true for a referenced ID with no record) |
| edge | `from` (the referring record), `to` (the referenced record), `field` (the reference field path, e.g. `makers[0]`) |
| meta | `commit`, `generated_at`, `counts` (nodes, edges) |

Edges come only from `referenceFields`, the definition the gate and `reverse.ts` use (FR-008). Schema: [contracts/dependents.schema.json](contracts/dependents.schema.json).

### Dependents of a record (query result)

| Attribute | Meaning |
|---|---|
| direct | records with an edge to the queried one: `id`, `field`, `held` |
| indirect | records reaching it through others: `id`, `held`, `path` (list of `{ id, field }` from the record down to the queried one) |

Each record appears once, by its shortest path; cycles terminate (FR-010).

### Editor schema (`.schemas/<family>.json`)

JSON Schema (draft 2020-12) per family, generated from the Zod schema with three overlays: top-level `additionalProperties: false`; `enum` plus `markdownEnumDescriptions` on vocabulary fields; `anyOf` of ID suggestions plus a plain string on reference fields. See [contracts/editor-schemas.md](contracts/editor-schemas.md).

### Vocabulary values (GLOSSARY.md section)

One table per vocabulary (`lifecycle`, `release`, `confidence`, `geometry_provenance`, `silence_state`, `locator.state`, `evidence_type`), one row per value: `| value | definition |`. Two-way invariant with the `*_VALUES` constants, enforced by the generator and a unit test.

### Link-check state (workflow cache, `linkcheck-state.json`)

| Part | Fields |
|---|---|
| url result | `url`, `status` (`ok`, `dead`, `unreachable`), `http` (last status code or error), `checked_on`, `unreachable_runs` (consecutive runs unreachable) |
| manifest fingerprint | `url`, `canvases` (sorted IDs), `count`, `seen_on` |

Never in the repository (ADR 0019). Losing the cache costs only the unreachable streaks and the manifest fingerprints: dead URLs are found again at once, and Jira's labels prevent duplicates; a manifest seen for the first time is recorded, not reported.

### Link finding (Jira issue)

One issue per dead URL (or URL unreachable three weeks running) in project TCX: summary `Dead link: <host><path>`, label `linkcheck-<hash12>`, body listing every record (ID, file, field) using the URL and the last status. A manifest change is a separate issue with label `linkcheck-manifest-<hash12>` and lower priority.
