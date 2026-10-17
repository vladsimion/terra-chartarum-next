# Quickstart: validating the rooms

Prerequisites: Node 24, `npm ci`; for the site side, spec 002's shell and Playwright browsers.

```bash
npm test                                              # Vitest: room schema, ROOM-PUBLIC, ROOM-COPY, membership, room pages, the link check
npm run registry -- check --dir tests/rooms/fixtures/registry --out reports      # the hand-authored fixtures pass
REGISTRY_ROOT=tests/rooms/fixtures/registry npm run build                         # the Rooms index and seven room pages (fixtures on)
npm run shell:check                                   # lists the draft room introductions until they are final
npm run test:e2e                                      # keyboard, no JavaScript and axe on the Rooms pages
```

Expected: the fixtures validate; the index lists all seven rooms in order; the room with a primary and a secondary essay shows both groups, its maps and its layer; the room with no public essay shows the in-preparation line; the held essay, map and layer appear nowhere; the link check reports nothing for the build and fails on its deliberately broken page; `shell:check` lists seven draft rooms until `copy_status` is `final`.
