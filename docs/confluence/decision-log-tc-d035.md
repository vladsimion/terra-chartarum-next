# Confluence entry: Decision Log (page 12648509)

Published 2026-10-19 in page version 14, directly after TC-D034; the rest of the page was left unchanged (checked by reading the page back). The text below is what was published.

### TC-D035 — A map may be published with an image it cannot show; the page withholds it

**Date:** 18 October 2026    
**Status:** Accepted (spec 004 US1, scenario 5)

**Decision:** `RIGHTS-CLEARED` no longer applies to the map family. A map record with images whose reproduction is not cleared (`rights.reproduction_cleared` not true) may be published and released; its page shows the metadata and no image, says why, and never puts the image address in the page. The rule stays as it was for layers and every other family.

**Context:** spec 004 requires that "a record whose images are not cleared for reproduction shows no image, shows the metadata and says why", and its data model calls this "behaviour, not a gate error". `RIGHTS-CLEARED` (an error at `publishable` for any record with images) made that record unpublishable, so the two requirements could not both hold.

**Alternatives considered:** keeping the rule and holding such records (the record would not be public, so the metadata could not be shown); removing the images from the record until cleared (loses the holder, the address and the licence the editor has already recorded).

**Consequences:**

- an uncleared map is public and visible in the list, with no thumbnail; its page withholds the image (tested: no `<img>`, no address in the HTML);
- the guarantee that an uncleared image is never shown now rests on the page, not the gate (Constitution VI is kept where the image would be shown);
- layers and other families still need cleared reproduction before they are published.

**Evidence:** spec 004 `data-model.md` "Image source" and US1; `tests/collection/build/map-page.test.ts`; Jira TCX-28. Refines TC-D019 for maps.
