# Pending Confluence entry: Decision Log (page 12648509)

Append after TC-D030 (see `decision-log-tc-d030.md`, also pending; TC-D028 and TC-D029 are already published). Not yet published: the session that wrote it had no Confluence write tool.

### TC-D031 — A Source points at one bibliography entry, citations are derived, and an entry is public only when a public record cites it

**Date:** 17 October 2026    
**Status:** Accepted

**Decision:** every Source points at exactly one bibliography entry (a finding aid is a Source flagged as one and is never cited as evidence). Citations are derived and never stored, by two routes: a record **lists** an entry in its `bibliography[]`, or **cites it as evidence** through essay → Evidence → Source → entry, carrying the locator and its verification state. An entry is public only when it is published, released and cited by at least one public record. Citation fields live only in the entry's CSL-JSON.

**Context:** spec 003 renders a claim citation from "the source's bibliography entry", but a Source had no link to an entry; the spec 006 draft proposed a stored Citation entity that overlapped spec 003's Evidence-based citations; and spec 006 required entries cited only by held content to stay hidden, which is stricter than "published and released" (TC-D019).

**Alternatives considered:** a stored Citation entity; merging Source and entry; listing every published entry regardless of citation; duplicating identifiers in the YAML.

**Consequences:**

- spec 006 amends spec 001's data model (Source `entry`, `bibliography[]` on datasets and layers, edition links) and adds four rules;
- the bibliography can never show an entry that nothing public cites, and "Cited in" lists public records only;
- the spec 008 adapter maps each legacy source to a Source with its `entry`, and legacy section types onto the seven sections; everything arrives held (extends TC-D024);
- the glossary no longer says a finding aid is not a source.

**Evidence:** [ADR 0014](https://github.com/vladsimion/terra-chartarum-next/blob/main/docs/adr/0014-bibliography-model.md); spec 006; Jira TCX-7. Extends TC-D003, TC-D018 and TC-D019.
