# Confluence entry: Decision Log (page 12648509)

Published 2026-10-17 as page version 11, directly after TC-D028; the rest of the page was left unchanged (checked by reading the page back). The text below is what was published.

### TC-D029 — The successor is hosted as a Cloudflare Worker serving static assets only; the archive stays on Pages

**Date:** 17 October 2026    
**Status:** Accepted

**Decision:** the successor site is deployed as a Cloudflare Worker serving static assets only (no Worker script, no server adapter, no bindings), configured by a `wrangler.jsonc` that serves `./dist` with `404.html` for unmatched paths and built with a pinned `wrangler`; the frozen archive stays a Pages project at terra-chartarum.pages.dev.

**Context:** ADR 0005 chose a new Cloudflare Pages project. The project was created as a Worker with Workers Builds instead, and its deploy step, finding no Wrangler configuration, tried to install a server-rendering adapter and failed. Cloudflare now steers new projects to Workers with static assets; Pages remains supported.

**Alternatives considered:** recreating the project as Pages, as ADR 0005 was written; letting Wrangler install the Cloudflare adapter, which adds server rendering the site does not need.

**Consequences:**

- the site stays static output only; a Worker script, bindings or any runtime logic is dynamic infrastructure and needs its own decision (extends TC-D013);
- `_headers` and `_redirects` are honoured as before; the `*.workers.dev` address must carry `noindex` until cutover (spec 008);
- at cutover terra-chartarum.org is attached as a custom domain on the Worker; archive redirects still live in the archive project;
- the constitution moves to 1.0.1 (hosting line reworded).

**Evidence:** [ADR 0012](https://github.com/vladsimion/terra-chartarum-next/blob/main/docs/adr/0012-hosting-workers-static-assets.md) (amends ADR 0005 §3); Jira TCX-44; [PR #27](https://github.com/vladsimion/terra-chartarum-next/pull/27). Extends TC-D013.
