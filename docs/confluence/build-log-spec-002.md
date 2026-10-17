# Pending Confluence entry: Build Log (page 2490370)

Add as a new section (next letter after the last section, "U" per the task note) recording shipped work only. Not yet published: the session that wrote it had no Confluence write tool.

## Spec 002 — publication shell and design system (successor repository)

Merged to `main` of github.com/vladsimion/terra-chartarum-next, 2026-10-16 to 2026-10-17. Jira epic TCX-3.

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

State on `main`: 738 Vitest tests; Playwright suites run in CI across chromium (dark, light), firefox, webkit, a 360 px phone and no-JavaScript; `gate` green. `shell:check` lists 7 stub pages and 3 draft pages, as expected before cutover. Polish (README, quickstart walk, spec 008 cutover requirement, code review) follows in a further PR.
