# Contract: Atlas rule IDs and build-time checks

## Registry rules

New rules added to `specs/001-scholarly-registry/contracts/rule-ids.md` when they are implemented. Severity follows the registry's lifecycle ranking: "warn from" is the lowest lifecycle at which the finding is a warning, "error from" the lowest at which it is an error. Each has a named mutation.

| Rule ID | Checks | Spec | Warn from | Error from |
|---|---|---|---|---|
| `LAYER-THEME` | `theme` is one of the seven stored values | FR-001 | `ready_for_build` | `publishable` |
| `LAYER-TIME` | `envelope` is a valid EDTF interval with `from ≤ to` (earliest reading of `from`, latest of `to`); `time_mode` is `per_feature` or `envelope_only` | FR-001, FR-013 | `ready_for_build` | `publishable` |
| `LAYER-FACET` | each facet has `property`, `label`, `kind` (`category` or `range`); properties are unique; a layer with `time_mode = per_feature` does not use `valid_from` or `valid_to` as a facet property | FR-014 | | any |
| `LAYER-GEOREF` | a `map-overlay` layer has a complete `georef` whose `map` resolves to a map record; any other role has none; `residual_error_m ≥ 0`, `control_points ≥ 3`, `transformation` and `confidence` from their sets; a `map-overlay` layer is not `time_mode = per_feature` | FR-019 | | `ready_for_build` |
| `LAYER-ASSET-SIZE` | the source file named by `asset` is no larger than the host's per-file limit (25 MiB, confirmed in task T003) | FR-006 | | any |
| `PLACE-NAMES` | `names` has at least one entry from `ready_for_build`; each has a name, a BCP 47 `language`, a `kind` of `historic` or `modern`; `valid_from` and `valid_to`, when given, are valid EDTF with `valid_from ≤ valid_to`; no duplicate (name, language, kind) | FR-009 | `ready_for_build` | `publishable` |
| `PLACE-LOCATION` | `location` has numeric `lon` in -180 to 180 and `lat` in -90 to 90 | FR-009 | `ready_for_build` | `publishable` |

Existing rules that now also apply: `FAM-REQUIRED` (no change: the new required fields are checked by the rules above so that early research records still load), `FAM-UNKNOWN`, `REF-UNKNOWN` and `REF-FAMILY` for `georef.map`, `PROV-MODERN-AS-EVIDENCE` (a `modern_reference` layer is role `context`), the availability rule (`published` with a missing source fails), `RIGHTS-CLEARED`, and the held-leak scan.

## Build-time checks (Atlas build, `astro:build:done`)

These read layer assets, which the gate does not, and fail the build with the layer's slug and the feature index. They run only for public layers.

| Check ID | Fails when |
|---|---|
| `ATLAS-ASSET-MISSING` | the source named by `asset` is not readable, or is not valid GeoJSON or a valid PMTiles header |
| `ATLAS-ASSET-SIZE` | the built asset exceeds the host's per-file limit |
| `ATLAS-FEATURE-TIME` | `time_mode = per_feature` and a feature lacks `valid_from` or `valid_to`, or a value is not valid EDTF, or a feature's interval lies wholly outside the layer's envelope |
| `ATLAS-FEATURE-PROVENANCE` | a feature's `geometry_provenance` is not one of the five values, or is `modern_reference` on a layer whose role is not `context` |
| `ATLAS-FACET-PROPERTY` | a declared facet property is absent from every feature, or a `range` facet has a non-numeric value |
| `ATLAS-PLACE-REF` | a feature's `place` property is not a public place ID |
| `ATLAS-OVERLAY-ANNOTATION` | the `georef.annotation` file is missing or not parseable JSON |
| `ATLAS-LEAK` | an output file contains the id, slug or title of a held entity, or a private value (the registry leak scan applied to the Atlas outputs) |
