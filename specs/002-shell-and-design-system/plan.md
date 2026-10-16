# Implementation Plan: Publication Shell, Navigation & Design System

**Branch**: `002-shell-and-design-system` | **Date**: 2026-10-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-shell-and-design-system/spec.md`, clarified on 2026-10-16 after the grill (ADR 0008, ADR 0009).

## Summary

The first reader-facing code in the repository: an Astro static site containing only the shell. A single CSS token file holds the dark (default) and derived light colour schemes and a set of named accent slots; a destination list is the one source for the header, the footer, the breadcrumbs and the stub pages; the home, About and Colophon pages are content-collection Markdown marked `draft` until the author writes them. A framework-free `registry` module already exists, so the build calls it (T119b of spec 001): the gate runs before any page is generated, and the home page lists the registry's public essays. Accessibility, performance and token rules are enforced by tests and CI: Vitest on the token file and the destination list, Stylelint on raw values, Playwright with axe on keyboard, no-JavaScript and 360 px behaviour, and Lighthouse CI against the ADR 0004 budgets.

## Technical Context

**Language/Version**: TypeScript strict, Node 24 (`.nvmrc`), Astro 7 (latest 7.x at scaffold time; the task pins the exact version and checks it is at least two weeks old).

**Primary Dependencies**: `astro`, `@astrojs/check`; self-hosted fonts from `@fontsource-variable/{cinzel,crimson-pro,eb-garamond}` and `@fontsource/ibm-plex-mono`; dev only: `stylelint` (with `postcss-html` for `.astro` styles), `postcss` (to read the token file), `@playwright/test`, `@axe-core/playwright`, `@lhci/cli`. No UI framework, no client-side JavaScript library.

**Storage**: Files. Page copy in an Astro content collection (`src/content/pages/*.md`, Zod schema); records come from the existing `content/` registry through `src/registry/`.

**Testing**: Vitest (tokens, contrast, destinations, breadcrumbs, the stub/draft scanner), Playwright (keyboard, no-JS, 360 px, touch targets, visual snapshots), `@axe-core/playwright` (accessibility), Lighthouse CI (ADR 0004 budgets).

**Target Platform**: Static HTML for Cloudflare Pages; browsers per ADR 0004 (last two versions of Chrome, Edge, Firefox, Safari and iOS Safari, Samsung Internet; viewports ≥ 360 px).

**Project Type**: Web site (single project) added beside the existing `src/registry/` module.

**Performance Goals**: ADR 0004 for every listed template: LCP ≤ 2.5 s, CLS ≤ 0.1, INP ≤ 200 ms, Lighthouse accessibility 100; ≤ 100 KB compressed JS on content pages. The shell itself ships **no JavaScript** (no islands, no router), so its budget is 0 KB.

**Constraints**: Static output only; no client-side router; every visual value from the token file; no site search in the header; WebGL not used.

**Scale/Scope**: Seven lens destinations (six stubs at first), footer destinations, home, About, Colophon, 404, a breadcrumbed content page; two fixture essays for the tests. The registry holds about 60 maps and a handful of essays.

## Constitution Check

*GATE: passes before Phase 0 and again after Phase 1 design.*

- [x] **Historical question (I)**: "How should readers *enter* a scholarly atlas: through argument, curation, space/time, objects, makers or evidence?" (spec header). The seven lenses are that question made navigable.
- [x] **No duplicated canonical records or private geometry (II, V)**: the shell stores no scholarly records. The home page lists essays from the registry's public projection; licence lines are generated from each record's `rights`, never retyped.
- [x] **Uncertainty and provenance as fields (III, VI)**: not modelled here. The shell shows lifecycle and uncertainty only through components later specs add, and FR-005 forbids colour-only encoding.
- [x] **Bespoke interactions (IV)**: none in this spec; no interaction makes a historical claim.
- [x] **No dynamic infrastructure (VII)**: static output, no server, database or runtime API; the registry gate runs at build time.
- [x] **Accessibility and performance impact (IX)**: the shell adds 0 KB of JavaScript. The navigation disclosure is native HTML. The impact is stated per template in the matrix ([contracts/ci-matrix.md](./contracts/ci-matrix.md)) and enforced in CI.
- [x] **Test strategy (X)**: every acceptance scenario maps to a named test (table below), written first under the `tdd` skill.

**Result**: no violations; Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/002-shell-and-design-system/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── tokens.md
│   ├── destinations.md
│   ├── build-check.md
│   ├── registry-integration.md
│   └── ci-matrix.md
└── tasks.md            # /speckit-tasks
```

### Source code (repository root)

```text
astro.config.mjs                    # static output, the registry integration
LICENSE                             # MIT (ADR 0009)
.stylelintrc.json                   # no raw colour or spacing values outside the token file
playwright.config.ts
lighthouserc.json                   # ADR 0004 budgets, mobile profile
src/
├── shell/
│   ├── destinations.ts             # the one list: lenses, footer links, owner spec, built or stub
│   ├── breadcrumbs.ts              # pure: path + destinations + title -> items
│   ├── layouts/Base.astro          # skip link, landmarks, lang, header, footer
│   ├── components/                 # Wordmark, Header, NavDisclosure, Footer, Breadcrumbs, RightsLine, StubPage
│   ├── styles/
│   │   ├── tokens.css              # the single token source (dark default, light by media query)
│   │   ├── contrast-pairs.ts       # declared foreground/background pairs the test checks
│   │   └── base.css                # reset, type, focus, print, reduced motion (tokens only)
│   └── fonts.ts                    # which font subsets each template loads
├── content/
│   ├── config.ts                   # Zod schema for page copy
│   └── pages/{home,about,colophon}.md   # draft copy
├── pages/                          # index, about, colophon, 404, the stub destinations
├── integrations/registry.ts        # runs the gate before pages, calls buildSiteData after (spec 001 T119b)
└── registry/                       # existing
scripts/
└── shell-check.ts                  # lists stubs and draft copy; --cutover fails if any
tests/shell/
├── unit/                           # tokens, contrast, destinations, breadcrumbs, shell-check
├── e2e/                            # keyboard, no-JS, 360 px, touch targets, axe, snapshots
└── fixtures/registry/              # a small public registry with two essays for the home page and snapshots
```

**Structure Decision**: the shell lives in `src/shell/` so it is separate from `src/registry/` (which stays framework-free and importable by R pipelines and scripts). Pages and the Astro integration sit where Astro expects them. Tests are split by what they exercise: Vitest for pure logic, Playwright for the built site.

## Acceptance-scenario → test map

| Story | Scenarios | Test (under `tests/shell/`) |
|---|---|---|
| US1 seven lenses | 1 (exactly seven, in order) | `unit/destinations.test.ts`, `e2e/header.spec.ts` |
| | 2 (`aria-current`) | `e2e/header.spec.ts` |
| | 3 (phone width, no horizontal scroll, disclosure works without JS) | `e2e/mobile-nav.spec.ts` |
| | 4 (stub resolves, check lists it) | `e2e/stubs.spec.ts`, `unit/shell-check.test.ts` |
| US2 visual language | 1 (tokens only, lint fails on raw values) | `unit/lint-rules.test.ts` (runs Stylelint on good and bad fixtures) |
| | 2 (accent changes only accent tokens; unknown slot fails) | `unit/accents.test.ts`, `e2e/snapshots.spec.ts` |
| | 3 (reduced motion) | `e2e/reduced-motion.spec.ts` |
| US3 gates | 1 (axe: zero serious or critical) | `e2e/axe.spec.ts` over the template list |
| | 2 (ADR 0004 budgets) | Lighthouse CI over the template list (`lighthouserc.json`) |
| | 3 (no WebGL or JavaScript) | `e2e/no-js.spec.ts` |
| | 4 (token contrast AA, both schemes) | `unit/contrast.test.ts` |
| US4 home | independent test | `e2e/home.spec.ts` (essays from the fixture registry, rooms, Atlas and Handbook calls) |
| US5 About, Colophon | independent test | `e2e/about-colophon.spec.ts`, `unit/licences.test.ts` |
| FR-004 touch targets | | `e2e/touch-targets.spec.ts` at 360 px |
| FR-005 not by colour alone | | `e2e/not-colour-alone.spec.ts` (current item also carries text or shape) |
| FR-008 static output | | `unit/static-output.test.ts` (build emits HTML only, no server entry) |
| FR-009 browsers and viewports | | Playwright projects on Chromium, Firefox, WebKit and a 360 px phone (`playwright.config.ts`) |
| Edge case: print | | `e2e/print.spec.ts` |
| FR-013 fonts | | `e2e/fonts.spec.ts` (Greek and extended-Latin sample renders from a shell face) |
| FR-015 stubs and drafts | | `unit/shell-check.test.ts` |
| FR-016 breadcrumbs | | `unit/breadcrumbs.test.ts`, `e2e/breadcrumbs.spec.ts` |
| FR-017 licences | | `unit/licences.test.ts` (LICENSE present; RightsLine renders only what the record says) |
| FR-018 skip link, landmarks, lang, 404 | | `e2e/landmarks.spec.ts` |
| SC-003 keyboard reach | | `e2e/keyboard.spec.ts` (under 10 key presses) |
| SC-004 raw literals | | `unit/lint-rules.test.ts` |

## Complexity Tracking

Empty: no constitution violations.
