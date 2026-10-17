Programme dossier for spec 002, written against the fourteen-point contract in [Programme Dossier Contract & Reconciliation Register](https://vladsimion.atlassian.net/wiki/spaces/~7012186ee7d7085f34fff9bc2bf8fbe8de309/pages/18481169/P). A standalone page at the root of the space, like the [spec 001 dossier](https://vladsimion.atlassian.net/wiki/spaces/~7012186ee7d7085f34fff9bc2bf8fbe8de309/pages/36569092); its source is `docs/confluence/spec-002-shell.md` and the two are kept identical. Facts below were checked on **2026-10-17** against `main` (`2d79296`), Jira and CI.

## 1. Programme metadata

| | |
|---|---|
| Programme type | Platform foundation: the publication shell, design system and CI gates for the Terra Chartarum successor build |
| Status | **Implemented on `main`**: User Stories 1 to 5 through PR #26, polish T047 to T050 in PR #28, steadier Lighthouse sampling in PR #32. T051 (these Confluence records) was published on 2026-10-17. |
| Jira | **TCX-3** epic (In Progress); stories **TCX-18** (US1 header), **TCX-19** (US2 tokens and accents), **TCX-20** (US3 accessibility and performance gates), **TCX-21** (US4 home page), **TCX-22** (US5 About and Colophon), all Done |
| Canonical parent | A standalone page at the root of the space, as for spec 001 |
| Primary canonical ownership | Volume VIII (software contracts, experience contract); Volume IX (delivery) |
| Repository | https://github.com/vladsimion/terra-chartarum-next (public). Spec `specs/002-shell-and-design-system/`; code `src/shell/`, `src/pages/`, `src/integrations/`; decisions `docs/adr/0008`, `0009` |
| Successor relationship | Replaces the live site's header, styles and pages at cutover (ADR 0001); stub pages and draft copy must be gone by then |
| Last reconciliation | 2026-10-17 (dossier creation; 741 Vitest tests on `main` at `2d79296`) |

## 2. Purpose / thesis

Every page of the site sits in one frame that is accessible, fast and visually consistent, so that later specs add content without re-deciding navigation, colour or performance. The falsifiable claim: **a page that fails the accessibility or performance budget, uses a raw visual value outside the token file, links to a destination that does not exist, or ships placeholder text at cutover, cannot reach the published site.** Each part of that claim is a test or a CI step.

## 3. Scope and non-goals

### In scope
- A seven-item header (Essays, Rooms, Atlas, Collection, Cartographers, Bibliography, About), footer (Colophon, Atlas Handbook, Licences, About), breadcrumbs, skip link, no-JavaScript mobile menu.
- One token file with a dark default and a derived light scheme; six named accent slots; contrast tested on every declared pair; Stylelint forbidding raw values elsewhere.
- Stub pages for destinations other specs own, and `shell:check` to list them and any draft copy.
- The home, About and Colophon pages with draft copy; `LICENSE` and the build-generated licence line.
- The Astro integration that runs the registry's integrity gate in the build.
- CI: axe, no-JavaScript, font and static-output checks, Lighthouse against the ADR 0004 budgets, visual snapshots of two fixture essays.

### Non-goals
- Site search, a manual colour-scheme toggle and a client-side router (all out of v1).
- Any essay, catalogue, Atlas, bibliography or room content (specs 003 to 007).

## 4. Outputs / deliverables

The shell (`src/shell/`), the pages (`src/pages/`), the registry integration (`src/integrations/registry.ts`), the content collection (`src/content.config.ts`), `scripts/shell-check.ts`, the test suites (`tests/shell/`), `LICENSE`, `lighthouserc.json` and the CI workflow.

## 5. Research, sources and rights framework

Licences (ADR 0009): code MIT; original prose and data CC BY 4.0; every image, dataset and layer shows its own licence, generated at build time from its registry `rights` by `rightsLine` and never typed. A record with no licence shows no line. Out-of-copyright text and reproduction rights are separate facts (Constitution VI). Fonts are self-hosted (Cinzel, Crimson Pro, EB Garamond, IBM Plex Mono) under their open licences.

## 6. Evidence and data architecture

The shell holds no scholarly content. It reads the registry only through `loadPublicRecords`, which applies vocabulary mappings and the public projection (spec 001), so a held or draft record cannot reach a page. The build runs the integrity gate before any page is generated and writes `_redirects` and `data/relations.json` afterwards; `REGISTRY_ROOT` selects the registry (the repository root by default; the tests use `tests/shell/fixtures/registry`).

## 7. Essay and editorial architecture

None here. The shell offers the layout every essay uses (`Base.astro`, with an accent slot chosen by name) and two test-only fixture essays that prove two accents change the accent token and nothing else.

## 8. Interaction and technical implementation

### 8.1 Seams (where tests live)
1. Pure modules: `destinations.ts`, `breadcrumbs.ts`, `accents.ts`, `contrast.ts`, `rights-line.ts`, `public-records.ts`, the token reader.
2. The built output, read with `node-html-parser` after one shared build (`globalSetup`).
3. The browser, through Playwright (chromium dark and light, firefox, webkit, a 360 px phone, no JavaScript) and axe.

### 8.2 Rules that tests enforce
- One destination list drives the header, footer, breadcrumbs, stub routes and the build check.
- Every standalone control is at least 44 x 44 px at 360 px width.
- No raw colour, length or named colour outside `tokens.css`; no inline `style=` attributes.
- Layout shift is held to 0.1 with size-adjusted fallback faces for each web font.

### 8.3 CI and repository
One required `gate` job: audit (production dependencies), Stylelint, TypeScript, Vitest, the Playwright suite, a production build with `shell:check`, Lighthouse CI on the fixture build (three samples per page; LCP, CLS and TBT judged on the median since PR #32, with the ADR 0004 thresholds unchanged) plus a guard proof that a page over the script budget fails on script size itself. Browser tests cannot run on the author's macOS 12, so they are verified in CI; snapshot baselines come from a manual "update snapshots" run.

## 9. Implementation phases and dependency model

Foundation (T005 to T015), US1 (header), US2 (tokens and accents), US3 (gates), US4 (home and registry integration), US5 (licences, About, Colophon), Polish. US4 needs US1 and the registry integration; US3 needs pages to measure. Spec 001 T119b was completed by US4.

## 10. Jira hierarchy and reconciliation history

TCX-3 holds the five stories above; each story's description carries its Spec Kit checklist. Two departures from the plan are recorded in `tasks.md`: `@astrojs/check` is not installed (it needs TypeScript 5 or 6 and the repository is on 7), and `@lhci/cli` runs through a pinned `npx` because its dependency tree carries 17 audit findings (`npm audit --omit=dev` reports 0). Astro 7 reads content collections from `src/content.config.ts`, not `src/content/config.ts` as the task text said.

## 11. Programme acceptance criteria

- Every acceptance scenario of US1 to US5 has a passing automated test written first.
- `gate` is green on `main`: accessibility 100, LCP 2.5 s, CLS 0.1, TBT 200 ms, script size 100 KB on every listed template, in both colour schemes.
- `npm run shell:check -- --cutover` exits 1 while any stub or draft copy remains, and must exit 0 before the domain moves (spec 008 FR-009).

## 12. Verification ledger

| Claim | Evidence |
|---|---|
| Header, mobile menu, keyboard reach, touch targets | `tests/shell/e2e/{header,mobile-nav,keyboard,touch-targets}.spec.ts` (CI) |
| Contrast and tokens | `tests/shell/unit/{contrast,tokens-reader,lint-rules}.test.ts` |
| Accessibility and no-JS on every template | `axe.spec.ts`, `no-js.spec.ts` over `tests/shell/ci-templates.json` |
| Performance budgets | Lighthouse CI with a guard proof |
| Held records never appear | `tests/shell/build/home.test.ts` (leak scan), `registry-integration.test.ts` |
| Licences | `tests/shell/unit/licences.test.ts`, `build/about-colophon.test.ts` |
| Layout shift found and fixed | Lighthouse measured 0.12 to 0.28; fallback faces brought it under 0.1 |

## 13. Canonical ownership and propagation

The destination list, token file and CI template list are owned here; later specs extend them in their own changes (a spec flips its destination from `stub` to `built` and adds its page types to `ci-templates.json`). The Build Log carries shipped work in section V; the Decision Log carries TC-D025 (design system) and TC-D026 (licensing).

## 14. Current checkpoint and delivery authority

User Stories 1 to 5 are merged (PRs #20 to #23, #25 and #26, with the plan in PR #15 and the grill in PR #14), polish in PR #28 and the Lighthouse sampling change in PR #32; 741 Vitest tests and `gate` green on `main` (`2d79296`). Stories TCX-18 to TCX-22 are Done and the epic TCX-3 is In Progress. Open: removing the 7 stub pages and 3 draft pages before cutover (`npm run shell:check -- --cutover`, spec 008 FR-009); and four points from the code review that need a decision, recorded in `tasks.md`: SC-003 holds at desktop width (nine key presses) but takes eleven at 360 px because the menu must be opened; Stylelint does not cover every raw value US2 AC1 mentions; `RightsLine` has no consuming page yet (the first image, dataset or layer page must use it); and the touch-target spec measures one page and not the skip link. The budget guard that passed once when it should have failed is fixed by PR #32. Next: spec 003's site half and spec 004 build on this shell. `main` and the TCX board are the delivery authority; this page summarises them.
