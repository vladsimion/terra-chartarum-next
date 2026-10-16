# Contract: the essay body

A body is `content/essay/<id>.mdx`. The layout supplies the framework components; the author does not import them. Props are string literals only, because the gate scans the body for them (`essay-body.ts`) and cannot resolve a computed value (`ESSAY-BODY-DYNAMIC`).

| Tag | Props | Renders | Gate sees it as |
|---|---|---|---|
| `<MapFigure map="<map id>" />` | `map` | a figure; caption, attribution and rights come from the map's public record, with a link to its catalogue record | a body entity that must exist and, at Publish, be public |
| `<Cite evidence="<evidence id>" />` | `evidence`, optional `note` | a note marker; the note shows the Chicago text and, in a native `<details>`, source, locator and verification state (pending is marked with text, not colour alone) | an Evidence record whose source is not a finding aid |
| `<EvidencePanel evidence="<evidence id>" />` | `evidence` | the same data as a citation's panel, standing alone | as `Cite` |
| `<Interaction id="<declared id>" />` | `id` | the declared question and expected interpretation above the interaction (the interaction itself is the author's component inside it) | an id that must be declared in `interactions[]` |
| `<CitationExport />` | none | links to the essay's BibTeX, RIS and CSL-JSON files | none |

Rules for authors, each enforced:

- A map title, caption, rights line or attribution typed into the body instead of coming from the record is a violation of FR-004 (the test scans for a literal copy of a referenced record's title or caption).
- A bespoke layout is allowed but must still sit in the shell and use tokens (spec 002); the token lint runs over essay styles too.
- A held entity's title, slug or ID must not appear in the body text; the leak scan checks the built output.
