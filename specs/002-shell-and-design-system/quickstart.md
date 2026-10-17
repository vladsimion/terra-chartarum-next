# Quickstart: validating the shell

Prerequisites: Node 24 (`.nvmrc`), `npm ci`, Playwright browsers (`npx playwright install --with-deps chromium firefox webkit`).

```bash
npm test                          # Vitest: tokens, contrast, destinations, breadcrumbs, shell-check, lint rules
npm run lint:css                  # Stylelint: no raw values outside tokens.css
npm run build                     # astro build: the registry gate first, then pages, then _redirects and relations.json (with no content/ directory both registry steps log that and carry on)
npm run shell:check               # lists stub pages and draft copy
npm run shell:check -- --cutover  # must exit 1 while any remain
npm run test:e2e                  # Playwright: header, mobile nav, no-JS, keyboard, axe, snapshots (CI image only)
SHELL_FIXTURES=1 REGISTRY_ROOT=tests/shell/fixtures/registry npm run build && npm run lhci
                                  # Lighthouse CI against the ADR 0004 budgets, on the build that includes the test-only fixture essays and the fixture registry
```

`npm run test:e2e` builds the site itself with the same two variables. `SHELL_FIXTURES=1` adds the test-only pages under `/fixtures/`; `REGISTRY_ROOT` points the site at a registry to read (the repository root by default, which has no `content/` yet).

Expected on a fresh checkout: `shell:check` lists seven stub pages (Essays, Rooms, Atlas, Collection, Cartographers, Bibliography and the Atlas Handbook) and three draft pages (home, About, Colophon), prints `shell:check: 10 findings` and exits 0; `shell:check -- --cutover` exits 1; everything else passes. Opening `dist/index.html` with JavaScript disabled shows the header, the seven items, the draft introduction, the calls to the Atlas and Handbook, the rooms, a line saying the first essays are in preparation (the public essays appear once records exist) and the footer.
