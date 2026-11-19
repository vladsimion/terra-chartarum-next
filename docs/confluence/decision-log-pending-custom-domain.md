# Confluence entry: Decision Log (page 12648509)

Not yet published. Numbered when it is (`docs/confluence/README.md`).

### TC-D??? — terra-chartarum.org is declared in `wrangler.jsonc`, not attached in the dashboard, and step 4 of the cutover follows step 7

**Date:** 19 November 2026    
**Status:** Proposed · **Amends:** TC-D029 (consequence two), ADR 0012

**Decision:** the production domain is attached to the Worker through the `routes` key in `wrangler.jsonc`, with `custom_domain: true`, and never through the Cloudflare dashboard. The configuration is merged only after the zone is active on Cloudflare. In `docs/cutover.md`, step 4 (the redirect file applied to the archive project) moves to after step 7 (the custom domain), and the `redirect_switched` signature becomes the last thing in step 4.

**Context:** preparing cutover step 7 turned up two ordering faults. First, Cloudflare does not merge dashboard-defined and Wrangler-defined routes: a dashboard route is not added alongside a Wrangler one, and Wrangler overrides dashboard routes on the next deploy. Workers Builds runs `wrangler deploy` on every push to `main`, so a domain attached by hand in the dashboard would be dropped by the next merge — a production outage with no commit behind it. Second, `docs/cutover.md` as written ordered steps 1 to 5 before step 7, but every rule in `archive/_redirects` targets `https://terra-chartarum.org/…`. Applying the redirect file before the domain was attached would have sent all 25 rules to a host the project did not serve: terra-chartarum.org was delegated to Wix and served a ConnectYourDomain error.

**Alternatives considered:** attaching the domain in the dashboard and adding `workers_dev = false` with no `routes` key, which the Cloudflare deprecation notes give as the way to manage routes from the dashboard alone — rejected because it puts the production hostname outside the repository, where no review or history covers it, against the principle that the repository is canonical. Leaving the cutover order as written and accepting a redirect window into a dead host — rejected: the window is the moment every inbound scholarly link is exercised.

**Consequences:**

- declaring routes makes Wrangler infer `workers_dev = false`, so the `*.workers.dev` hostname retires at cutover instead of carrying `noindex` as TC-D029 and spec 008 expected; no `public/_headers` file was ever added for that, so nothing is removed. Branch Preview URLs and Version URLs are unaffected and Workers Builds previews keep working;
- the configuration PR must be held until the zone is active on Cloudflare: a Custom Domain cannot be created on a zone the account does not own, so an early merge fails the build on `main`;
- the Wix delegation of terra-chartarum.org must move to Cloudflare before step 7 at all, which TC-D029 did not anticipate: Workers, unlike Pages, supports no domain whose nameservers are managed elsewhere;
- `www.terra-chartarum.org` needs its own decision. It is a CNAME to the archive today, so the frozen edition would otherwise serve the production domain.

**Evidence:** [ADR 0012](https://github.com/vladsimion/terra-chartarum-next/blob/main/docs/adr/0012-hosting-workers-static-assets.md), amended; [`wrangler.jsonc`](https://github.com/vladsimion/terra-chartarum-next/blob/main/wrangler.jsonc); [`docs/cutover.md`](https://github.com/vladsimion/terra-chartarum-next/blob/main/docs/cutover.md). Amends TC-D029.
