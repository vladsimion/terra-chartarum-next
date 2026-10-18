# Confluence entry: Decision Log (page 12648509), not yet published

### TC-D??? — Only the collection pages may ship script, and only the filters and the viewer loader

**Date:** 18 October 2026    
**Status:** Accepted (spec 004 US1 and US2)

**Decision:** the shell's rule that a built page carries no script is narrowed to what it is meant to catch. Pages under `/collection/` may carry one module script (the deep-zoom viewer's loader on a record, the filters on the list); the viewer library is a separate chunk fetched only on activation. Every other page, a server entry (`_worker.js`) and any other script file still fail the static-output check, and the no-JavaScript spec allows at most one module script on a collection page.

**Context:** spec 002 FR-008 and its no-JavaScript spec assert zero `<script>` on every listed page. Spec 004 needs a viewer that loads only on request and filters that apply in place; neither can exist without script. The first collection merge made the `gate` red because the two rules disagreed.

**Alternatives considered:** leaving the spec at zero (no viewer, no in-place filters); a page-by-page opt-in list in code (more places to keep in step); loading the viewer from a separate page.

**Consequences:**

- the first-load script of a record is 1.9 KB gzipped; the library is 86.8 KB gzipped and loaded on click, so the ADR 0004 budget is measured on the first load;
- every collection page still works without JavaScript: the list stays complete, the form submits as a GET, and the image has a plain link;
- a future feature that needs script must be added to the allow-list by name, in a reviewed change.

**Evidence:** `tests/shell/support/static-output.ts` (`COLLECTION_VIEWER`), `tests/shell/e2e/no-js.spec.ts`, PR #47; Jira TCX-28, TCX-29. Refines spec 002 FR-008.
