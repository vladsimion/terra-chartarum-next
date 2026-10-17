# ADR 0015 — Rooms: public by rule, one page each, membership derived once

**Status**: Accepted · **Date**: 2026-10-17 · **Jira**: TCX-8 · **Spec**: 007 · **Extends**: ADR 0003 §7, TC-D004; **Refines**: TC-D019 for rooms

## Context
ADR 0003 fixes seven rooms and says all seven are public at v1, even before any essay is rebuilt. TC-D019 says only a record that is both published and released is public, which an editor chooses record by record. Spec 003 made `rooms` an essay-only field; specs 004 and 005 each plan to derive the rooms of a map or a layer from the public essays that use it. The home page links to `/rooms/#earth`, which assumes the rooms are sections of one page, while spec 007 says a reader "opens a room".

## Decision
- **Rooms are public by rule.** `ROOM-PUBLIC` makes it a registry error for any of the seven room records not to be `published` and `released`. Rooms are structural records, public from the first commit; their unfinished prose is marked by a `copy_status` field (`draft` or `final`, default `draft`), not by being held.
- **One page per room.** The Rooms index is `/rooms/` and each room is `/rooms/<slug>/`. The home page, essay pages and the Atlas link to those addresses; former slugs redirect (ADR 0006).
- **Membership is derived once.** A single pure module, `src/rooms/membership.ts`, returns a room's essays (primary group first, then secondary), and the maps and layers used by its public essays in either role. The Rooms pages, the Collection room filter (spec 004) and the Atlas Room lens (spec 005) all call it.
- **The room record** gains `order` (1 to 7), `short_description` and `copy_status`; its long description is Markdown in `content/room/<id>.md` beside the record. A room whose `copy_status` is `draft` is marked `data-draft`, so `shell:check --cutover` fails until all seven are final.

## Considered
Leaving rooms to the ordinary lifecycle and release rules (a held room silently drops out of the index and breaks every link to it); rooms as sections of one page (no address to cite or link from an essay); each spec deriving membership itself (three places that can disagree about which layers are in a room); storing the room on maps and layers (a second place to keep in step with the essays, and ruled out in spec 003).

## Consequences
- The registry's room family grows three fields and one rule; `ROOM-SET` keeps the set at exactly seven.
- Specs 004 and 005 call the shared membership module instead of deriving rooms themselves; their tasks files note it.
- A map or layer no public essay uses is in no room, and appears under no room page.
- The spec 002 home page changes its room links from `/rooms/#<id>` to `/rooms/<slug>/`.
