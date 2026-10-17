# Pending Confluence entry: Decision Log (page 12648509)

Append after TC-D027, before nothing else. Not yet published: the session that wrote it had no Confluence write tool.

### TC-D028 — A map record describes one witness; every displayed field has a status; the public repository holds no private acquisition data

**Date:** 17 October 2026    
**Status:** Accepted

**Decision:** a Map object record describes one witness of a map, `held` or `institutional`; every displayed field of it carries an explicit status (`recorded`, `not_applicable`, `not_yet_verified`, `unknown`) and a held witness's provenance also says whether it was observed or inferred; image sources are embedded in the record; and no price, vendor contact or negotiation data is ever committed to the public repository.

**Context:** spec 004 needs a rich map record in which a blank is never presented as complete and held objects are told apart from institutional copies everywhere. The registry's family list is closed and it rejects unknown fields, so the shape had to be fixed before the schema grew. The repository is public, so "never public" cannot rest on a display rule (extends TC-D023).

**Alternatives considered:** one record with several witnesses; a sentinel string such as "unknown" in each empty field; an image-source family; keeping price data in a private branch or file.

**Consequences:**

- spec 004 amends spec 001's data model in its Foundation phase and adds nine rules (field status, basis, verification, image, attribution, dealer-only support, held maker, private field names, cartographer kind);
- the spec 008 adapter maps each legacy catalogue record to one witness record, sets `not_yet_verified` for missing fields, and imports them held; releasing the 59 is a deliberate editor act (extends TC-D024);
- a public map requires its makers to be public; "where used" is derived and lists public referrers only (extends TC-D019).

**Evidence:** [ADR 0011](https://github.com/vladsimion/terra-chartarum-next/blob/main/docs/adr/0011-map-record-model.md); spec 004; Jira TCX-5; PR #24. Extends TC-D019, TC-D023 and TC-D024.
