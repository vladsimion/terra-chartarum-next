# Research: Rooms (Curatorial Paths)

Decisions not already settled by the grill (ADR 0015) or ADR 0003.

## R1. What counts as "a map or layer used by a room's essays"
- **Decision**: a map is in a room when a public essay whose `rooms.primary` or `rooms.secondary[]` is that room lists the map in `maps[]`. A layer is in a room the same way through `layers[]`. An essay's own place in the room (primary or secondary) does not change where its maps and layers appear; they are one group each.
- **Rationale**: it follows the only stored fact (an essay's declared rooms) and the two lists essays already carry; showing a primary/secondary split for maps and layers would imply a ranking nobody authored.
- **Alternatives**: primary-only (hides a map used by an essay that is secondary in the room); a room field on maps and layers (ruled out in spec 003).

## R2. How the link checker resolves links
- **Decision**: parse every `.html` file in the built output with `node-html-parser`; collect each page's element ids; for every `<a href>` that is not external (`http(s):` to another origin), `mailto:`, `tel:` or `data:`, resolve against the page's address, map a directory address to its `index.html` and a file address to the file, and require the target to exist; for a `#fragment`, require the id on the target page. A link to a path covered by `_redirects` counts as resolved. The checker returns a list of `{ page, href, reason }` and the test expects it empty.
- **Rationale**: static output makes resolution a file-system question; checking the whole site costs a second and protects every spec.
- **Alternatives**: a crawler against a preview server (slower, needs a port); checking only room pages (leaves every other page unprotected).

## R3. Existing room fixtures must change
- **Decision**: every room fixture in `tests/registry/fixtures/` and `tests/shell/fixtures/registry/` is `lifecycle: researching`, `release: held`. `ROOM-PUBLIC` would make them errors, so they become `published` and `released` with `order`, `short_description` and `copy_status` in the same change that adds the rule, and each gets a body file where a test reads it.
- **Rationale**: the rule is true of the real registry from the first commit; fixtures should model that.
- **Alternatives**: exempting fixtures from the rule (a rule with a test-only exception can rot).

## R4. Loading the Markdown body
- **Decision**: the registry loader reads `content/room/<id>.md` as the record's computed `body` (the field `FAM-UNKNOWN` already exempts for essays), exactly as it does or will for cartographers and essays; if a sibling spec has not yet added a generic body loader, this spec's first task adds it for the `room` family.
- **Rationale**: one loader behaviour for every family with prose.
- **Alternatives**: reading the file in the page (bypasses the public projection).

## R5. The layers group uses spec 005's view addresses
- **Decision**: layers on a room page link to the Atlas view with that layer active, built by `viewUrl` from spec 005's view-address module, which is merged. The Layers group ships with the rest of US1.
- **Rationale**: one module owns view addresses (ADR 0013); a second builder would let them drift.
- **Alternatives**: a plain `/atlas/` link (loses the layer); duplicating the builder.

## R6. Placeholder copy
- **Decision**: each room's short description is one plain sentence naming the idea; each long description is two short paragraphs of neutral placeholder prose ending with a sentence that the author's text will replace it. All seven carry `copy_status: draft`.
- **Rationale**: the pages must read honestly on a preview build while making it impossible to ship unfinished text (`shell:check --cutover`).
- **Alternatives**: lorem ipsum (reads as broken); no copy (empty pages).
