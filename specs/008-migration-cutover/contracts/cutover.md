# Contract: the cutover checklist

`docs/cutover.md` is the list the editor works through. The automated part is `npm run cutover:check`; each manual step has a named sign-off (a name and a date) recorded in the document.

## Automated (`npm run cutover:check`)

1. The integrity gate passes over the real registry.
2. `npm run shell:check -- --cutover` exits 0: no stub page, no draft copy (home, About, Colophon, the Handbook topics, the seven room introductions).
3. The site-wide link check reports nothing over the production build.
4. The redirect file matches the inventory: no missing, extra, duplicate or dangling rule.
5. The Lighthouse budgets hold on the listed page types: the `registry` CI workflow (which runs Lighthouse CI) succeeded for this commit, read with `gh`.
6. The v1 anchor essay (Terra Sigillata, Trench A) is `published` and `released`.

## Manual, each with a sign-off

1. **Baseline recorded** before the freeze: `npm run baseline` against the live site, result committed.
2. **Archive patch applied** to the archive project and deployed: banner, `noindex` header, link to terra-chartarum.org.
3. **`npm run archive:check`** passes against a sample of archive URLs.
4. **Redirect file applied** to the archive project by pull request, reviewed, and `redirect_switched` signed on each rebuilt essay record.
5. **Image rights**: every image shown at cutover has been cleared by the editor, or is withheld.
6. **Final copy**: the author's text replaces the placeholders (the automated check proves none remain).
7. **Custom domain** terra-chartarum.org attached to the Worker (ADR 0012); `*.workers.dev` previews carry `noindex`.
8. **After the switch**: a sample of old URLs is opened and lands where the inventory says.

## Order

The automated check runs first and last; the domain is attached only after steps 2 to 5 are signed and the check passes; step 8 closes the list.
