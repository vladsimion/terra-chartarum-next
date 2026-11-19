# Cutover checklist

The list the editor works through before terra-chartarum.org replaces the archive as the public site (spec 008, ADR 0005, ADR 0016). The automated part is `npm run cutover:check`; every manual step is signed with a name and a date in the table at the end. The domain is attached only after steps 1, 2, 3, 5 and 6 are signed and the automated check passes. Step 4 follows it, not precedes it: every rule in `archive/_redirects` targets `https://terra-chartarum.org/…`, so applying the redirect file before the domain is attached would send each old URL to a host the project does not serve yet.

## Automated: `npm run cutover:check`

Run it twice: first to see what is left, and last, after the final copy is in, as the gate for the domain. It needs a production build (`npm run build`), the committed `migration/redirect-inventory.json` and `archive/_redirects`, and the `gh` CLI signed in (the only network use).

| # | Step | Fails when |
|---|---|---|
| 1 | Integrity gate over the real registry | any gate error or load error |
| 2 | Stub pages and draft copy (`shell:check --cutover`) | any page still carries a stub or draft marker |
| 3 | Links over the production build | an internal link or fragment resolves to nothing |
| 4 | Redirect file against the inventory | an inventory URL with a rule outcome has no rule, a rule is not in the inventory, two rules share a path, or a target is not a built page |
| 5 | Lighthouse budgets | the `registry` workflow run for this commit is absent, not finished, or not green, or `gh` is missing |
| 6 | The v1 anchor essay (Terra Sigillata · Lapidarium Dacicum, slug `dacia-lapidarium`) | its record is missing, or not `published` and `released` (`--anchor <slug>` names a different slug) |

It prints each step and, under each failed one, the page, URL or rule. Exit 0 means every step passed, 1 that at least one failed, 2 that an input is missing. On the real registry it is expected to fail until the author finalises the room introductions and publishes the anchor essay.

## Manual, each with a sign-off

1. **Baseline recorded** before the freeze: `npm run baseline -- <url> …` against the live site's key templates (home, an essay, a collection record, the Atlas, the bibliography, a cartographer); commit `docs/baseline/live-site-<date>.json`. If Chrome does not start ("waiting for dynamic debugging port"), set `CHROME_PATH` to a browser that runs on the machine, for example the Chromium Playwright installed under `~/Library/Caches/ms-playwright/`.
2. **Archive patch applied** to the archive project and deployed: the banner, the `noindex` header and the link to terra-chartarum.org (`archive/README.md` says where each file goes).
3. **`npm run archive:check -- <url> …`** passes against a sample of archive URLs.
4. **Redirect file applied** to the archive project by pull request, reviewed, and `redirect_switched` signed on each rebuilt essay record.
5. **Image rights**: every image shown at cutover has been cleared by the editor, or is withheld.
6. **Final copy**: the author's text replaces the placeholders (step 2 of the automated check proves none remain).
7. **Custom domain** terra-chartarum.org attached to the Worker (ADR 0012), through the `routes` key in `wrangler.jsonc` and never in the dashboard: a dashboard-defined route is not added alongside a Wrangler-defined one, and Wrangler overrides dashboard routes on the next deploy, so Workers Builds would drop a domain attached by hand on the next push to `main`. The zone must be active on Cloudflare before the configuration is merged, because a Custom Domain cannot be created on a zone the account does not own; `terra-chartarum.org` was delegated to Wix until cutover. Declaring routes makes Wrangler infer `workers_dev = false`, which retires the `*.workers.dev` hostname rather than leaving it to carry `noindex`; branch Preview URLs are unaffected.
8. **After the switch**: a sample of old URLs is opened and lands where the inventory says.

### Before step 7: the domain has to leave Wix

Step 7 is not reachable from where the domain sits today, and the reason is a registrar restriction rather than anything in this repository. Established by investigation in the archive project (its `docs/launch-runbook.md` §1a, written 28 August 2026) and re-verified on 19 November 2026:

- **Wix does not permit nameserver changes on a Wix-registered domain.** Wix says so directly, and Cloudflare documents the same class of provider: platforms that are both host and registrar "typically do not allow you to change nameservers while the domain is registered with them".
- **An apex on a Worker needs the zone on Cloudflare DNS.** "Unlike Pages, Workers does not support any domain whose nameservers are not managed by Cloudflare." Partial (CNAME) setup, which would avoid the nameserver change, is Business plan and above.
- **So the registration has to move first**, to any registrar that allows nameserver edits. Cloudflare Registrar cannot be the direct destination, because it requires the zone to be active on Cloudflare nameservers already — the very thing Wix blocks. It is also not needed: Cloudflare's own guidance for this case ends at "update nameservers to Cloudflare … if you do not need Cloudflare as your registrar and only want to use Cloudflare DNS, CDN, and security features, you can stop after step 3."

The sequence, and it is measured in days rather than hours:

1. unlock the domain in Wix and take the auth/EPP code. Both `clientTransferProhibited` and `clientUpdateProhibited` are set on it today, so this is a real step and not a formality;
2. start the transfer at the receiving registrar. Three to five business days typically, faster if the transfer is approved at Wix rather than left to time out;
3. add the zone at Cloudflare and delete every record the scan imports from Wix: the three apex `A` records at `185.230.63.x`, which serve a `ConnectYourDomain` error, and the `www` CNAME. There is no MX and no TXT to preserve, and no DS record, so DNSSEC is unsigned and there is nothing to disable;
4. set the nameservers at the new registrar to the pair Cloudflare assigns, and wait for the zone to read **Active**;
5. decide what `www` does. It CNAMEs to the archive today and serves the frozen edition, so left alone it would put the archive on the production domain. The apex is canonical (`astro.config.mjs` `site`), so a 301 from `www` to the apex is the default; a second `routes` entry would serve the site on both.

The ICANN sixty-day locks that blocked this earlier have expired: the domain was created on 28 August 2026 and its WHOIS was last updated on 2 September 2026, so it has been transferable since 1 November 2026.

`scripts/cutover-domain.sh`, kept untracked, walks steps 1 to 5 and then step 7, and verifies each one.

## Order

Automated check first; steps 1, 2, 3, 5 and 6; automated check again; step 7; step 4; step 8.

Step 4 sits after step 7 for the reason given above, and its `redirect_switched` signature is the last thing in it: the signature records that the redirect was seen working, so it cannot be given before step 8's sample is opened.

## Sign-offs

| Step | Signed by | Date |
|---|---|---|
| 1 Baseline | | |
| 2 Archive patch | | |
| 3 archive:check | | |
| 4 Redirect file | | |
| 5 Image rights | | |
| 6 Final copy | | |
| 7 Custom domain | | |
| 8 After the switch | | |
