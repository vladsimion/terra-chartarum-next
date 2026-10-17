---

description: "Task list for 002 Publication Shell, Navigation & Design System"
---

# Tasks: Publication Shell, Navigation & Design System

**Input**: Design documents from `/specs/002-shell-and-design-system/`

**Prerequisites**: plan.md, spec.md (clarified 2026-10-16), research.md, data-model.md, contracts/ (tokens.md, destinations.md, build-check.md, registry-integration.md, ci-matrix.md), quickstart.md. Decisions: ADR 0004, 0005, 0008, 0009.

**Tests**: REQUIRED (Constitution X). Every acceptance scenario has an automated test written first, and each story is built red → green with the `tdd` skill: in every phase the test tasks come first and must be seen failing before the task that makes them pass. Refactoring happens in review, not inside the loop.

**Seams** (to confirm with Vlad before T006's tests are written): (1) pure modules `destinations`, `breadcrumbs`, `contrast` and the token file, tested with Vitest; (2) the built site, tested with Playwright and axe through the browser; (3) the `shell:check` command, tested as a process. No test reaches inside a component.

**Organization**: Grouped by user story. Phases follow the slice order **Foundation → US1 → US2 → US3 → US4 → US5**, not priority number: the token, destination and layout foundations come first because every story renders through them; US3 (the gates) follows US1 and US2 so it has pages to measure; US4 needs the registry integration (spec 001 T119b); US5 is last because it is mostly copy.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1–US5, matching `spec.md`
- Paths are relative to the repository root. Unit tests are under `tests/shell/unit/`, browser tests under `tests/shell/e2e/`, source under `src/shell/`.
- Jira: each story's checklist is copied into its TCX story description under epic TCX-3 (CLAUDE.md); Jira and Confluence are updated after each story (workflow step 4); `/speckit-taskstoissues` is not used.

---

## Phase 1: Setup

- [X] T001 Add the Astro dependencies to `package.json`, each pinned to an exact version published at least two weeks before 2026-10-16 (found from the registry's publish times): `astro` 7.3.5, the four Fontsource packages 5.3.0 (dependencies); dev: `stylelint` 17.16.0, `postcss` 8.5.28, `postcss-html` 2.0.0, `@playwright/test` 1.63.0, `@axe-core/playwright` 4.13.0. Scripts added: `dev`, `build`, `preview`, `lint:css`, `test:e2e`, `lhci` (`shell:check` arrives with T023). **Two departures from the plan, both because of the dependency tree:** (1) `@astrojs/check` 0.9.10 (the latest) requires TypeScript 5 or 6 and the repository is on TypeScript 7, so it is not installed; `typecheck` stays `tsc --noEmit` and `.astro` files are not type-checked until `@astrojs/check` supports TypeScript 7 (revisit then). (2) `@lhci/cli` pulled in 17 audit findings through puppeteer and lighthouse dependencies, so it is not a project dependency; `npm run lhci` runs it through a pinned `npx @lhci/cli@0.15.1`. `npm audit --omit=dev` reports 0 vulnerabilities; the one remaining advisory in the full tree is `braces` (GHSA-vfj7-8cjw-p6xm, stack exhaustion on deeply nested glob patterns), reached through stylelint's file matching, which only sees our own patterns. No fixed version of `braces` exists, so it is accepted as dev-only and the CI audit step uses `--omit=dev` (T036).
- [X] T002 Create `astro.config.mjs` (static output, no integrations yet) and extend `tsconfig.json` to include `src/shell`, `src/pages`, `src/content`, `scripts` *(Done: `astro.config.mjs` sets static output, the site URL, trailing slashes and directory-format pages. `tsconfig.json` already covered `src` (so `src/shell`, `src/pages` and `src/content`) and `scripts`; the one addition is `playwright.config.ts`. `astro build` completes with 0 pages.)*
- [X] T003 [P] Extend `.gitignore` with `.astro/`, `playwright-report/`, `test-results/`, `.lighthouseci/` *(Done: `.astro/` and `dist/` were already ignored; added `playwright-report/`, `test-results/`, `.lighthouseci/`.)*
- [X] T004 [P] Create `playwright.config.ts`: projects for desktop dark, desktop light (`colorScheme` emulation), phone 360 × 740, and a no-JavaScript context; `webServer` runs `astro preview` after a build; visual comparison enabled only when `process.env.CI` is set *(Done: projects `chromium-dark`, `chromium-light`, `firefox`, `webkit`, `phone-360` and `no-js`; the last two run only specs tagged `@phone` or `@nojs` in their title, the desktop ones skip those. `webServer` runs `npm run build && npm run preview` on port 4321; visual comparison is ignored unless `CI` is set. `playwright test --list` loads the config; no spec exists yet.)*

---

## Phase 2: Foundation (blocks every user story)

**Goal**: the destination list, breadcrumbs, token file with tested contrast, the raw-value lint, and the base layout with skip link, landmarks, `lang` and a 404 page.

- [X] T005 Agree the three seams above with Vlad (tdd skill) and record any change here *(Done 2026-10-16: the three seams were confirmed by Vlad. Refinement: static facts of the built HTML (landmarks, skip link, `lang`) are tested by parsing the `astro build` output in Vitest (`tests/shell/build/`), because Playwright's browsers do not run on every developer machine; behaviour that needs a browser stays in the Playwright specs, which run in CI.)*
- [X] T006 [P] Write failing `tests/shell/unit/destinations.test.ts`: exactly seven `header` entries in the canonical order with a lens meaning each; unique `href`; footer holds Colophon and Handbook; a `built` destination has a page file and a `stub` one has none (FR-001, FR-002) *(Done: `tests/shell/unit/destinations.test.ts`, 4 tests.)*
- [X] T007 Implement `src/shell/destinations.ts` per [contracts/destinations.md](./contracts/destinations.md) and data-model.md "Destination": the seven lenses (Essays, Rooms, Atlas and so on) and the footer entries, owners `003`…`007` and `002`, six lenses and the Handbook as `stub`, About and Colophon as `built` *(Done: `src/shell/destinations.ts`. All destinations start as `stub`; About and Colophon flip to `built` with their pages in US5. The Handbook address `/atlas/handbook/` is an assumption owned by spec 005.)*
- [X] T008 [P] Write failing `tests/shell/unit/breadcrumbs.test.ts`: empty for `/` and the seven lens landings; lens › page below them; the last item has no `href`; a very long title is returned in full (truncation is CSS) (FR-016) *(Done: `tests/shell/unit/breadcrumbs.test.ts`, 4 tests; a page under no lens starts from Home.)*
- [X] T009 Implement `src/shell/breadcrumbs.ts` (pure) *(Done: `src/shell/breadcrumbs.ts`.)*
- [X] T010 [P] Write failing `tests/shell/unit/contrast.test.ts`: relative luminance of black and white gives 21:1; every pair in `contrast-pairs.ts` meets 4.5:1 (text) or 3:1 (ui) in the dark scheme and in the light scheme; every colour token in `tokens.css` is in a pair or listed `decorative`; a pair that fails is reported by name (FR-011, SC-006) *(Done: `tests/shell/unit/contrast.test.ts` and `tokens-reader.test.ts`; the token reader and the pair checker are test support in `tests/shell/support/`, so `postcss` stays a dev dependency.)*
- [X] T011 Implement `src/shell/styles/tokens.css` (dark values on `:root` carried over from the live site, light values in `@media (prefers-color-scheme: light)`, `color-scheme`, the type, space, motion and shape tokens, the six accent slots) and `src/shell/styles/contrast-pairs.ts`; read the token file with `postcss` in the test. Adjust the derived light values and the accent values until the test passes (FR-003) *(Done: `src/shell/styles/tokens.css`, `contrast-pairs.ts` and `src/shell/contrast.ts`. Every pair passes AA in both schemes with the light values first proposed; no colour token is untested.)*
- [X] T012 [P] Write failing `tests/shell/unit/lint-rules.test.ts`: Stylelint run on a good and a bad fixture (`tests/shell/fixtures/css/`) reports hex colours, colour functions and length literals in spacing, size and radius properties outside `tokens.css`; a source scan fails any inline `style=` attribute and any `filter` on images (SC-004, FR-003) *(Done: `tests/shell/unit/lint-rules.test.ts` and `inline-styles.test.ts`, with fixtures in `tests/shell/fixtures/css/`.)*
- [X] T013 Implement `.stylelintrc.json` (with `postcss-html` for `.astro` styles, `tokens.css` exempt) and the `lint:css` script *(Done: `.stylelintrc.json` also bans the `filter` property; `lint:css` is clean on the real tree.)*
- [X] T014 Write failing `tests/shell/e2e/landmarks.spec.ts`: every page has a skip-to-content link that is the first focusable element, `header`, `nav`, `main`, `footer` landmarks, a `lang` attribute, and an unknown URL returns the static 404 page (FR-018) *(Done as `tests/shell/build/landmarks.test.ts` on the built HTML, 5 tests: static 404, `lang`, skip link first and reaching `main#main`, one header/main/footer with a labelled primary nav of the seven lenses, and the four footer links. The keyboard-focus part of the skip link is covered by US1's Playwright keyboard spec.)*
- [X] T015 Implement `src/shell/styles/base.css` (reset, type scale, visible focus, print block, reduced-motion handling), `src/shell/fonts.ts` (the subsets each template loads, `font-display: swap`) and `src/shell/layouts/Base.astro` (skip link, landmarks, `lang` from the page copy, slots for header and footer), plus `src/pages/404.astro` *(Done: `Base.astro` with skip link, landmarks, header, nav and footer from the destination list, `base.css`, `fonts.ts` and `404.astro`. US1 refines the header (disclosure, `aria-current`, glyph, touch targets). `src/types/css.d.ts` declares side-effect CSS imports for TypeScript 7.)*

**Checkpoint**: `npm test` passes the Foundation unit tests; the landmark test passes once a page uses `Base.astro` (it does from US1).

---

## Phase 3: User Story 1 — Enter through the seven intellectual lenses (P1)

**Goal**: the header, the mobile disclosure, the footer, breadcrumbs, stub pages and the check that lists them.

**Independent Test**: every page renders the seven-item header in that order; each item resolves; Colophon and Handbook are in the footer.

- [X] T016 [P] [US1] Write failing `tests/shell/e2e/header.spec.ts`: exactly seven items in order, the current section carries `aria-current="page"` and also differs in text weight and underline (not colour alone, FR-005), the wordmark links home, no search control in the header (FR-014) *(Done: `tests/shell/e2e/header.spec.ts`, plus `tests/shell/build/header.test.ts` for the static parts. Passing in CI on Chromium dark and light, Firefox and WebKit.)*
- [X] T017 [P] [US1] Write failing `tests/shell/e2e/mobile-nav.spec.ts`: at 360 px all seven items are reachable with no horizontal scroll, the navigation is a native disclosure that opens and closes with Enter and Space, and it works with JavaScript disabled (AC 1.3) *(Done: `tests/shell/e2e/mobile-nav.spec.ts`, one test in the 360 px phone project (@phone) and one in the no-JavaScript project (@nojs).)*
- [X] T018 [P] [US1] Write failing `tests/shell/e2e/keyboard.spec.ts`: a keyboard-only user reaches every header destination and returns to the content in under 10 key presses from page load (SC-003) *(Done: `tests/shell/e2e/keyboard.spec.ts`. The skip link is Tab 1, the wordmark Tab 2 and the seven lenses Tabs 3 to 9; Tab then Enter on the skip link moves focus to `main`.)*
- [X] T019 [P] [US1] Write failing `tests/shell/e2e/touch-targets.spec.ts`: at 360 px every standalone control (navigation items, the disclosure summary, breadcrumb links, footer links, buttons) measures at least 44 × 44 CSS px; inline links in running text are exempt (FR-004) *(Done: `tests/shell/e2e/touch-targets.spec.ts` with soft assertions so one run lists every offender. Its first CI run found the breadcrumb link "Atlas" only 27 px wide; every standalone control now has `min-width` as well as `min-height` of the touch target.)*
- [X] T020 [P] [US1] Write failing `tests/shell/e2e/stubs.spec.ts`: each stub destination resolves with `data-stub` and the text "in preparation"; and `tests/shell/e2e/breadcrumbs.spec.ts`: a nested page shows the breadcrumb with `aria-current` on the last item, a long title truncates visually and its full text remains in the page *(Done: `stubs.spec.ts`, `print.spec.ts` and the breadcrumb checks. The "long title truncates visually, full text stays in the page" browser check needs a page with a long title; it moves to the fixture essays of T028.)*
- [X] T021 [P] [US1] Write failing `tests/shell/unit/shell-check.test.ts`: against a fixture `dist/` containing a `data-stub` page and a `data-draft` page, the command lists both with their owners and exits 0; with `--cutover` it exits 1; with neither marker `--cutover` exits 0; a missing `dist` exits 2 (FR-015, [contracts/build-check.md](./contracts/build-check.md)) *(Done: `tests/shell/unit/shell-check.test.ts`, 5 tests run as a process against fixture build folders.)*
- [X] T022 [US1] Implement the shell components in `src/shell/components/`: `Wordmark.astro` (text wordmark with the ✦ glyph `aria-hidden`), `Header.astro`, `NavDisclosure.astro` (native `<details>` below the breakpoint, a plain list above), `Footer.astro` (Colophon, Handbook, licences, About), `Breadcrumbs.astro`, and an SVG favicon drawn from the glyph; wire them into `Base.astro` (FR-001, FR-002, FR-010, FR-014, FR-016) *(Done: `Wordmark`, `Header`, `NavDisclosure` (native `<details>`, `aria-current` as `page` or `true`, weight and underline as well as colour), `Footer`, `Breadcrumbs`, `public/favicon.svg`; `Base.astro` composes them. Where `::details-content` is unsupported the wide-screen menu stays a disclosure, still operable.)*
- [X] T023 [US1] Implement `src/shell/components/StubPage.astro` and the generated routes for every `stub` destination in `src/pages/`; implement `scripts/shell-check.ts` and the `shell:check` script; make T016 to T021 pass (FR-015) *(Done: `StubPage.astro`, the generated route `src/pages/[...stub].astro`, `scripts/shell-check.ts` and the `shell:check` script. CI now builds the site and runs `shell:check`.)*
- [ ] T024 [US1] Jira: copy this phase's checklist into the TCX story for US1 under TCX-3 and update the epic (workflow step 4)

**Checkpoint**: US1 is independently demonstrable: every page shows the seven lenses and none dead-ends.

---

## Phase 4: User Story 2 — Coherent visual language with per-essay character (P1)

**Goal**: accent slots work, motion is reduced when asked, and two fixture essays render in both colour schemes.

**Independent Test**: two fixture essays with different accents render with the shared shell and distinct accent tokens; snapshots pass in both schemes.

- [X] T025 [P] [US2] Write failing `tests/shell/unit/accents.test.ts`: `data-accent="<slot>"` sets only `--accent`; every slot in the token file has a passing contrast pair in both schemes; an unknown slot name makes the page generation throw (AC 2.2, FR-012) *(Done: `tests/shell/unit/accents.test.ts` (accentFor throws on an unknown name, the six `[data-accent]` rules each set only `--accent`, the slot list equals the token file in both schemes) and `tests/shell/build/accents.test.ts` (default gold, the fixtures carry their slot, a normal build has no fixture pages). `ACCENT_SLOTS` now lives in `src/shell/accents.ts`.)*
- [X] T026 [P] [US2] Write failing `tests/shell/e2e/reduced-motion.spec.ts`: under `prefers-reduced-motion: reduce` the motion tokens resolve to `0s` and no element has a running animation or transition (FR-006) *(Done: `reduced-motion.spec.ts` with a control: without the preference links transition over the 150 ms token, with it the token is 0s and nothing transitions or animates. Pushed red first, then green in CI.)*
- [X] T027 [P] [US2] Write failing `tests/shell/e2e/snapshots.spec.ts`: the two fixture essays in the dark and light schemes match their baselines (compared on the CI image only; skipped locally with a clear message), and the two differ only in accent-token-driven pixels' source values (assert the computed `--accent` differs and the other tokens are equal) *(Done: `snapshots.spec.ts`: the two fixture essays differ in the `accent` token and in nothing else, and match their visual baselines in the Chromium dark and light projects. Baselines are skipped off the CI image.)*
- [X] T028 [US2] Add the test-only fixture essay layouts `src/pages/__fixtures__/essay-a.astro` and `essay-b.astro` (built only when `SHELL_FIXTURES=1`, never in a production build; a unit test asserts they are absent from a normal build), each declaring a different accent slot through `Base.astro`; implement `data-accent` handling in `Base.astro` *(Done: the fixtures are `src/pages/fixtures/[slug].astro`, not `__fixtures__`, because Astro does not route folders that start with an underscore; they are generated only when `SHELL_FIXTURES=1`, set by the global test setup and by the Playwright web server. A third fixture with a very long title serves the breadcrumb truncation spec.)*
- [X] T029 [US2] Make T025 to T027 pass; generate the baselines in CI (workflow input to update them) and commit them *(Done: the workflow has a manual "update snapshots" run that uploads the baselines; they were generated on the CI image, looked at, and committed under `tests/shell/e2e/snapshots.spec.ts-snapshots/`. The long-title breadcrumb check deferred from T020 is `breadcrumb-long-title.spec.ts`.)*
- [ ] T030 [US2] Jira: copy this phase's checklist into the TCX story for US2 and update the epic

**Checkpoint**: US2 demonstrable: the shell reads as one publication and each essay keeps its accent.

---

## Phase 5: User Story 3 — Accessibility and performance gates (P1)

**Goal**: a page cannot ship if it fails axe or exceeds the ADR 0004 budgets; the shell works without JavaScript.

**Independent Test**: a fixture page that exceeds the JS budget or has an unlabelled control fails CI.

- [X] T031 [P] [US3] Create `tests/shell/ci-templates.json` listing `home`, `stub`, `about`, `colophon`, `404`, `content-with-breadcrumb`, `essay-fixture-a`, `essay-fixture-b` in `dark` and `light`, and write failing `tests/shell/unit/ci-templates.test.ts`: every page type the build produces is in the list, so a template cannot be left out silently ([contracts/ci-matrix.md](./contracts/ci-matrix.md)) *(Done: `tests/shell/ci-templates.json` and `tests/shell/build/ci-templates.test.ts` (3 tests) with a page-type classifier in `tests/shell/support/page-types.ts`. The list holds the templates that exist now: `stub`, `404`, `content-with-breadcrumb` (the long-title fixture), `essay-fixture-a` and `essay-fixture-b`. `home`, `about` and `colophon` are added by US4 and US5 when those pages are built; the test fails until they are listed, which is the point.)*
- [X] T032 [P] [US3] Write failing `tests/shell/e2e/axe.spec.ts`: axe over every entry of the list in both schemes; zero serious or critical violations (AC 3.1, SC-001); plus a deliberately bad fixture (an unlabelled control) that the same spec proves fails *(Done: `axe.spec.ts` runs once, in the dark Chromium project, over every listed template in both schemes via `emulateMedia`, and proves it can fail on `/fixtures/bad-a11y/` (an unnamed button and an image without alt). All five templates pass in both schemes.)*
- [X] T033 [P] [US3] Write failing `tests/shell/e2e/no-js.spec.ts`: with JavaScript disabled every listed page shows its content and the navigation works (AC 3.3); and `tests/shell/e2e/fonts.spec.ts`: a Greek name and a Romanian name render from a shell font face, not the fallback (FR-013) *(Done: `no-js.spec.ts` (@nojs) over every listed template, and `fonts.spec.ts`: EB Garamond (Greek) and Crimson Pro (body and Romanian letters) load and cover `Γεωγραφία` and `Ștefan`.)*
- [X] T034 [P] [US3] Write failing `tests/shell/unit/static-output.test.ts`: the build emits HTML, CSS and assets only (no server entry, no adapter), ships no client JavaScript for the shell, and applies no `filter` to images (FR-008, edge case "dark colour scheme and map imagery") *(Done: `tests/shell/build/static-output.test.ts` with a checker `staticOutputProblems` proven on a doctored folder; the real build has no script files, no script tags (the over-budget fixture is skipped on purpose) and no `filter`.)*
- [X] T035 [US3] Add the bad-fixture pages needed by T032 and a budget-busting fixture (a page importing a large script) to `src/pages/__fixtures__/` (test-only, as T028), and `lighthouserc.json`: mobile profile, assertions for LCP ≤ 2.5 s, CLS ≤ 0.1, total blocking time as the INP proxy, accessibility = 100 and JS ≤ 100 KB compressed over the listed templates; write a test or CI step proving the budget-busting fixture fails it *(Done: test-only fixtures `/fixtures/bad-a11y/` and `/fixtures/budget/` (a deterministic ~480 KB inline script), and `lighthouserc.json` with the ADR 0004 budgets: accessibility 100, LCP 2.5 s, CLS 0.1, total blocking time 200 ms as the INP proxy, script size 100 KB, on the mobile profile. CI runs it over the listed templates and then proves that the over-budget page fails the same assertions. Lighthouse emulates one colour scheme (light); axe covers both. **It found a real problem:** CLS of 0.16, 0.28 and 0.12 on three pages, caused by web fonts swapping in with different metrics from the fallback. Fixed with size-adjusted fallback faces (`src/shell/styles/fallbacks.css`, worked from the published Capsize metrics, Times New Roman or Liberation Serif, Latin only so Greek still reaches EB Garamond), tested in `font-fallbacks.test.ts`.)*
- [X] T036 [US3] Make T031 to T034 pass; extend `.github/workflows/registry.yml` with browser install, `astro build`, `shell:check`, the Playwright suite and Lighthouse CI; the job fails if any step fails (FR-007, SC-002) *(Done: the workflow now runs `npm audit --omit=dev`, `lint:css`, the Playwright suite, the production build with `shell:check`, Lighthouse CI on a fixtures build, and the budget guard proof; a failed run uploads the Playwright and Lighthouse reports. `playwright-core` is pinned to the version `@playwright/test` uses, because the axe package's peer dependency had pulled in a newer one and broken the types.)*
- [ ] T037 [US3] Jira: copy this phase's checklist into the TCX story for US3 and update the epic

**Checkpoint**: US3 demonstrable: the gates catch a failing fixture and the real templates pass.

---

## Phase 6: User Story 4 — Home page as front door (P2)

**Goal**: the home page lists the registry's public essays, the seven rooms and the Atlas and Handbook calls, and the build calls the registry (spec 001 T119b).

**Independent Test**: a first-time visitor sees what the site is, can enter through an essay, a room or the Atlas, and finds the Handbook route beside the Atlas call.

- [x] T038 [P] [US4] Create `tests/shell/fixtures/registry/` (a valid mini registry with the seven rooms, two published and released essays, one held essay and one draft) and write failing `tests/shell/unit/registry-integration.test.ts` driving the integration's hooks directly: `astro:build:start` throws with the report summary when the gate fails; it continues, logging, when there is no `content/`; `astro:build:done` calls `buildSiteData` and fails the build on a failed gate or a leak ([contracts/registry-integration.md](./contracts/registry-integration.md)) (done: 7 rooms, 4 essays, two public, one held, one draft; 6 hook tests)
- [x] T039 [P] [US4] Write failing `tests/shell/e2e/home.spec.ts`: the home page explains the site, lists exactly the two public essays in title order and not the held or draft one, lists the seven rooms, has the Atlas call and a secondary "Read the Handbook" route beside it, and contains no id of a held entity (AC US4) (done: `tests/shell/build/home.test.ts` covers the content and the leak scan; `tests/shell/e2e/home.spec.ts` covers layout, touch targets, no sideways scroll and no-JS, CI-verified; axe and no-JS specs cover `home` through the template list)
- [x] T040 [US4] Implement `src/integrations/registry.ts` and register it in `astro.config.mjs`; implement the helper that loads the registry, applies vocabulary mappings and returns `projectPublic(records)`; tick spec 001 **T119b** when this passes (done, plus `loadPublicRecords` and `registryRoot` in `src/shell/public-records.ts`; `REGISTRY_ROOT` points the tests, Playwright and the Lighthouse build at the fixture registry; spec 001 T119b ticked)
- [x] T041 [US4] Implement `src/pages/index.astro` and `src/content/pages/home.md` (placeholder copy, `draft: true`) with the content collection schema in `src/content/config.ts` (`title`, `description`, `draft`, `lang`); a draft page renders with `data-draft` (done; Astro 7 reads the collection from `src/content.config.ts`, not `src/content/config.ts`; `src/types/astro-content.d.ts` declares the virtual module for the TypeScript 7 type-check)
- [x] T042 [US4] Make T038 and T039 pass; Jira: copy this phase's checklist into the TCX story for US4 and update the epic (done: 725 Vitest tests pass; Jira TCX-21 and epic TCX-3 updated)

**Checkpoint**: US4 demonstrable with the fixture registry; with no `content/` the build still succeeds and the home page shows the rooms and the calls.

---

## Phase 7: User Story 5 — About and Colophon (P3)

**Goal**: the About and Colophon pages exist as draft copy, the Colophon states the licence split, and licence lines come from records.

**Independent Test**: About states identity, principles and authorship; the Colophon documents production, data licences and technology.

- [x] T043 [P] [US5] Write failing `tests/shell/unit/licences.test.ts`: `LICENSE` exists at the repository root and is MIT; `RightsLine` renders the licence and attribution of a `rights` object and renders nothing when `rights` is absent or has no licence; the Colophon source contains the licence split (code MIT, original prose and data CC BY 4.0, per-item rights) (FR-017, ADR 0009) (done: `tests/shell/unit/licences.test.ts`, 7 tests; the pure `rightsLine` in `src/shell/rights-line.ts` is the seam, `RightsLine.astro` wraps it)
- [x] T044 [P] [US5] Write failing `tests/shell/e2e/about-colophon.spec.ts`: About and Colophon render with the shell and a `#licences` section, are marked `data-draft` while their copy is draft, and the footer's licences link goes to `/colophon/#licences` (done: `tests/shell/e2e/about-colophon.spec.ts` CI-verified, plus `tests/shell/build/about-colophon.test.ts` which runs locally; `about` and `colophon` added to the CI template list and `lighthouserc.json`)
- [x] T045 [US5] Add `LICENSE` (MIT), `src/shell/components/RightsLine.astro`, `src/content/pages/{about,colophon}.md` (neutral placeholder copy, `draft: true`; the authorship statement is left for the author) and `src/pages/about.astro`, `src/pages/colophon.astro`; make T043 and T044 pass (done: `LICENSE` MIT with a note on the prose and data licences, About and Colophon copy as `draft: true`, both destinations flipped to `built`; the authorship statement is a one-line placeholder for the author)
- [x] T046 [US5] Jira: copy this phase's checklist into the TCX story for US5 and update the epic (done: Jira TCX-22 and epic TCX-3 updated)

---

## Phase 8: Polish & cross-cutting

- [ ] T047 [P] Add a README section for the shell (commands from the quickstart, the token and destination rules) and update `CLAUDE.md`'s "Read first" list to include ADRs 0006 to 0009
- [ ] T048 Walk [quickstart.md](./quickstart.md) end to end and correct it where it differs
- [ ] T049 Add the cutover check to spec 008: in `specs/008-migration-cutover/spec.md` (acceptance) name `npm run shell:check -- --cutover` as a required step, so no stub or draft copy ships
- [ ] T050 Run the `code-review` skill against `main` and resolve the findings
- [ ] T051 Update the Confluence records (workflow step 4): a programme dossier for spec 002 written to the fourteen-point contract, Build Log section U for the shipped work, and the Decision Log if a cross-programme decision was made during implementation; set the TCX-3 epic description to match `main`

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 → stories. T007 needs T006; T009 needs T008; T011 needs T010; T013 needs T012; T015 needs T014 and uses the tokens.
- US1 needs Foundation. US2 needs US1 (it renders fixture essays through `Base.astro` and the header). US3 needs US1 and US2 (pages to measure). US4 needs US1 and the registry integration (T040). US5 needs US1.
- Within a story: test tasks first, each seen failing, then implementation.
- Spec 001 **T119b** is completed by T040; spec 001 T110 (tombstone page rendering) and T111 (`registry scan` in CI over the real `dist`) become possible once US4 lands and are picked up there.

### Parallel opportunities
- Phase 2: T006, T008, T010, T012 are independent test files and can be written together.
- Phase 3: T016 to T021 are independent test files.
- Phase 5: T031 to T034 are independent test files.

## Implementation strategy

- **MVP**: Foundation + US1 (a navigable shell with stubs) is the first demonstrable slice; US2 and US3 make it a gated publication; US4 connects the registry; US5 finishes the copy.
- Build one story at a time, red then green, update Jira and Confluence at each story's end, and open a pull request per story.
- Open items to watch: the light-scheme values and accent values are set against the contrast test (T011) and may need design review; the visual baselines can only be generated on the CI image (T029).
