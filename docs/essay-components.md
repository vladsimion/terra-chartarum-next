# Essay components

Every component in `src/essays/components/` is listed here, with the question it serves, how it works from the keyboard, what it does under `prefers-reduced-motion` and what a reader gets with JavaScript off (spec 003 US4). `tests/essays/unit/component-docs.test.ts` fails when a component is added without a section. None of the components moves anything or needs a script: they print what the page model decided, so the reduced-motion and no-JavaScript lines are the same page.

## Interaction
- **Question it serves:** what is this interaction asking me to look at, and what should I conclude? It shows the declared question and expected interpretation above the author's component, then the evidence behind it (FR-007).
- **Keyboard:** the wrapper adds no controls of its own; the evidence notes open with Enter or Space on a native `<details>`, with visible focus. The author's component inside it must meet the same rule.
- **Reduced motion:** the wrapper has no motion. The author's component must give a static equivalent under `prefers-reduced-motion: reduce`.
- **Without JavaScript:** the declared question, interpretation and evidence are plain HTML. The author supplies a static equivalent as the wrapper's content; the fixture essay shows one.

## CitationExport
- **Question it serves:** how do I cite this essay in my own work? It links to the essay's BibTeX, RIS and CSL-JSON files.
- **Keyboard:** three ordinary links in a labelled `nav`, reached with Tab, followed with Enter, with visible focus and a 44px target.
- **Reduced motion:** nothing moves.
- **Without JavaScript:** the files are generated at build time, so the links work unchanged.

## EvidencePanel
- **Question it serves:** what is the evidence for this claim, who checked it and has the locator been verified? It shows the source, locator and verification state standing alone.
- **Keyboard:** the details open with Enter or Space on a native `<details>`, with visible focus.
- **Reduced motion:** nothing moves; the details open without animation.
- **Without JavaScript:** the native `<details>` needs no script.

## EvidenceDetails
- **Question it serves:** which source, locator and verification state lie behind a note or an interaction? It is the shared detail block of `Cite`, `EvidencePanel` and `Interaction`.
- **Keyboard:** the summary is focusable and opens with Enter or Space, with visible focus and a 44px target.
- **Reduced motion:** nothing moves.
- **Without JavaScript:** a native `<details>`, so it works unchanged.

## Cite
- **Question it serves:** which source supports this claim? It writes a numbered note marker in the prose and the note appears in the notes list.
- **Keyboard:** the marker is a plain in-page link, followed with Enter; the note links back to the marker.
- **Reduced motion:** the jump is an ordinary anchor with no scripted scrolling.
- **Without JavaScript:** anchors and a native `<details>`, so nothing needs a script.

## Notes
- **Question it serves:** what are the sources of the claims above, in the order they appear? It lists each cited note once, with its details.
- **Keyboard:** each note's back link and details are reached with Tab, with visible focus.
- **Reduced motion:** nothing moves.
- **Without JavaScript:** generated at build time, so identical.

## MapFigure
- **Question it serves:** which map is the essay talking about, and where can I inspect its record? It shows the caption, credit and rights from the map's public record, with a link to its catalogue record.
- **Keyboard:** the catalogue link is reached with Tab, with visible focus and a 44px target.
- **Reduced motion:** nothing moves.
- **Without JavaScript:** a static figure caption and a link.

## Bibliography
- **Question it serves:** what has this essay read, grouped by the kind of source? It shows the seven sections in the constitution's order, hiding empty ones.
- **Keyboard:** headings give a navigable outline; there are no controls.
- **Reduced motion:** nothing moves.
- **Without JavaScript:** generated at build time, so identical.

## RoomLinks
- **Question it serves:** which rooms does this essay belong to? It lists the primary room first, then the secondary rooms.
- **Keyboard:** each room is an ordinary link, with visible focus and a 44px target.
- **Reduced motion:** nothing moves.
- **Without JavaScript:** plain links.

## RelatedEssays
- **Question it serves:** what else should I read next? It lists public related essays in title order; a held essay never appears.
- **Keyboard:** each essay is an ordinary link, with visible focus and a 44px target.
- **Reduced motion:** nothing moves.
- **Without JavaScript:** plain links.

## EssayLayout
- **Question it serves:** what is the argument, before the apparatus? It puts the title, byline and thesis first, then the body, notes, bibliography, rooms and related essays, inside the shell with the essay's own accent.
- **Keyboard:** it adds no controls; the shell's skip link and landmarks apply.
- **Reduced motion:** nothing moves; the shell's motion tokens drop to zero.
- **Without JavaScript:** a static page.

## Timeline
- **Question it serves:** when, in relation to one another, did the things this essay names happen? An ordered list of events on a square-root-compressed axis (`src/essays/timeline.ts`, the legacy scale ported unchanged), each event a link to its place in the essay.
- **Keyboard:** every event is an ordinary link: Tab reaches it, Enter follows it, with visible focus and a 44px target. The axis and its ticks are `aria-hidden`.
- **Reduced motion:** nothing moves at any time; the positions are set at build time.
- **Without JavaScript:** the same markup; the component ships no script.

## CompareSlider
- **Question it serves:** where do two figures of the same thing agree and where do they part? Both figures are always in the page; a labelled radio group of five positions (0, 25, 50, 75, 100 %) sets how much of the second is revealed over the first, through a custom property and `:has()`.
- **Keyboard:** the radio group is native: Tab reaches the checked position, the arrow keys move the reveal, with visible focus and 44px targets.
- **Reduced motion:** the reveal's one transition runs on `--motion-fast`, which the tokens set to zero under `prefers-reduced-motion: reduce`.
- **Without JavaScript:** it needs none. In a browser without `:has()` the two figures stack in full and the radios are a plain form (the rules that use `:has()` sit inside `@supports`).

## Scrollytelling
- **Question it serves:** what does this one figure show, step by step? A sticky figure stays in view beside an ordered list of steps that scroll past it.
- **Keyboard:** the steps are prose and the figure is not a control, so there is nothing to focus; the page scrolls as any page does.
- **Reduced motion:** the step in view is emphasised with a CSS scroll-driven animation where the browser has it; under `prefers-reduced-motion: reduce` that animation is off and the steps are plain.
- **Without JavaScript:** it needs none. The figure is always visible; without scroll-driven animation (the rules sit inside `@supports`) no step is highlighted.

# Essay-specific components

The four components in `src/essays/bespoke/` serve the anchor essay alone (spec 009 research R1): a squeeze toggle, a stone plate, a section radar and a pit table. They are documented to the same four lines, and they meet the same rules: no script, every colour from the tokens, visible focus, 44px targets, nothing moving under `prefers-reduced-motion: reduce`, and every `:has()` rule inside an `@supports` block so a browser without it still shows all the content.

## StoneGallery
- **Question it serves:** do I read these stones as drawings, or as the epigrapher's squeeze, the stone's negative? It wraps the lapidarium's plates and offers one control, a checkbox labelled "Show as squeeze", which exchanges ink and paper on every plate at once by rewriting the `--plate-*` properties the plates read.
- **Keyboard:** the control is a native checkbox, visually hidden with its label as the visible control: Tab reaches it, Space toggles it, the label carries the focus ring and is at least 44px tall.
- **Reduced motion:** the plates' one background transition runs on `--motion-slow`, which the tokens set to zero under `prefers-reduced-motion: reduce`.
- **Without JavaScript:** it needs none. In a browser without `:has()` every plate stays a drawing and nothing is lost; the drawing is the reading that is served by default.

## StonePlate
- **Question it serves:** what does this one stone show? A figure holding the stone's drawing, named for assistive technology from the record of what it is, so the drawing itself carries no text that a reader has to decode.
- **Keyboard:** nothing to operate; it is a figure, not a control.
- **Reduced motion:** nothing moves; only the gallery's background change applies, and that is zeroed with the token.
- **Without JavaScript:** it needs none. The drawing is inline SVG written at build time, inked from the plate classes, whose colours come from the tokens. The vocabulary grew with the real drawings: five inks and three hands for the stones (`plate-rule`, `plate-ink`, `plate-water`, `plate-text`, `plate-paper`, `plate-muted`, `plate-water-text`, `plate-mark`, `plate-mark-rule`, `plate-caps`, `plate-label`, `plate-mono`), then `plate-rule-muted` and `plate-paper-rule` for a faint rule and a line cut in the paper, then the section's earth (`plate-soil`, `plate-soil-rule`, `plate-soil-pale`, `plate-find`, `plate-rust`, `plate-slate`, `plate-slate-rule`) for the trench's core sample.
- **A drawing that is not a stone:** `variant="drawing"` marks the figure `.essay-drawing` instead of `.stela-plate`. The essay's other three drawings use it — the two squeezes on the comparison desk and the core sample — so they take the same vocabulary and the same accessible name while the lapidarium's count of thirteen plates stays true.

## SectionRadar
- **Question it serves:** which of the Five Seals move between two strata, and by how much? One static SVG of two series on the same axes, with a table of the same values beneath it; the chart is hidden from assistive technology because the table says everything it says.
- **Keyboard:** each legend entry is a native button: Tab reaches it, focus emphasises its series and fades the other, with visible focus and a 44px target. Nothing is only available on hover.
- **Reduced motion:** the fade runs on `--motion-fast`, zero under `prefers-reduced-motion: reduce`; the chart itself is drawn at build time and never animates.
- **Without JavaScript:** it needs none. Both series and the whole table are always in the page; in a browser without `:has()` neither series fades and both read in full.

## PitTable
- **Question it serves:** what was this one place called in each of the thirteen strata, and does the corpus hold that attestation yet? The pit's cells from the essay's cell file, each row marked "not yet corpus-backed" until the Corpus Chartarum Daciae holds its attestation (ADR 0014).
- **Keyboard:** nothing to operate; it is a table. On a narrow screen it scrolls inside its own container.
- **Reduced motion:** nothing moves.
- **Without JavaScript:** it needs none. The rows are written at build time from the cell file through `renderCell`, so the corpus label is the same for every reader.
