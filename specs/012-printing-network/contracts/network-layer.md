# Contract: the derived network layer

## Layer record

```yaml
role: historical
asset: derived:place-roles        # new source kind: built from the registry, not from a file
theme: networks-circulation
envelope: 1508/1570
time_mode: per_feature
facets: role, basis, confidence
```

## Build (`src/atlas/build/write-outputs.ts`)

For each **public** edition (`publicEntryIds`, ADR 0014 as amended) and each of its place roles whose place is public, the build emits one point feature at the place's `location`, with these properties:

| Property | From |
|---|---|
| `id` | `<edition local-id>:<index>` |
| `edition`, `title` | the edition |
| `place` | the Place ID |
| `role` | `produced_at` or `held_at` |
| `basis`, `confidence` | the place role |
| `holder`, `shelfmark` | `held_at` only |
| `valid_from`, `valid_to` | the place role; for `produced_at`, the edition's date |
| `formerly` | `true` when `valid_to` is set on a `held_at` |

The features are then converted to FlatGeobuf as any GeoJSON source is. Build failures (`AtlasFailure`):
- `ATLAS-ROLE-PLACE-HELD`: a place role points at a held place, so its pin cannot be drawn. The build names the edition and the place, and writes nothing for the layer.
- The existing `ATLAS-ASSET-SIZE` applies to the built asset.

## Drawing (`src/atlas-client`)

- **Default filter:** `role = produced_at`. A "Show copies" toggle adds `held_at`.
- **Styles:**
  - `produced_at` and `held_at` differ by symbol;
  - `formerly: true` is a hollow symbol;
  - `basis: attributed` is a dashed outline.
  
  None of these is told by colour alone (ADR 0004).
- **Text:** every pin's accessible name and inspector heading state the role in words, for example: "Made here (attributed, high confidence)", "A copy is kept here: Library of the Romanian Academy", "Formerly kept here: … until 1890".
- **Legend:** lists only the roles drawn.
