# ADR 0013 — Atlas contracts: strict public listing, the address as the only saved state, derived rooms, assets built from sources

**Status**: Accepted · **Date**: 2026-10-17 · **Jira**: TCX-6 · **Spec**: 005 · **Amends**: ADR 0002 (consequence about CND visibility), spec 005 edge case on a "data catalogue view"; **Extends**: TC-D019, ADR 0006

## Context
Spec 005 describes layers at lifecycle `proposed` to `publishable` shown "in a data catalogue view", and ADR 0002 says CND is "visible in the data catalogue" while in preparation. TC-D019, decided later, says only a record that is both `published` and `released` is public. The spec also asks readers to share an exact view, to browse layers by Room (which spec 003 made essay-only), and to load layer data lazily from a static host with a per-file size limit.

## Decision
- **Public means published and released, with no exception for the Atlas.** The Atlas, its catalogue index and every payload list only published, released layers with a runnable asset. There is no public "in preparation" listing; CND is mentioned only in prose. The spec's data-catalogue edge case and ADR 0002's consequence are amended to match.
- **The address is the only saved state.** An Atlas view (year, active layers, focused layer, lens, collection context, per-layer facets) is written to the query string of `/atlas/` using public slugs. A retired slug resolves through the slug history baked into a small build-time table; an unknown slug is skipped and reported. Stable IDs never appear in a view address, and nothing is kept in `localStorage`.
- **One module builds and reads view addresses**, shared by the Atlas and by every "Open in Atlas" link, so a link and the Atlas cannot disagree.
- **Rooms of a layer are derived**, from the rooms of the public essays that list it in `layers[]`. No room is stored on a layer or collection. Curated room membership, if wanted, belongs to spec 007.
- **Layer assets are built from sources kept in the repository.** GeoJSON or GeoPackage sources are converted at build time to FlatGeobuf (range-requested) or PMTiles into the static output. An asset over the host's per-file limit is a build error. There is no storage bucket in v1; adding one needs its own ADR.

## Considered
A public data-catalogue listing of unpublished layers (contradicts TC-D019 and widens the leak surface); view state in `localStorage` or hash fragments (not shareable, or invisible to a static host); stable IDs in view addresses (would expose the ID of a held layer to anyone who pastes one); rooms stored on layers (a second place to keep in step with the essays that use them); a storage bucket for large layers from the start (dynamic infrastructure for a need v1 does not have).

## Consequences
- The registry's public projection and the build scan already hold the line; the Atlas adds no listing path of its own.
- A shared Atlas address survives a layer being renamed, and degrades to the remaining layers when one is retired.
- A layer no public essay uses has no room, and browsing by Room shows nothing for it.
- When a layer outgrows the repository, a bucket becomes a decision with an ADR, not a drift.
