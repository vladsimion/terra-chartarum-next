# Feature Specification: Publication Shell, Navigation & Design System

**Feature Branch**: `002-shell-and-design-system`
**Created**: 2026-10-15
**Status**: Clarified (2026-10-16)
**Input**: "One publication, bespoke interiors: a shared shell, navigation and token system; accessibility and performance by contract." (Constitution VIII, IX)

**Historical question served**: How should readers *enter* a scholarly atlas — through argument, curation, space/time, objects, makers or evidence?

## Clarifications

### Session 2026-10-16 (grill, ADRs 0008 and 0009)
- Q: Light and dark? → A: Dark is the identity and the default; a derived light colour scheme is served when the reader's system asks for it (`prefers-color-scheme`); no manual toggle in v1. ("Colour scheme", not "theme": Theme is a family of layers in the glossary.)
- Q: How is contrast guaranteed? → A: A unit test computes WCAG AA (4.5:1 text, 3:1 UI and focus) for every declared foreground/background pair in both schemes; a new pair without a passing ratio fails.
- Q: Which scripts must the body face render? → A: Latin, Latin-extended and Greek, self-hosted with `font-display: swap`; Cyrillic, Hebrew and Arabic come with the first essay that needs them.
- Q: What is the logo? → A: The text wordmark "Terra Chartarum" with the ✦ glyph, built from tokens, plus an SVG favicon drawn from the glyph; no raster logo.
- Q: Site search in the header? → A: No. The header is the wordmark and the seven items; place search lives in the Atlas (spec 005).
- Q: Mobile navigation? → A: A native `<details>`/`<summary>` disclosure at narrow widths (no JavaScript), a plain list at wider widths.
- Q: Client-side page router? → A: None in v1; pages are full static loads.
- Q: Destinations that later specs build? → A: They ship as stub pages ("in preparation") from one reusable template, replaced by the owning spec; a build check lists every stub, informational during development and a hard failure at spec 008's cutover acceptance.
- Q: Per-essay accent? → A: A small set of named accent slots in the token set, each with a passing pair per colour scheme; an essay picks one by name; free colours are not allowed; the registry validates the name (spec 003 adds the field).
- Q: Home page curation? → A: None in v1: all published and released essays (title order), the seven rooms, and the Atlas and Handbook calls to action.
- Q: Licences? → A: Code MIT, original prose and data CC BY 4.0, every image, dataset and layer shows its own licence generated from its registry `rights`; a `LICENSE` file is added with the shell (ADR 0009).
- Q: Breadcrumbs? → A: A server-rendered breadcrumb (`nav` with `aria-label="Breadcrumb"`, `aria-current` on the last item) on every page except the home page and the seven lens landings; long titles truncate visually with the full text left in the page.
- Q: Which templates does CI measure while only the shell exists? → A: Home, a stub page, About, Colophon, the 404 page, a breadcrumbed content page, and two fixture essays with different accent slots, each in both colour schemes. The list lives in one file so a template cannot be left out silently; each later spec adds its own templates to it as it ships.
- Q: Minimum touch-target size? → A: 44 × 44 CSS px for every standalone control (navigation items, the disclosure button, breadcrumb links, footer links, buttons); inline links inside running text are exempt; asserted by a Playwright test at 360 px width.
- Q: Who writes the home, About and Colophon copy? → A: Placeholder copy marked `draft: true`; the author writes the final text, including the authorship statement; the same build check lists draft copy, with the same cutover rule as stub pages.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Enter through the seven intellectual lenses (Priority: P1)
**Audience**: all four.
As any reader, the persistent header offers **Essays · Rooms · Atlas · Collection · Cartographers · Bibliography · About** (argument · curatorial structure · space/time · objects · makers · evidence · identity), so I can choose how I approach the material.

**Independent Test**: every page renders the seven-item header in that order; each item resolves; Colophon and Handbook appear in the footer, not the header.

**Acceptance Scenarios**:
1. **Given** any page, **When** it loads, **Then** the header shows exactly the seven items in canonical order.
2. **Given** the current section, **When** the header renders, **Then** that item is marked current to assistive technology (`aria-current`).
3. **Given** a phone-width viewport, **When** the reader opens navigation, **Then** all seven items are reachable without horizontal scroll and the menu (a native disclosure, working without JavaScript) is keyboard- and screen-reader-operable.
4. **Given** a destination that a later spec owns, **When** it is not yet built, **Then** it resolves to a stub page marked "in preparation", and the build check lists it.

### User Story 2 — Coherent visual language with per-essay character (Priority: P1)
**Audience**: general readers; collectors.
As a reader moving between essays, the shell, typography and controls feel like one publication while each essay keeps its own accent and layout.

**Independent Test**: two fixture essays with different accents render with the shared shell and distinct accent tokens; visual snapshot tests pass for both in the dark and light colour schemes.

**Acceptance Scenarios**:
1. **Given** design tokens defined once, **When** any component renders, **Then** colours, type, spacing and motion come only from tokens (lint fails on raw values outside the token file).
2. **Given** an essay declaring an accent slot by name, **When** it renders, **Then** only accent tokens change, and an unknown slot name fails the build.
3. **Given** a reader with reduced-motion preference, **When** any animated component renders, **Then** motion is removed or replaced with a static equivalent.

### User Story 3 — Accessibility and performance gates (Priority: P1)
**Audience**: all; editor.
As the editor, a page cannot ship if it fails the accessibility checks or the performance budget.

**Independent Test**: a fixture page that exceeds the JS budget or has an unlabeled control fails CI.

**Acceptance Scenarios**:
1. **Given** any built page, **When** CI runs, **Then** automated accessibility checks report zero serious/critical violations.
2. **Given** the performance budget in ADR 0004 (LCP ≤ 2.5 s, CLS ≤ 0.1, INP ≤ 200 ms, accessibility 100; ≤ 100 KB JS on content pages, ≤ 350 KB on the Atlas), **When** CI measures key templates on the mobile profile, **Then** each meets it or the build fails.
3. **Given** a browser without WebGL or JavaScript, **When** a page loads, **Then** core content and navigation remain usable.
4. **Given** the token file, **When** the tests run, **Then** every declared foreground/background pair meets WCAG AA contrast in both colour schemes.

### User Story 4 — Home page as front door (Priority: P2)
**Audience**: general readers; students.
As a first-time visitor, the home page explains what the site is, offers entry through featured essays, rooms and the Atlas, and offers a secondary "Read the Handbook" route beside the Atlas call to action. It lists all published and released essays (title order) and the seven rooms; there is no featured mechanism in v1.

### User Story 5 — About and Colophon (Priority: P3)
**Audience**: developers; researchers.
About states project identity, principles and authorship (without presenting the author as a professional historian); the Colophon (footer) documents production, data licences and technology.

### Edge Cases
- Long scholarly titles in the header area and breadcrumbs: must truncate gracefully without losing accessible names.
- Print view of an essay: shell chrome hidden, citations retained.
- Dark colour scheme and high-detail map imagery: images are not colour-inverted.
- Greek and extended-Latin names (for example Ptolemy's, Romanian place names) render in the body face, not a fallback.
- A draft text or stub page left in a built site: the build check reports it; it must not survive to cutover.

## Requirements *(mandatory)*
- **FR-001**: The header MUST contain exactly the seven canonical items in canonical order; additions require a constitution-level ADR.
- **FR-002**: Footer MUST link Colophon, Atlas Handbook, licences and About.
- **FR-003**: All visual values MUST come from a single token source (one CSS custom-properties file) with a value for each of the dark (default) and light colour schemes; the light scheme is chosen by the reader's system preference, with no manual toggle in v1.
- **FR-004**: Every interactive control MUST be keyboard operable with visible focus and an accessible name; every standalone control (navigation items, the disclosure button, breadcrumb links, footer links, buttons) MUST be at least 44 × 44 CSS px, with inline links in running text exempt, asserted by a test at 360 px width.
- **FR-005**: No state (uncertainty, lifecycle, selection) may be encoded by colour alone.
- **FR-006**: The site MUST honour `prefers-reduced-motion`.
- **FR-007**: CI MUST enforce accessibility and performance budgets on the listed templates: home, a stub page, About, Colophon, 404, a breadcrumbed content page and two fixture essays with different accent slots, each in both colour schemes. The list is one file; every later spec adds its own templates to it.
- **FR-008**: Pages MUST be statically generated and deployable to a CDN.
- **FR-009**: Supported: last two versions of Chrome, Edge, Firefox, Safari (macOS + iOS) and Samsung Internet; viewports ≥ 360 px (ADR 0004).
- **FR-010**: The site name remains Terra Chartarum (ADR 0001); the live site's logo (the text wordmark with the ✦ glyph, plus an SVG favicon from the glyph), typography and core palette carry over, rebuilt as tokens (ADR 0004, ADR 0008).
- **FR-011**: Every token foreground/background pair MUST meet WCAG AA contrast (4.5:1 text, 3:1 UI and focus) in both colour schemes, asserted by a test on the token file.
- **FR-012**: Per-essay accents MUST be named accent slots from the token set, each with a passing pair per colour scheme; free colours are not accepted.
- **FR-013**: Body text MUST render Latin, Latin-extended and Greek in self-hosted faces with `font-display: swap`.
- **FR-014**: The header MUST contain no site-wide search; narrow-width navigation MUST be a native disclosure that works without JavaScript; there MUST be no client-side page router.
- **FR-015**: A destination owned by a later spec MUST resolve to a stub page from one reusable template, and a build check MUST list every stub and every piece of `draft: true` copy; both MUST fail spec 008's cutover acceptance.
- **FR-016**: Every page except the home page and the seven lens landings MUST show a server-rendered breadcrumb.
- **FR-017**: The Colophon and footer MUST state code under MIT and original prose and data under CC BY 4.0, and every image, dataset and layer MUST show its own licence generated from its registry `rights`; a `LICENSE` file MUST ship with the shell (ADR 0009).
- **FR-018**: Every page MUST have a skip-to-content link, landmark regions and a `lang` attribute taken from the content; the site MUST have a static 404 page.

### Key Entities
- **Design token set**: colour, type, spacing, motion, radius; a value for each colour scheme (dark default, light derived); named accent slots.
- **Stub page**: a placeholder at a destination a later spec owns, from one template, listed by the build check.
- **Draft copy**: placeholder prose marked `draft: true` until the author writes the final text.
- **Navigation item**: label, target, lens meaning, order.

## Success Criteria *(mandatory)*
- **SC-001**: 100% of the listed templates pass automated accessibility checks with zero serious/critical issues.
- **SC-002**: 100% of the listed templates meet the ratified performance budget on the reference mobile profile.
- **SC-003**: A keyboard-only user can reach every header destination and return to content in under 10 key presses from page load.
- **SC-004**: Zero raw colour/spacing literals outside the token source (lint-enforced).
- **SC-005**: Zero stub pages and zero `draft: true` copy in a build accepted for cutover (checked by spec 008's acceptance).
- **SC-006**: Every declared token colour pair passes WCAG AA in both colour schemes.
