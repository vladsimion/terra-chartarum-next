# Contract: the interaction components

Seven components, none shipping script. The page passes them to the body through the same `components` map as `MapFigure` and `Cite`; props are string literals (`ESSAY-BODY-DYNAMIC`); all colour, type size, spacing and motion come from `tokens.css` (the token lint covers `.astro` and `.css`). The three shared ones are sections of `docs/essay-components.md` (question, keyboard, reduced motion, no-script), which `component-docs.test.ts` requires. A declared interaction sits inside `<Interaction id="…">`, which prints its question, interpretation and evidence as plain HTML above and below the component.

## Shared (`src/essays/components/`)

| Component | Props | Markup | Keyboard | Without script / reduced motion |
|---|---|---|---|---|
| `Timeline` | `events` (a JSON string literal of `{year, label, href}`), `from`, `to` | an ordered list of links on a square-root-compressed axis, the axis `aria-hidden` | each event is an `<a>`, Tab and Enter, visible focus, 44px target | the same markup; nothing moves |
| `CompareSlider` | `label`, a `before` slot and an `after` slot | two stacked figures; a native `<input type="range">` (labelled) drives a CSS custom property that clips the top figure | the range input: arrows, Home, End; visible focus | both figures are always in the DOM and readable; with script off the range input still works (it needs none); nothing animates |
| `Scrollytelling` | a `figure` slot and `step` children | a sticky figure beside a list of steps; the active step highlighted by CSS scroll-driven animation where supported | steps are plain prose and need no focus handling; the figure is not a control | the figure is always visible; without scroll-driven animation no step is highlighted; under reduced motion nothing animates |

`Timeline`'s axis scale (the square-root compression of years) is a pure function in `src/essays/timeline.ts`, unit-tested.

## Essay-specific (`src/essays/bespoke/`)

| Component | Props | Markup | Keyboard | Without script / reduced motion |
|---|---|---|---|---|
| `StoneGallery` | none; wraps the stone plates | a labelled, visually hidden checkbox ("Show as squeeze") with `:has()` switching the plates between drawing and squeeze | a native checkbox: Space, visible focus, 44px target | works with script off; the plates default to the drawing; nothing animates |
| `StonePlate` | `stone` (a short id such as `vesconte`), `label` | a `<figure>` holding the stone's drawing (a slot), `role="img"` and an `aria-label` on the drawing | none | static |
| `SectionRadar` | `axes`, `a`, `b` (the values as string literals), `labelA`, `labelB` | static SVG on tokens, plus a table of the values; legend entries are native buttons that emphasise a series through `:has()` | legend buttons: Tab, Enter, focus emphasises | the chart and the table are always present; no animation |
| `PitTable` | `pit` | the pit's 13 cells from the cell file through `renderCell`, each row marked "not yet corpus-backed" | none (a table) | static |

## Rules every component meets (each tested)

- No `<script>`, no `client:*` directive, no inline event handler, no reference to a JavaScript file in the built page.
- No hard-coded colour in the markup or the CSS; the drawings use classes whose colours come from tokens, and the build test fails on a hex colour in the essay's built SVG.
- Contrast passes in both colour schemes (axe, `tests/shell/contrast-pairs.ts` for any new pair).
- Under `prefers-reduced-motion: reduce` nothing moves.
- A browser without `:has()` or scroll-driven animation still shows all the content and every control working in a plain form: every such rule sits inside an `@supports` block (tested by `progressive-css.test.ts`) and the base rules show everything.
