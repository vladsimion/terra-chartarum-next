# Contract: CI matrix for accessibility and performance

Budgets and the browser matrix live once, in ADR 0004; this spec references them.

- **Template list**: `tests/shell/ci-templates.json` lists the templates that exist: `stub`, `404`, `content-with-breadcrumb`, `essay-fixture-a`, `essay-fixture-b`, each checked in `dark` and `light`. `home`, `about` and `colophon` join it when US4 and US5 build those pages. A test fails if a built page type is missing from the list, so a template cannot be left out. Later specs add their templates here.
- **Accessibility**: axe via Playwright on every entry; zero serious or critical violations. Lighthouse accessibility = 100.
- **Performance**: Lighthouse CI, mobile profile (one colour scheme; axe covers both), on every entry; CI also proves that a page over the JavaScript budget fails the same assertions: LCP ≤ 2.5 s, CLS ≤ 0.1, INP ≤ 200 ms (lab proxy: total blocking time), and JS ≤ 100 KB compressed (the shell ships none).
- **Behaviour**: keyboard reach of every header destination in under 10 key presses (SC-003); a no-JavaScript context; a 360 px viewport with no horizontal scroll; 44 × 44 px touch targets; `prefers-reduced-motion` and both colour schemes emulated.
- **Snapshots**: the two fixture essays in both schemes; compared on the CI image only.
- **CI job**: extends the existing `registry` workflow with browser install, `astro build`, `shell:check`, the Playwright suite and Lighthouse CI; failure of any step fails the job.
