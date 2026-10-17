# Confluence entry: Build Log (page 2490370)

Published 2026-10-17 as section V, directly after section U and before "2. In progress"; the header pointer "recorded in section U" became "sections U and V". The rest of the page was left unchanged (checked by reading the page back). The text below is what was published.

## V. The successor build: publication shell and design system (spec 002)

Merged to `main` of [github.com/vladsimion/terra-chartarum-next](https://github.com/vladsimion/terra-chartarum-next), 16 to 17 October 2026. Jira epic TCX-3. Like section U, this section records only what has merged to the successor's `main` and is not part of the reconciliation of the other sections of this page. It was reconciled on 17 October 2026 against `main` at `2d79296`, the merge of PR #32. Working detail is in the [spec 002 programme dossier](https://vladsimion.atlassian.net/wiki/spaces/~7012186ee7d7085f34fff9bc2bf8fbe8de309/pages/37617686).

| PR | Scope | Jira |
|---|---|---|
| #14, #15 | Grill outcome (ADR 0008, ADR 0009) and the Spec Kit artefacts | TCX-3 |
| #18, #19 | Astro, Vitest and Playwright tooling and configuration (T001 to T004) | TCX-3 |
| #20 | Foundation: destination list, breadcrumbs, token file with contrast tests, raw-value lint, base layout (T005 to T015) | TCX-3 |
| #21 | US1: seven-item header, no-JavaScript menu, breadcrumbs, stub pages, `shell:check`, print rules | TCX-18 |
| #22 | US2: named accent slots, reduced motion, fixture essays, visual baselines in both colour schemes | TCX-19 |
| #23 | US3: CI template list, axe in both schemes, no-JS and font specs, Lighthouse CI budgets with a guard proof; size-adjusted fallback fonts (layout shift was 0.12 to 0.28) | TCX-20 |
| #25 | US4: home page, content collection, registry integration in the build (completes spec 001 T119b) | TCX-21 |
| #26 | US5: `LICENSE` (MIT), `rightsLine`, About and Colophon with draft copy | TCX-22 |
| #28 | Polish (T047 to T050): README shell section, quickstart walked and corrected, the cutover check named in spec 008 (FR-009), code-review fixes | TCX-3 |
| #32 | Lighthouse takes three samples and judges LCP, CLS and TBT on the median (thresholds unchanged); the budget guard now fails on script size itself | TCX-20 |

State on `main`: 741 Vitest tests; Playwright suites run in CI across chromium (dark, light), firefox, webkit, a 360 px phone and no JavaScript; `gate` green. Stories TCX-18 to TCX-22 are Done; the epic TCX-3 is In Progress. `shell:check` lists 7 stub pages and 3 draft pages, as expected before cutover; `npm run shell:check -- --cutover` must pass before the domain moves.

### Since section U was written

- [PR #13](https://github.com/vladsimion/terra-chartarum-next/pull/13), merged 16 October 2026 (`1f1adfc`): `registry build`, the registry's part of a site build (spec 001 T119a).
- [PR #25](https://github.com/vladsimion/terra-chartarum-next/pull/25), merged 17 October 2026 (`e848e35`): the Astro hook that runs the integrity gate before any page is built and writes the site data afterwards (spec 001 T119b). Section U is amended to match; the amended points are marked.
- [PR #27](https://github.com/vladsimion/terra-chartarum-next/pull/27), merged 17 October 2026 (`194d531`): the successor is hosted as a Cloudflare Worker serving static assets (ADR 0012, Decision Log TC-D029).
