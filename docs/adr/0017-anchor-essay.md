# ADR 0017 — The anchor essay: rebuilt whole as a faithful port, with no JavaScript, releasing only what it uses

**Status**: Accepted · **Date**: 2026-10-20 · **Spec**: 009 · **Extends**: ADR 0002 (v1 anchor), ADR 0004 (budgets), ADR 0016 (migration); **Refines**: spec 003 (bespoke interactions)

## Context
ADR 0002 makes *Terra Sigillata · Lapidarium Dacicum* (Trench A) the v1 anchor, and spec 008's `cutover:check` fails until it is published and released. The legacy essay (`dacia.mdx` at the pinned snapshot `e82afd9`) is 14,988 words in six sections, with five interactive pieces (a timeline, a squeeze toggle, a compare slider, a scroll-linked core sample, three radar charts) and 16 `CorpusRef` lines. It names no maps and cites twelve sources; six of its twelve stones have a map record in the registry. The successor framework (spec 003) asks more of an essay than the legacy site did: a declared question, interpretation and evidence behind every interaction, a no-JavaScript equivalent for each, the 100 KB page budget (ADR 0004), and every cited record public at Publish. Measured, the legacy scripts weigh about 4.4 KB gzipped in total, but three of the five pieces fail without JavaScript (a dead toggle, a slider frozen at 50%, a drawing that is probably invisible).

## Decision
- **One essay, the whole of it, as a faithful port.** Slug `dacia-lapidarium`, `legacy_url` `/essays/dacia/`. The text is the author's and changes only where the framework forces it; every changed claim (a count, a derived duration, a title the body rule rejects) is listed and approved by the author. Legacy frontmatter with no successor field is dropped.
- **No JavaScript.** Every interaction is rebuilt in native HTML and CSS: the compare slider around a native range input, the core sample as a sticky static layout, the radar charts as static SVG with a table of values, the squeeze toggle as a CSS-only checkbox, the timeline unchanged. Five are declared as interactions (the slider, the core sample, the three charts); the timeline and the toggle are plain presentation.
- **Only the evidence the framework requires:** one evidence record for each stone's source and one for each declared interaction, with locators supplied by the author.
- **Release only what the essay uses:** the twelve sources and their bibliography entries, the six maps it shows through `MapFigure`, and the evidence. Everything else stays held, and the prose names only released things. The six stones with no map record stay source-only.
- **The 52 pit cells are the essay's own local data**, taken from its tables (ADR 0002's amendment stands: no CND import in v1), cross-checked once against the legacy attestation CSV.
- **Delivered as spec 009 in about ten small pull requests.** The essay stays held until the Publish stage. The author signs all four sign-offs, and the dossier records that no independent review took place.

## Considered
Porting the legacy scripts (they fit the budget, but three fail without JavaScript and would be rewritten anyway); a first cut of the essay (the author chose the whole); splitting it into several essays (a Trench is one essay); releasing all forty pilot places and every Dacia source (more public surface than the essay needs).

## Consequences
- The reader loses direct dragging on the slider, the scroll-linked highlight where the browser lacks CSS scroll-driven animation, and the toggle's "Lapis"/"Calc" readout. The essay page ships no script, so the 100 KB budget cannot be at risk.
- A bespoke interaction in this repository is an HTML and CSS component placed inside `<Interaction>`, with its question, interpretation and evidence declared in the record.
- Releasing the six maps needs a rights statement on each (four have none), and the open `witness_kind` and `makers` questions of their review worksheet answered.
- Two list items in the appendix are reworded, because the body rule rejects the registry titles of `peutinger` and `hereford` typed in prose.
- The essay's page type joins the CI template lists (axe and Lighthouse), which today hold only fixture essays.
- Publishing re-runs `registry inventory`, and the archive project's redirect for `/essays/dacia/` is applied by pull request and signed `redirect_switched`.
