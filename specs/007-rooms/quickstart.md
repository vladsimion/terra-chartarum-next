# Quickstart: validating the rooms

Prerequisites: Node 24, `npm ci`; for the site side, spec 002's shell and Playwright's Chromium (`npx playwright install chromium`).

```bash
npm test                                                                          # Vitest: room schema, ROOM-PUBLIC, ROOM-COPY, membership, room pages, the Atlas agreement, the leak test, the link check
npm run registry -- check --dir tests/rooms/fixtures/registry --out reports      # the hand-authored fixtures pass the gate
npm run registry -- check --out reports                                          # the repository's own seven rooms pass too
REGISTRY_ROOT=tests/rooms/fixtures/registry ASTRO_OUT_DIR=/tmp/roomsdist npm run build   # the Rooms index and seven room pages
npm run registry -- scan /tmp/roomsdist --dir tests/rooms/fixtures/registry       # the output leaks nothing
npm run shell:check -- --dist /tmp/roomsdist                                       # lists the draft room introductions
npm run test:e2e:rooms                                                             # keyboard, no JavaScript, touch targets and axe
```

Expected:
- The fixtures validate (38 entities, no errors, no warnings); the repository's seven rooms validate (7 entities).
- The build writes `rooms/index.html` and `rooms/<name>/index.html` for each of the seven rooms.
- The index lists all seven rooms in order. The Map room shows its primary and its secondary essay, its two maps and its four layers; Road and Border show their essays; the other four rooms show the in-preparation line and no empty group.
- The held essay, the held layer, the layer in build and the map only the held essay uses appear on no page, in no redirect and in no relation; the scan reports 0 leaks.
- The link check (part of `npm test`) reports no dead link or fragment on any of the five fixture sites, and its own tests show it fails on a broken folder.
- `shell:check` lists the index and seven room pages as draft until each room's `copy_status` is `final`.
