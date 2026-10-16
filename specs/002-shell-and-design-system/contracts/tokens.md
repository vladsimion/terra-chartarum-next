# Contract: design tokens

One file, `src/shell/styles/tokens.css`, holds every visual value. Nothing else in the repository may contain a hex colour, a colour function or a length literal in a spacing, size or radius property (Stylelint enforces it; a test lints a good and a bad fixture).

- **Colour schemes**: dark values on `:root`; light values in `@media (prefers-color-scheme: light) { :root { … } }`. `color-scheme: dark light` is declared. No class, attribute or script switches the scheme.
- **Naming**: custom properties only, prefixed by role (`--canvas`, `--ink`, `--accent-gold`, `--step-1`, `--space-4`). Components use the semantic names; accent slot names appear only in the token file and in `[data-accent="<slot>"]` selectors that set `--accent`.
- **Accent**: `<body data-accent="<slot>">` sets `--accent` to `--accent-<slot>`; the default slot is `gold`. An unknown slot name is a build error raised where the page is generated, never silently the default.
- **Contrast**: `contrast-pairs.ts` lists every fg/bg pair; the test resolves each in both schemes; text pairs need 4.5:1, UI and focus pairs 3:1. Every colour token is in a pair or marked `decorative`.
- **Motion**: `--motion-fast` and `--motion-slow` are `0s` under `prefers-reduced-motion: reduce`.
- **Not allowed**: `filter` on images, inline `style=` attributes.
