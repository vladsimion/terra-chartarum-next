# Contract: CI matrix for accessibility and performance

Budgets and the browser matrix live once, in ADR 0004; this spec references them.

- **Template list**: `tests/shell/ci-templates.json` lists `home`, `stub`, `about`, `colophon`, `404`, `content-with-breadcrumb`, `essay-fixture-a`, `essay-fixture-b`, each in `dark` and `light`. A test fails if a built page type is missing from it. Later specs add their templates here.
- **Accessibility**: axe via Playwright on every entry; zero serious or critical violations. Lighthouse accessibility = 100.
- **Performance**: Lighthouse CI, mobile profile, on every entry: LCP ≤ 2.5 s, CLS ≤ 0.1, INP ≤ 200 ms (lab proxy: total blocking time), and JS ≤ 100 KB compressed (the shell ships none).
- **Behaviour**: keyboard reach of every header destination in under 10 key presses (SC-003); a no-JavaScript context; a 360 px viewport with no horizontal scroll; 44 × 44 px touch targets; `prefers-reduced-motion` and both colour schemes emulated.
- **Browsers** (FR-009): functional specs run on Chromium, Firefox and WebKit (desktop), plus a 360 px phone project; Samsung Internet is covered through Chromium; the CI image installs the latest stable engines, which is how "last two versions" is kept.
- **Snapshots**: the two fixture essays in both schemes; compared on the CI image only.
- **CI job**: extends the existing `registry` workflow with browser install, `astro build`, `shell:check`, the Playwright suite and Lighthouse CI; failure of any step fails the job.
