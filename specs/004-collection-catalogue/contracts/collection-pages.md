# Contract: collection and cartographer pages

Pages are generated only for public records (published and released). A held record generates no page, no index entry and no link.

## Addresses

| Page | Address |
|---|---|
| Collection list | `/collection/` |
| Map record | `/collection/<slug>/` (a former slug redirects, ADR 0006) |
| Cartographer list | `/cartographers/` |
| Cartographer profile | `/cartographers/<slug>/` |
| Filter index | `/data/collection-index.json` |

## Map record page

Order: title (normalised) with original title; witness label ("Held by this project" or "Institutional copy: <repository>"); verification and last verified; the image block; the field list; attribution with its evidence; the record's open questions when it has any; where used; bibliography; citation and export.

- **Field list**: each displayed field is a row with the field name, the value or the explicit status text (`Not yet verified`, `Unknown`, `Not applicable`), and for a held witness's provenance and atlas context an `Observed` or `Inferred` label.
- **Image block**: the static image with attribution and licence, and an "Open viewer" button. The button loads the viewer on activation. If the record's rights do not clear reproduction, no image is shown and the block says the image is withheld; the licence line is shown only when a licence exists.
- **Viewer**: keyboard (arrow keys pan, `+`/`-` zoom, `0` resets), touch pinch and drag, mouse wheel and drag; animation off under `prefers-reduced-motion`; on load failure the static image stays and a message says the viewer is unavailable. Without JavaScript the block links to the institution's own viewer (`images[].url`'s `info.json` is not linked; the record's `repository` link or the image `static_url` page is).
- **Attribution**: a maker links to its profile when the cartographer is public. An `unresolved` attribution says "Maker not individually established" and names the workshop.
- **Where used**: three lists (essays, Atlas layers and overlays, places), each hidden when empty; public referrers only.
- **Citation**: spec 003's control, with the map record as input (CSL type `map`).

## Collection list page

Static HTML of every public map: thumbnail (only if cleared), title, maker, date label, witness label. A filter form (cartographer, date range from/to, region, room, witness kind) and a sort control (`date` default, `title`, `maker`) are present with and without JavaScript; without JavaScript the form submits as a GET to the same page and the list stays complete. With JavaScript, `filters.client.ts` loads the index, applies the filters and sort, and writes them to the query string.

### Query string

`cartographer=<id>` (repeatable), `from=<year>`, `to=<year>`, `region=<place id>` (repeatable), `room=<room id>` (repeatable), `witness=held|institutional`, `sort=date|title|maker`. An unknown key or value is ignored. The same query on a fresh load gives the same view.

### Index entry

`{ id, slug, title, makers: [{ id, name }], date_label, from, to, uncertain, regions: [place id], rooms: [room id], witness }`. Entries are ordered by default sort. No other field. `makers` holds exact makers only: a map whose attribution is `unresolved` has none (FR-011), so a workshop is never a filter choice or a sort key and the list says "Maker not individually established".

## Cartographer pages

- **List**: public cartographers by name; a cartographer with no public maps still has a page and a line saying so.
- **Profile**: names, roles, dates or activity, the biography from `<id>.md` when present, the public maps with `attribution: exact` linking to this cartographer, the public essays that use those exact maps (never essays that use only a workshop's unresolved maps), and bibliography. A workshop page says which maps are attributed to the workshop and are unresolved.

## Leak rule

Nothing about a held essay, a held cartographer or a private acquisition field may appear in any page, JSON file or URL (SC-005, tested on the built output).
