# Cutover checklist

The list the editor works through before terra-chartarum.org replaces the archive as the public site (spec 008, ADR 0005, ADR 0016). The automated part is `npm run cutover:check`; every manual step is signed with a name and a date in the table at the end. The domain is attached only after steps 2 to 5 are signed and the automated check passes.

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
7. **Custom domain** terra-chartarum.org attached to the Worker (ADR 0012); `*.workers.dev` previews carry `noindex`.
8. **After the switch**: a sample of old URLs is opened and lands where the inventory says.

## Order

Automated check first; steps 1 to 5; automated check again; step 7; step 8.

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
