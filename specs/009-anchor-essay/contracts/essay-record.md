# Contract: the essay's files

The shapes are spec 003's. This contract lists the files this essay adds and what each must satisfy before the stage that needs it.

## The record, the body and the cell file

```text
content/essay/essay-NNNNNN.yaml        # data-model.md "Essay record"
content/essay/essay-NNNNNN.mdx         # the body
content/essay/essay-NNNNNN.cells.json  # the 52 cells
```

The body uses only the tags of spec 003's mdx-body contract plus the seven components of [components.md](./components.md):

| Tag | Where | Notes |
|---|---|---|
| `<MapFigure map="…" />` | one per stone whose map is shown (up to six) | title and caption come from the record; the literal-copy rule rejects a typed title |
| `<Cite evidence="…" />` | each stone with a source (twelve); the interactions | a plain source line backed by the evidence record; no Atlas link |
| `<Interaction id="…">` | the five declared interactions | each wraps its component, with the question and interpretation printed from the record |
| `<Timeline>`, `<CompareSlider>`, `<Scrollytelling>`, `<StoneGallery>`, `<StonePlate>`, `<SectionRadar>`, `<PitTable>` | as the legacy essay's structure | literal props only |
| `<CitationExport />` | the foot of the essay | |

Rules the body meets, each enforced:

- No held entity's title, slug or id appears in the prose (the leak scan checks the built output).
- No map title or generated caption is typed in the prose (`literalCopies`). The two appendix list items that did so in the legacy text are on the ledger.
- Every `<Interaction>` id is declared in the record and every declared id is used.
- The satellite stone carries no `<Cite>`.

## Evidence records

`content/evidence/evidence-NNNNNN.yaml`, 17, in the shape of spec 003's evidence record (data-model.md "Evidence records"). A record is created at the Research slice (twelve) and the Outline slice (five); its `locator.value` is the author's and its `locator.state` stays `pending` until a person verifies it.

## Stage entry conditions

| Stage | Needs, beyond the earlier stages |
|---|---|
| Concept | `question`, `rooms`, `authors`, `accent`, a one-entry `stage_history` |
| Corpus | each map in `maps[]` resolves and has `rights` (a map without a licence statement is left out and its stone is source-only) |
| Research | `evidence[]` with `locator.value`; `open_questions` present |
| Outline | `thesis`; the five interaction declarations with their evidence |
| Draft | the `.mdx` body; every `Cite` resolves; no finding aid cited; literal props |
| Build | `ESSAY-BUILD`; the ledger and reconciliation tests pass (`essay:ledger`, `essay:reconcile`) |
| Design QA | the preview build passes axe, the budgets and the no-script checks; `design_qa_passed` set by the author |
| Publish | `release: released`, the three sign-offs, `published_on`, every used record public (`ESSAY-BODY-PUBLIC`) |
| Cross-link | reverse links; `redirect_switched` signed |
