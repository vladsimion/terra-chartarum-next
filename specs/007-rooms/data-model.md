# Data Model: Rooms (Curatorial Paths)

Extends the room row of spec 001's data model ("Family fields"), which today says `room | none | none`. Fields are those of the clarified FR-001 and FR-004; `FAM-UNKNOWN` rejects anything not listed.

## Room record (`content/room/<id>.yaml` and `<id>.md`)

| Field | Rule |
|---|---|
| Entity base | `id` (`tc:tc:room:<name>`), `family: room`, `origin`, `title` (the room's name), `slug`, `slug_history`, `lifecycle`, `release`, `relations[]`, `private` |
| `order*` | integer 1 to 7; `earth` 1, `map` 2, `city` 3, `border` 4, `road` 5, `archive` 6, `theatre` 7 (`ROOM-COPY`) |
| `short_description*` | one plain sentence, shown on the index and the Atlas lens; non-empty from `ready_for_build` (`ROOM-COPY`) |
| `copy_status` | `draft` or `final`; default `draft` (`ROOM-COPY`) |
| `lifecycle*`, `release*` | must be `published` and `released` for every room (`ROOM-PUBLIC`) |
| body (`<id>.md`) | the long description; Markdown, no components; loaded as the record's computed `body` |

The seven rooms and their set are unchanged (`ROOM-SET`, `families.ts`).

## Room membership (derived, never stored)

| Value | Derived from |
|---|---|
| Primary essays of a room | public essays whose `rooms.primary` is the room |
| Secondary essays of a room | public essays whose `rooms.secondary[]` includes the room |
| Maps of a room | the `maps[]` of those public essays (either role), public maps only |
| Layers of a room | the `layers[]` of those public essays (either role), public layers only |
| Rooms of a map or layer | the inverse: the rooms of the public essays that list it |

## Public projection

The allowlist adds, for room: `order`, `short_description`, `copy_status` and the body. A room is always projected (it is always public); an essay, map or layer that is not published and released is never part of a membership result.
