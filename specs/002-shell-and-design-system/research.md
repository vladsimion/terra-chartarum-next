# Research: Publication Shell, Navigation & Design System

Decisions that were not already settled by ADR 0004, ADR 0005, ADR 0008, ADR 0009 or the grill. Each has a rationale and the alternatives considered.

## R1. Astro version and output
- **Decision**: Astro 7 (latest 7.x), static output, no UI framework, no islands in the shell. The scaffold task pins the exact version and checks it is at least two weeks old.
- **Rationale**: ADR 0005 chooses Astro with static output; Astro 7 needs Node ≥ 22.22 and the repository is on Node 24. Zero islands gives the shell a 0 KB JavaScript budget.
- **Alternatives**: Astro 5 or 6 (older, no benefit); another static generator (contradicts ADR 0005).

## R2. One token source and how colour schemes are chosen
- **Decision**: `src/shell/styles/tokens.css` is the only place raw values appear. Dark values are on `:root`; light values are in `@media (prefers-color-scheme: light)` on `:root`. `color-scheme` is declared so browser controls follow. No class-based switching, no JavaScript.
- **Rationale**: a manual toggle is out of v1 (ADR 0008); a media query needs no script and no flash of the wrong scheme.
- **Alternatives**: a `data-theme` attribute set by script (needs JavaScript and persistence); generating the CSS from JSON (a second source of truth).

## R3. Contrast as a test on the token file
- **Decision**: `contrast-pairs.ts` declares every foreground/background pair with its kind (text 4.5:1, UI or focus 3:1). `contrast.test.ts` reads `tokens.css` with `postcss`, resolves each pair for each scheme, computes WCAG relative luminance (a dozen lines, no dependency), and fails any pair below its ratio. A second assertion fails any colour token that is neither in a pair nor listed as decorative, so a new colour cannot skip the test.
- **Rationale**: ADR 0008; Lighthouse only sees the pages it visits.
- **Alternatives**: a contrast library (adds a dependency for 12 lines of arithmetic); relying on axe alone (misses unvisited states such as hover).

## R4. Raw-value lint
- **Decision**: Stylelint, with `postcss-html` so `<style>` in `.astro` files is covered. Rules: no hex colours, no colour functions (`rgb`, `hsl`, `oklch`, `color-mix` with literals), no length literals in spacing, size and radius properties, all outside `tokens.css`. A test lints a good and a bad fixture so the rule itself is tested. A second test fails any inline `style=` attribute and any `filter: invert` in built output.
- **Rationale**: SC-004; the live site already mixes literals into component styles.
- **Alternatives**: a code-review convention (not enforced); a custom script (Stylelint already parses CSS correctly).

## R5. Fonts
- **Decision**: self-hosted through Fontsource packages: Cinzel (display), Crimson Pro (body, Latin and Latin-extended), EB Garamond (Greek subset, as the body fallback for Greek), IBM Plex Mono (labels). `font-display: swap`; only the Latin display and body faces are preloaded; the Latin-extended and Greek subsets load by `unicode-range` when the page needs them.
- **Rationale**: ADR 0008; the registry holds Greek names; no third-party font request (privacy, and Cloudflare Pages serves them from the same origin).
- **Alternatives**: a system font stack (loses the identity); one large font file with all scripts (costs every page).
- **Layout shift (found by Lighthouse CI at US3)**: swapping in a web font with different metrics moved the page (CLS 0.12 to 0.28 against a 0.1 budget). Each web face now has a size-adjusted fallback face (`fallbacks.css`: Times New Roman or Liberation Serif scaled by the published font metrics, Latin only so Greek still reaches EB Garamond), placed right after its web face in the font stack.

## R6. The destination list and stub pages
- **Decision**: `src/shell/destinations.ts` is the one list (label, href, lens meaning, order, owner spec, `built | stub`). The header, footer, breadcrumbs, the generated stub routes and the build check all read it. A stub route renders `StubPage.astro` with a `data-stub` attribute. When the owning spec ships, its page replaces the stub and the status flips to `built` in the same commit; a unit test fails if a `built` destination has no page or a `stub` one does.
- **Rationale**: one place to change; the check cannot disagree with the navigation.
- **Alternatives**: derive the header from the file tree (the order and the lens meaning are editorial, not structural).

## R7. Draft copy and the build check
- **Decision**: home, About and Colophon text are Markdown in a content collection with a Zod schema (`title`, `description`, `draft`, `lang`). A draft renders with a `data-draft` attribute. `scripts/shell-check.ts` scans the built `dist/` for `data-stub` and `data-draft`, prints each with its destination and owner, and exits 0; with `--cutover` it exits 1 if any exist. Spec 008's acceptance runs it with `--cutover`.
- **Rationale**: the grill decision (stubs and drafts never reach cutover); scanning output catches what a template adds.
- **Alternatives**: scanning sources (misses generated pages).

## R8. Breadcrumbs
- **Decision**: `breadcrumbs.ts` is a pure function from a path, the destination list and a page title to items; the component renders it. The home page and the seven lens landings pass no items. Long titles are truncated with CSS (`text-overflow`) and the full text stays in the DOM.
- **Rationale**: FR-016; pure logic is unit-testable.

## R9. Navigation disclosure
- **Decision**: below a width breakpoint the nav is `<details><summary>`; above it, a plain list. The summary is the 44 px control. No script.
- **Rationale**: FR-014; native semantics give keyboard and screen-reader behaviour.
- **Alternatives**: a button with `aria-expanded` and script (JavaScript on every page).

## R10. Registry integration
- **Decision**: `src/integrations/registry.ts` calls `checkRegistry` at `astro:build:start` and aborts the build on any error; at `astro:build:done` it calls `buildSiteData` (spec 001, T119a) to write `_redirects` and `data/relations.json` into the output. The home page reads the public projection with `projectPublic`, after `applyVocabularies`. Specified in [contracts/registry-integration.md](./contracts/registry-integration.md).
- **Rationale**: spec 001 T119b; one implementation of "what is public".
- **Alternatives**: the shell reading `content/` files itself (a second definition of public).

## R11. Test tooling and where each test lives
- **Decision**: Vitest for pure logic; Playwright for the built site (a no-JavaScript context for `no-js`, a 360 px viewport for the phone and touch-target tests, `prefers-color-scheme` and `prefers-reduced-motion` emulation); axe through `@axe-core/playwright`; Lighthouse CI for the ADR 0004 budgets on the mobile profile.
- **Rationale**: ADR 0005 names these tools.

## R12. Visual snapshots
- **Decision**: Playwright `toHaveScreenshot` for the two fixture essays in both schemes. Baselines are produced and compared only on the CI image (Linux), because font rendering differs by platform; local runs skip them with a clear message. Regenerating a baseline is an explicit workflow input.
- **Rationale**: a snapshot that passes locally and fails in CI is worse than none.
- **Alternatives**: committing macOS baselines (fail in CI); pixel thresholds loose enough to hide a real change.

## R13. Print, reduced motion, dark imagery
- **Decision**: `base.css` has an `@media print` block that hides the header, footer and navigation and keeps citations; motion tokens are set to `0s` under `prefers-reduced-motion: reduce` and there are no animations by default; no `filter` is applied to images in either scheme (asserted on the built CSS).
- **Rationale**: spec edge cases and FR-006.

## R14. Licences
- **Decision**: `LICENSE` (MIT) at the repository root. `RightsLine.astro` renders a record's licence and attribution from its `rights` object and renders nothing when `rights` is absent. The Colophon states the split in prose.
- **Rationale**: ADR 0009; a guessed licence is worse than none.

## R15. Deployment
- **Decision**: no deploy configuration in this spec. Cloudflare Pages previews follow from the repository connection; production is attached at cutover (spec 008, ADR 0005 §3).
- **Rationale**: the shell is not public until cutover; adding deploy logic here would be speculative.
