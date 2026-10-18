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
