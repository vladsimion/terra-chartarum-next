# Confluence entry: Decision Log (page 12648509)

Published 2026-10-19 in page version 14, directly after TC-D033 and together with TC-D035 and TC-D036; the rest of the page was left unchanged (checked by reading the page back). The text below is what was published.

### TC-D034 — The Atlas lists only what is published and released; the address is its only saved state

**Date:** 17 October 2026 (ADR 0013), reconciled 19 October 2026    
**Status:** Accepted (spec 005, Jira TCX-6)

**Decision:** an Atlas layer, collection or place is listed, fetched or named in an address only if it is both `published` and `released`; there is no data-catalogue exception for held material. The shared view address (`?y=…&l=slug,slug&hide=…&lens=…&c=…&facet.…`) is the only saved state, built from public slugs, and a slug that is retired resolves through its history while one that is held or unknown is skipped without saying whether it exists. A layer's rooms are derived from the public essays that use it, never stored. Layer files are built from sources in the repository, with a size gate against the host's per-file limit, and the build writes nothing unless every check and the output leak scan pass.

**Context:** spec 005 needed the Atlas to be useful for composing a view and sharing it without becoming a second way to learn that held records exist. The earlier text allowed a "data catalogue view" of unreleased layers; ADR 0002 implied CND visibility. Both would put held names in payloads and addresses.

**Alternatives considered:** a catalogue view that lists held layers as locked (leaks their existence and titles); saved views or accounts (a server and personal data, against the static-host constitution); a storage bucket for layer files (no need under the host's 25 MiB per-file limit in v1).

**Consequences:**

- the Atlas build reads the public projection only and the leak scan runs over its files as well as the pages (held layer, collection, place and essay ids, slugs, retired slugs, titles and names, and private values);
- a published layer or place needs the new Atlas fields (`theme`, `envelope`, `time_mode`, `facets`; `names`, `location`) and spec 008's import must supply them; the source path `asset` is no longer public;
- CND stays held and unlisted; the Atlas ships with fixture layers and spec 008 imports the real Roman Dacia layers.

**Evidence:** ADR 0013; spec 005 `spec.md` FR-003, FR-011, FR-012, SC-005 and `contracts/view-address.md`; `tests/atlas/build/leak.test.ts`, `tests/atlas/unit/view-url.test.ts`; Jira TCX-6, TCX-33 to TCX-38, TCX-49. Amends TC-D019 for layers and places; amends ADR 0002 on CND visibility.
