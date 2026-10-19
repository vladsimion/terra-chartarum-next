# Confluence entry: Decision Log (page 12648509)

Published 2026-10-19 in page version 16, directly after TC-D037; the rest of the page was left unchanged (checked by reading the page back). The text below is what was published.

### TC-D038 — Rooms are public by rule, one page each, and membership is derived once

**Date:** 17 October 2026 (ADR 0015); built 19 October 2026    
**Status:** Accepted (spec 007)

**Decision:** all seven rooms are published and released from the first commit (`ROOM-PUBLIC`, an error at every lifecycle); unfinished prose is marked by a `copy_status` field (`draft` or `final`), and `shell:check --cutover` fails until all seven are final. Each room has a page at `/rooms/<slug>/`, and the index is `/rooms/`; the home page, essay pages and the Atlas link to those addresses, and a former slug redirects. Which essays, maps and layers belong to a room is derived in one pure module, `src/rooms/membership.ts`, from the public essays that name the room as primary or secondary; a map or layer is in a room only through those essays, and nothing is stored on it. The room record's long description is the Markdown file beside it. A site-wide internal link and fragment check protects every page.

**Context:** ADR 0003 says all seven rooms are public at v1, but TC-D019 makes a record public only when an editor publishes and releases it, and a held room would silently drop out of the index and break every link to it. Specs 004 and 005 each planned to derive a map's or layer's rooms themselves, which would have given three places that could disagree. The home page linked to `/rooms/#earth`, which assumes one page of sections.

**Alternatives considered:** leaving rooms to the ordinary lifecycle and release rules; rooms as sections of one page (no address to cite or link); each spec deriving membership itself; storing the room on maps and layers (a second place to keep in step, and ruled out in spec 003).

**Consequences:**

- the room family gains `order`, `short_description` and `copy_status`, and two rules, `ROOM-PUBLIC` and `ROOM-COPY`; the repository holds seven draft rooms under `content/room/`;
- the Collection index and the Atlas index call `roomsOf` and the pages call `membership`, and a test fails if another module reads the room selection to derive membership (outside the registry and the essay modules that show an essay's own rooms);
- the author must finalise seven introductions before cutover.

**Evidence:** `docs/adr/0015-rooms.md`, `src/rooms/membership.ts`, `tests/rooms/unit/one-derivation.test.ts`, `tests/rooms/unit/atlas-agreement.test.ts`, PRs #75, #78, #79, #80; Jira TCX-8, TCX-42, TCX-43. Refines TC-D019 for rooms; extends ADR 0003 §7 and TC-D004.
