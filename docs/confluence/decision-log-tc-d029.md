# Pending Confluence entry: Decision Log (page 12648509)

Append after TC-D028 (see `decision-log-tc-d028.md`, also pending). Not yet published: the session that wrote it had no Confluence write tool.

### TC-D029 — The Atlas lists only public layers, keeps its state in the address, and derives rooms from essays

**Date:** 17 October 2026    
**Status:** Accepted

**Decision:** the Atlas, its catalogue index and every payload list only layers that are both `published` and `released` with a runnable asset; there is no public "in preparation" listing. An Atlas view (year, active layers, focused layer, lens, collection, facets) is saved only in the query string of `/atlas/`, using public slugs resolved through slug history, and nothing in `localStorage`. A layer's rooms are derived from the public essays that list it. Layer assets are built from sources kept in the repository, with a file-size gate and no storage bucket in v1.

**Context:** spec 005 described a "data catalogue view" of unpublished layers and ADR 0002 said CND would be "visible in the data catalogue", which contradicts TC-D019 (public means published and released). The spec also needs shareable views on a static host, room browsing for layers (spec 003 made rooms essay-only), and a way to serve layer data from Workers static assets (ADR 0012).

**Alternatives considered:** a public listing of unpublished layers; view state in `localStorage` or a fragment; stable IDs in view addresses (would expose the ID of a held layer); rooms stored on layers; a storage bucket from the start.

**Consequences:**

- ADR 0002 is amended: CND stays held and appears nowhere public until it is published;
- a shared Atlas address survives a layer being renamed and degrades to the remaining layers when one is retired;
- a layer no public essay uses has no room, and browsing by Room shows nothing for it;
- when a layer outgrows the repository, a bucket becomes a decision with its own ADR.

**Evidence:** [ADR 0013](https://github.com/vladsimion/terra-chartarum-next/blob/main/docs/adr/0013-atlas-contracts.md); spec 005; Jira TCX-6. Extends TC-D019 and TC-D023; amends the consequence of ADR 0002.
