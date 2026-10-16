# Contract: destinations, navigation and breadcrumbs

`src/shell/destinations.ts` is the only list of destinations. The header, footer, breadcrumbs, generated stub routes and the build check read it.

## Header
Exactly seven items, in this order, each with a lens meaning: **Essays** (argument) · **Rooms** (curatorial structure) · **Atlas** (space and time) · **Collection** (objects) · **Cartographers** (makers) · **Bibliography** (evidence) · **About** (identity). A change needs a constitution-level ADR (FR-001).

## Footer
Links Colophon, Atlas Handbook, licences (the `#licences` section of the Colophon) and About.

## Rendering
- The current section's item carries `aria-current="page"` and, so state is not colour alone, a visible text-weight and underline change.
- Below the width breakpoint the list is a `<details><summary>` disclosure with a 44 px summary; above it, a plain list. No script is loaded for navigation.
- No site search appears in the header (ADR 0008).

## Stubs
A destination with `status: "stub"` is generated as a page from `StubPage.astro`, carries `data-stub="<id>"`, and shows "in preparation". A destination's owner replaces the stub with a real page and sets `status: "built"` in the same commit.

## Breadcrumbs
`breadcrumbs(path, destinations, title)` returns items from the lens down to the page, or an empty list for `/` and the seven lens landings. Rendered as `<nav aria-label="Breadcrumb"><ol>…</ol></nav>`, the last item `aria-current="page"` and not a link.

## Invariants (tested)
Exactly seven header entries in order; unique `href` values; every `built` entry has a page and every `stub` entry has none.
