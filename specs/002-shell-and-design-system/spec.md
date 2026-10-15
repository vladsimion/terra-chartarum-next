# Feature Specification: Publication Shell, Navigation & Design System

**Feature Branch**: `002-shell-and-design-system`
**Created**: 2026-10-15
**Status**: Draft
**Input**: "One publication, bespoke interiors: a shared shell, navigation and token system; accessibility and performance by contract." (Constitution VIII, IX)

**Historical question served**: How should readers *enter* a scholarly atlas — through argument, curation, space/time, objects, makers or evidence?

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Enter through the seven intellectual lenses (Priority: P1)
**Audience**: all four.
As any reader, the persistent header offers **Essays · Rooms · Atlas · Collection · Cartographers · Bibliography · About** (argument · curatorial structure · space/time · objects · makers · evidence · identity), so I can choose how I approach the material.

**Independent Test**: every page renders the seven-item header in that order; each item resolves; Colophon and Handbook appear in the footer, not the header.

**Acceptance Scenarios**:
1. **Given** any page, **When** it loads, **Then** the header shows exactly the seven items in canonical order.
2. **Given** the current section, **When** the header renders, **Then** that item is marked current to assistive technology (`aria-current`).
3. **Given** a phone-width viewport, **When** the reader opens navigation, **Then** all seven items are reachable without horizontal scroll and the menu is keyboard- and screen-reader-operable.

### User Story 2 — Coherent visual language with per-essay character (Priority: P1)
**Audience**: general readers; collectors.
As a reader moving between essays, the shell, typography and controls feel like one publication while each essay keeps its own accent and layout.

**Independent Test**: two fixture essays with different accents render with the shared shell and distinct accent tokens; visual snapshot tests pass for both in light and dark modes.

**Acceptance Scenarios**:
1. **Given** design tokens defined once, **When** any component renders, **Then** colours, type, spacing and motion come only from tokens (lint fails on raw values outside the token file).
2. **Given** an essay declaring an accent, **When** it renders, **Then** only accent tokens change.
3. **Given** a reader with reduced-motion preference, **When** any animated component renders, **Then** motion is removed or replaced with a static equivalent.

### User Story 3 — Accessibility and performance gates (Priority: P1)
**Audience**: all; editor.
As the editor, a page cannot ship if it fails the accessibility checks or the performance budget.

**Independent Test**: a fixture page that exceeds the JS budget or has an unlabeled control fails CI.

**Acceptance Scenarios**:
1. **Given** any built page, **When** CI runs, **Then** automated accessibility checks report zero serious/critical violations.
2. **Given** the performance budget in ADR 0004 (LCP ≤ 2.5 s, CLS ≤ 0.1, INP ≤ 200 ms, accessibility 100; ≤ 100 KB JS on content pages, ≤ 350 KB on the Atlas), **When** CI measures key templates on the mobile profile, **Then** each meets it or the build fails.
3. **Given** a browser without WebGL or JavaScript, **When** a page loads, **Then** core content and navigation remain usable.

### User Story 4 — Home page as front door (Priority: P2)
**Audience**: general readers; students.
As a first-time visitor, the home page explains what the site is, offers entry through featured essays, rooms and the Atlas, and offers a secondary "Read the Handbook" route beside the Atlas call to action.

### User Story 5 — About and Colophon (Priority: P3)
**Audience**: developers; researchers.
About states project identity, principles and authorship (without presenting the author as a professional historian); the Colophon (footer) documents production, data licences and technology.

### Edge Cases
- Long scholarly titles in the header area and breadcrumbs: must truncate gracefully without losing accessible names.
- Print view of an essay: shell chrome hidden, citations retained.
- Dark mode in high-detail map imagery: images are not colour-inverted.

## Requirements *(mandatory)*
- **FR-001**: The header MUST contain exactly the seven canonical items in canonical order; additions require a constitution-level ADR.
- **FR-002**: Footer MUST link Colophon, Atlas Handbook, licences and About.
- **FR-003**: All visual values MUST come from a single token source supporting light and dark themes.
- **FR-004**: Every interactive control MUST be keyboard operable with visible focus and an accessible name; touch targets approx. 44px where practical.
- **FR-005**: No state (uncertainty, lifecycle, selection) may be encoded by colour alone.
- **FR-006**: The site MUST honour `prefers-reduced-motion`.
- **FR-007**: CI MUST enforce accessibility and performance budgets on representative templates.
- **FR-008**: Pages MUST be statically generated and deployable to a CDN.
- **FR-009**: Supported: last two versions of Chrome, Edge, Firefox, Safari (macOS + iOS) and Samsung Internet; viewports ≥ 360 px (ADR 0004).
- **FR-010**: The site name remains Terra Chartarum (ADR 0001); the live site's logo, typography and core palette carry over, rebuilt as tokens (ADR 0004).
- **FR-011**: The shell MUST provide a tombstone page for superseded entities (linking to the successor) and a not-found page for unknown or retired IDs and deep links; neither ever returns a server error (spec 001 edge case).

### Key Entities
- **Design token set**: colour, type, spacing, motion, radius; light/dark; per-essay accent slots.
- **Navigation item**: label, target, lens meaning, order.

## Success Criteria *(mandatory)*
- **SC-001**: 100% of templates pass automated accessibility checks with zero serious/critical issues.
- **SC-002**: 100% of templates meet the ratified performance budget on the reference mobile profile.
- **SC-003**: A keyboard-only user can reach every header destination and return to content in under 10 key presses from page load.
- **SC-004**: Zero raw colour/spacing literals outside the token source (lint-enforced).
