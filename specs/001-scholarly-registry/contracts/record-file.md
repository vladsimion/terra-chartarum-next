# Contract: Registry record files (authoring interface)

Authors (people, the importer of spec 008, and R pipelines) write one YAML file per entity at:

```
data/registry/<family>/<any-file-name>.yaml
```

The file name is free; identity comes from `id` (+ `authority`, default `tc`). Field definitions are in `../data-model.md`; the machine-readable schema is generated from the Zod source at `schemas/registry.schema.json` during the build.

Dates are EDTF strings (ADR 0006); quote them in YAML so `0106` is not read as a number.

## Reference syntax inside records
| Form | Meaning |
|---|---|
| `map:ortelius-dacia-1595` | authority `tc`, family `map` |
| `cnd:attestation:apulum-ptol-3-8-4` | explicit authority |

The qualified export form `tc:{authority}:{family}:{id}` is produced by the build and never authored.

## Example (minimal published place)

```yaml
id: apulum
family: place
title: Apulum
slug: apulum
lifecycle: published
names:
  - { form: Apulum, language: la, valid_from: "0106", valid_to: "0271~" }
  - { form: Alba Iulia, language: ro }
evidence:
  - source: source:ptolemy-geographia
    locator: "3.8.4"
    locator_state: pending
    evidence_type: textual
    geometry_provenance: modern_reference
    confidence: probable
rights: { licence: CC-BY-4.0, attribution: "Terra Chartarum", reproduction_cleared: true }
```

## Guarantees
- A file accepted today stays valid unless a later ADR changes a vocabulary (constitution: MAJOR or MINOR bump).
- Unknown top-level keys are rejected; misspelt fields never pass silently.
- The `private:` block is accepted but never appears in any public output.
