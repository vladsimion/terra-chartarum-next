# Contract: `src/rooms/membership.ts`

A pure module: public records in, plain data out. No file access, no DOM. It is the only code that derives room membership (ADR 0015); specs 004 and 005 call it.

## Interface

```ts
type RoomId = 'earth' | 'map' | 'city' | 'border' | 'road' | 'archive' | 'theatre';

interface RoomMembership {
  room: RoomId;
  primaryEssays: PublicRecord[];     // essays whose rooms.primary is the room, title order
  secondaryEssays: PublicRecord[];   // essays whose rooms.secondary includes the room, title order
  maps: PublicRecord[];              // maps in those essays' maps[], title order, no duplicates
  layers: PublicRecord[];            // layers in those essays' layers[], title order, no duplicates
}

membership(records: PublicRecord[]): RoomMembership[];            // all seven, in canonical order
roomsOf(record: PublicRecord, records: PublicRecord[]): RoomId[]; // the rooms of a map, layer or essay, canonical order
```

## Rules

- Input is already the public projection; the module does not re-check release state, but returns nothing for a reference that does not resolve to a record in the input.
- An essay in both the primary and the secondary list of one room (which `ESSAY-ROOMS` forbids) appears once, under primary.
- A map or layer used by essays in several rooms appears in each; used by no public essay it appears in none.
- Title order is a case- and diacritic-insensitive comparison, ties by slug.
- Deterministic: the same input gives the same output.

## Callers

| Caller | Uses |
|---|---|
| Rooms pages (this spec) | `membership` |
| Collection room filter and `index-data.ts` (spec 004) | `roomsOf` for maps |
| Atlas `atlas-index.json` and Room lens (spec 005) | `roomsOf` for layers |
| `tests/rooms/unit/atlas-agreement.test.ts` | both, to prove the room page and the Atlas agree |
