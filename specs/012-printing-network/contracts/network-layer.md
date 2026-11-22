# Contract: the derived network layer

## Layer record

```yaml
role: historical
asset: derived:place-roles        # new source kind: built from the registry, not from a file
theme: networks-circulation
envelope: 1508/1570
time_mode: envelope_only           # amended at US2: see "Time" below
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
| `valid_from` | `produced_at` only: the role's date (the printing). With no `valid_to`, the pin shows from its printing to the end of the layer's envelope |
| `held_from`, `held_to` | `held_at` only: the custody dates, as text |
| `formerly` | `true` when `valid_to` is set on a `held_at` |
| `label`, `name` | the pin in words, for example "Made here (attributed, probable): Liturghier, 1508"; `name` is the same text, read by the no-WebGL feature table |

**Time (amended at US2, 2026-11-22).** A copy's custody dates (kept since 1950) are not the network's time (1508–1570): placed on the timeline they would fail `ATLAS-FEATURE-TIME` and mean nothing. So holdings carry `held_from` and `held_to` as text only, and the layer is `envelope_only`; a production place carries `valid_from` so the network accumulates as the years pass.

The features are then converted to FlatGeobuf as any GeoJSON source is. Build failures (`AtlasFailure`):
- `ATLAS-ROLE-PLACE-HELD`: a place role points at a held place, so its pin cannot be drawn. The build names the edition and the place, and writes nothing for the layer.
- `ATLAS-ROLE-PLACE-LOCATION` (added at US2): a place role names a public place with no location.
- The existing `ATLAS-ASSET-SIZE` applies to the built asset.

## Drawing (`src/atlas-client`)

- **Default filter:** `role = produced_at`. The copies are added by the layer's role facet, whose checkboxes speak in words: "Made here" and "Copies kept here" (amended at US2: the toggle is the standard facet control, not a new one, Principle IV).
- **Styles:**
  - `produced_at` and `held_at` differ by symbol;
  - `formerly: true` is a hollow symbol;
  - `basis: attributed` is a dashed outline.
  
  None of these is told by colour alone (ADR 0004).
- **Text:** every pin's accessible name and inspector heading state the role in words, for example: "Made here (attributed, high confidence)", "A copy is kept here: Library of the Romanian Academy", "Formerly kept here: … until 1890".
- **Legend:** lists only the roles drawn.
