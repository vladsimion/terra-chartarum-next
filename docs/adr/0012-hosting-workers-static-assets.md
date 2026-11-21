# ADR 0012 — Host the successor as a Cloudflare Worker serving static assets

**Status**: Accepted · **Date**: 2026-10-17 · **Jira**: TCX-44 · **Amends**: ADR 0005 §3 (hosting); constitution Technical Constraints (hosting line)

## Context
ADR 0005 chose a new Cloudflare Pages project for terra-chartarum-next. The project was created through the dashboard as a Worker with Workers Builds instead. Its first build succeeded, but `npx wrangler deploy` found no Wrangler configuration and tried to set the project up itself by running `astro add cloudflare` (a server-rendering adapter), which failed. Cloudflare now steers new projects to Workers with static assets; Pages remains supported.

## Decision
1. The successor is deployed as a **Cloudflare Worker serving static assets only**: no Worker script, no server adapter, no bindings. `wrangler.jsonc` at the repository root points `assets.directory` at `./dist` and serves `404.html` for unmatched paths.
2. `wrangler` is a pinned devDependency, so builds do not fetch an unpinned copy.
3. The site remains **static output only** (Principle VII unchanged). Adding a Worker script, bindings or any runtime logic is dynamic infrastructure and needs its own ADR.
4. Unchanged from ADR 0005: production domain **terra-chartarum.org**, attached at cutover; the **archive stays a Pages project** at terra-chartarum.pages.dev (§4), with redirects in the archive project.

## Alternatives considered
Delete the Worker and recreate it as a Pages project (matches ADR 0005 as written, but stays on the platform Cloudflare is moving away from); let Wrangler install the Cloudflare adapter (adds server rendering the site does not need).

## Consequences
- `_headers` and `_redirects` in `public/` are honoured by Workers static assets, so the pre-cutover `noindex` header and any redirects work as planned.
- Non-production branches get Workers Builds preview URLs; the `*.workers.dev` hostname must carry `noindex` until cutover (spec 008).
- Cutover attaches terra-chartarum.org as a custom domain on the Worker rather than on a Pages project.
- Constitution PATCH bump to 1.0.1: the hosting line now reads "Cloudflare (Workers static assets for the successor; Pages for the frozen archive)".

## Amendment, 19 November 2026: the custom domain is declared in `wrangler.jsonc`

Decided while preparing cutover step 7. The custom domain of consequence three is attached through the `routes` key in `wrangler.jsonc`, with `custom_domain: true`, and never in the dashboard. Cloudflare does not merge the two: a dashboard-defined route is not added alongside a Wrangler-defined one, and Wrangler overrides dashboard routes on the next deploy. Workers Builds runs `wrangler deploy` on every push to `main`, so a domain attached by hand would be dropped by the next merge.

Two things follow, and one of them revises consequence two:

- Declaring routes makes Wrangler infer `workers_dev = false`. The `*.workers.dev` hostname therefore stops serving at cutover rather than carrying `noindex`, which is the stronger form of what consequence two asked for and what spec 008 wanted; no `public/_headers` file was ever added for it. Branch Preview URLs and Version URLs are not affected, so Workers Builds previews keep working.
- The configuration cannot be merged before the zone is active on Cloudflare. A Custom Domain cannot be created on a zone the account does not own, and terra-chartarum.org was delegated to Wix (`ns0`/`ns1.wixdns.net`) until cutover, so an early merge would fail the Workers Build on `main`.
