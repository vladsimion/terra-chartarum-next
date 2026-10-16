# Data Model: Publication Shell, Navigation & Design System

The shell stores no scholarly records. Its data is design values, a destination list and page copy.

## Design token set (`src/shell/styles/tokens.css`)

| Group | Names (prefix `--`) | Notes |
|---|---|---|
| Colour, neutral | `canvas`, `panel`, `panel-raised`, `ink`, `ink-muted`, `line` | carried over from the live site for the dark scheme; the light values are derived and reviewed once |
| Colour, accent | `accent` (the active slot), `accent-<slot>` for each slot | see Accent slot below |
| Colour, state | `focus`, `link`, `link-visited` | state is never colour alone (FR-005): current item also carries text or a shape |
| Type | `font-display`, `font-body`, `font-mono`, `step--2` … `step-5` | fluid scale carried over |
| Space and layout | `space-1` … `space-8`, `shell-max`, `content-max`, `prose-max`, `target-min` (44 px) | |
| Motion | `motion-fast`, `motion-slow` | `0s` under `prefers-reduced-motion: reduce` |
| Shape | `radius` | |

Each colour token has a dark value (on `:root`) and a light value (in `@media (prefers-color-scheme: light)`).

## Contrast pair (`src/shell/styles/contrast-pairs.ts`)

| Field | Rule |
|---|---|
| `fg`, `bg` | token names; both must exist in `tokens.css` |
| `kind` | `text` (4.5:1) or `ui` (3:1, includes focus rings and borders that carry meaning) |
| `note` | where the pair is used |

Every colour token is in at least one pair or is listed as `decorative`. A pair fails the test in a scheme if its ratio is below the kind's minimum.

## Accent slot

A named set of values inside the token file: `accent-<slot>` with a passing pair per scheme. The v1 set has six slots: `gold` (the house default), `verdigris`, `madder`, `indigo`, `umber`, `sage`. Names are the contract; the exact values are set when the tokens are written and are accepted only if the contrast test passes. An essay selects one by name in its front matter (field added by spec 003); an unknown name fails the build.

## Destination (`src/shell/destinations.ts`)

| Field | Rule |
|---|---|
| `id` | `essays`, `rooms`, `atlas`, `collection`, `cartographers`, `bibliography`, `about` for lenses; `colophon` and `handbook` for the footer (the footer's licences link is `/colophon/#licences`, a section of the Colophon, not a destination) |
| `label`, `href` | label as shown; `href` ends with `/` |
| `placement` | `header` or `footer` |
| `lens` | one-line meaning for the seven lenses (argument, curatorial structure, space and time, objects, makers, evidence, identity) |
| `order` | header order is fixed: the seven in the canonical order |
| `owner` | spec that builds the page (`003` … `007`, `002` for About and Colophon) |
| `status` | `built` or `stub` |

Invariants (tested): exactly seven `header` entries in the canonical order; every `built` entry has a page and every `stub` entry has none; `href` values are unique.

## Breadcrumb item

`{ label, href | null }`. The last item has no `href` and is marked `aria-current="page"`. The home page and the seven lens landings have no breadcrumb.

## Page copy (content collection `pages`)

| Field | Rule |
|---|---|
| `title` | string, required |
| `description` | string, required |
| `draft` | boolean, default `true`; a draft page renders with `data-draft` |
| `lang` | BCP 47 tag, default `en`; becomes the page's `lang` |

## Stub marker

A page rendered by `StubPage.astro` carries `data-stub="<destination id>"` and the visible text "in preparation". The build check reports it with its owner spec.

## Template list (`tests/shell/ci-templates.json`)

The one file listing the templates that axe, Lighthouse and the snapshots run over: `home`, `stub`, `about`, `colophon`, `404`, `content-with-breadcrumb`, `essay-fixture-a`, `essay-fixture-b`, each in `dark` and `light`. A later spec adds its templates here; a test fails if a built page type is missing from the list.
