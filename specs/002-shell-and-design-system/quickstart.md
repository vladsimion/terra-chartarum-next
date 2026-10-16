# Quickstart: validating the shell

Prerequisites: Node 24 (`.nvmrc`), `npm ci`, Playwright browsers (`npx playwright install --with-deps chromium firefox webkit`).

```bash
npm test                          # Vitest: tokens, contrast, destinations, breadcrumbs, shell-check, lint rules
npm run lint:css                  # Stylelint: no raw values outside tokens.css
npm run build                     # astro build: gate first, then pages, then _redirects and relations.json
npm run shell:check               # lists stub pages and draft copy
npm run shell:check -- --cutover  # must exit 1 while any remain
npm run test:e2e                  # Playwright: header, mobile nav, no-JS, keyboard, axe, snapshots (CI image only)
npm run lhci                      # Lighthouse CI against the ADR 0004 budgets
```

Expected on a fresh checkout: `shell:check` lists six stub destinations (Essays, Rooms, Atlas, Collection, Cartographers, Bibliography), the Handbook stub and three draft pages, and exits 0; `shell:check -- --cutover` exits 1; everything else passes. Opening `dist/index.html` with JavaScript disabled shows the header, the seven items, the essay list and the footer.
