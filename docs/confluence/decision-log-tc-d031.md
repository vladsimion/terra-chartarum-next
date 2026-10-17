# Pending Confluence entry: Decision Log (page 12648509)

Append after TC-D030 (see `decision-log-tc-d030.md`; TC-D028 and TC-D029 are also pending). Not yet published: the session that wrote it had no Confluence write tool.

### TC-D031 — The seven rooms are public by rule, each has a page, and membership is derived in one place

**Date:** 17 October 2026    
**Status:** Accepted

**Decision:** all seven room records must be published and released (a registry error otherwise); unfinished room prose is marked by a `copy_status` field, not by holding the room. The Rooms index is `/rooms/` and each room is `/rooms/<slug>/`. A room's essays (primary first, then secondary), maps and layers are derived by one module that the Rooms pages, the Collection room filter and the Atlas Room lens all call; maps and layers are in a room only through the public essays that use them.

**Context:** ADR 0003 says all seven rooms are public at v1, but TC-D019 makes public-ness an editor's per-record choice; spec 003 made rooms essay-only; specs 004 and 005 each planned their own derivation; the home page assumed rooms were sections of one page.

**Alternatives considered:** the ordinary lifecycle and release rules for rooms; rooms as sections of one page; each spec deriving membership itself; a room field on maps and layers.

**Consequences:**

- the room family gains `order`, `short_description` and `copy_status` and two rules (`ROOM-PUBLIC`, `ROOM-COPY`);
- the three views of room membership cannot disagree; a map or layer no public essay uses is in no room;
- `shell:check --cutover` fails until all seven introductions are final;
- the home page's room links move from `/rooms/#<id>` to `/rooms/<slug>/`.

**Evidence:** [ADR 0015](https://github.com/vladsimion/terra-chartarum-next/blob/main/docs/adr/0015-rooms.md); spec 007; Jira TCX-8. Refines TC-D019 for rooms; extends TC-D004.
