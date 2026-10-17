# Contract: room pages and the link check

## Addresses

| Page | Address |
|---|---|
| Rooms index | `/rooms/` |
| Room page | `/rooms/<slug>/` (`earth`, `map`, `city`, `border`, `road`, `archive`, `theatre`; a former slug redirects) |

Breadcrumbs read Home › Rooms › Earth. The `rooms` destination in `destinations.ts` becomes `built`.

## Rooms index

All seven rooms in canonical order, each as a link to its page with its name and short description. A room whose `copy_status` is `draft` is marked `data-draft` (on its card) so `shell:check` can list it.

## Room page

Order: the room's name as the heading; the introduction (the long description, rendered Markdown) inside a wrapper marked `data-draft` while `copy_status` is `draft`; then, each hidden when empty:

1. **Essays**: "Primary" then "Secondary" sub-groups, each in title order, each essay linking to its page.
2. **Maps**: linking to their Collection record pages.
3. **Layers**: linking to the Atlas view with that layer active, built by spec 005's view-address module.

A room with no public essay replaces the Essays group with the line "Essays for this room are in preparation." and no link. Nothing about a held essay, map or layer appears.

## Links to rooms from elsewhere

The home page's rooms list links to `/rooms/<slug>/`. An essay page's room links (spec 003 `RoomLinks`) and the Atlas Room lens use the same addresses.

## The site-wide link check (`tests/shell/support/links.ts`)

`checkLinks(distDir)` returns `{ page, href, reason }[]` for every internal link that does not resolve (research R2): a missing page, a missing fragment id, or a malformed address. External links, `mailto:`, `tel:` and `data:` are ignored. `tests/shell/build/links.test.ts` expects an empty list for the real build and a non-empty list for a deliberately broken fixture page, so the check is proved able to fail. A path covered by `_redirects` counts as resolved.
