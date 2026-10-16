# ADR 0008 — Design system: a dark identity, a derived light scheme, named accents, contrast as a tested property

**Status**: Accepted · **Date**: 2026-10-16 · **Jira**: TCX-3 · **Spec**: 002 · **Refines**: ADR 0004 §6

## Context
ADR 0004 §6 carries the live site's logo, typography and palette over as tokens. That palette is dark-only (canvas `#0a0806`, ink `#e8dec5`, gold `#d4b87a`), but spec 002 requires light and dark colour schemes (FR-003, US2). Essays also declare their own accent, which on the live site is a free colour.

## Decision
- **Dark is the identity and the default.** A light scheme is derived from the same hues and served when the reader's system asks for it (`prefers-color-scheme`). There is no manual toggle in v1: it needs JavaScript and persistence.
- **Contrast is tested on the token file, not only on pages.** A unit test computes WCAG AA (4.5:1 text, 3:1 UI and focus) for every declared foreground/background pair in both schemes; a new pair without a passing ratio fails.
- **Accents are named slots, not free colours.** The token set defines a small number of accent slots, each with a passing pair per scheme. An essay picks one by name, and the registry validates the name (spec 003 adds the field to the essay schema).
- **Fonts**: Cinzel, Crimson Pro and IBM Plex Mono carry over, self-hosted. The body face covers Latin, Latin-extended and Greek (Greek through EB Garamond); Cyrillic, Hebrew and Arabic come with the first essay that needs them.
- The logo is the text wordmark with the ✦ glyph, built from tokens, with an SVG favicon drawn from the glyph. No raster logo.

## Considered
Dark only (cheaper, but contradicts the spec and ignores readers who need light); free accent colours (cannot be contrast-guaranteed in both schemes); a manual toggle (JavaScript on every page against the 100 KB budget).

## Consequences
- The light scheme is new design work and is reviewed once; after that the contrast test guards both schemes.
- The spec's wording "light and dark themes" becomes "colour schemes", because the glossary already uses Theme for a family of layers.
- A free-colour essay accent from the live site is mapped to the nearest slot when its essay is rebuilt (spec 003).
