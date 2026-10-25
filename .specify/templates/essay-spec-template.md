# Essay: [TITLE]

**Essay record**: `content/essay/essay-[NNNNNN].yaml`

**Jira**: [TCX-NN] (one story per essay, under the epic of the programme it belongs to)

**Kind**: article | instrument

**Legacy URL**: `[/essays/<slug>/]` or none

<!--
  One page. Use this for an essay rebuilt on the existing essay framework (spec 003). The editorial
  stage machine and the ESSAY-* rules are its acceptance criteria, so it needs no user stories, plan or
  dossier of its own. If the essay needs a component, rule or record shape that does not exist yet, that
  part is a new capability: specify it with the full workflow and link it here.
-->

## Question and thesis

- **Question** (Concept): [the historical or historiographical question the essay answers]
- **Thesis** (Outline): [the falsifiable claim]

## Rooms

- **Primary**: [room]
- **Secondary** (up to two): [room], [room]

## Maps and rights

| Map record | Shown or source-only | Rights state | Blocking? |
|---|---|---|---|
| `tc:tc:map:[...]` | shown | [cleared / pending / not reproducible] | [yes / no] |

A map without a licence statement is source-only; its passage keeps the source line and loses the figure.

## Interactions

| Interaction id | Component | Question it answers | Evidence |
|---|---|---|---|
| [id] | [Timeline / CompareSlider / ...] | [...] | `tc:tc:evidence:[...]` |

**Instrument only.** The linear reading order (the sequence a reader follows when the comparison is laid out as text, as the print Reader does): [the order of sections, or a link to it].

## Port or rewrite

- [ ] Faithful port of the legacy text (ADR 0017 is the precedent), with changed claims on a ledger
- [ ] Rewrite (say why)

## Acceptance (what "Done" means for this essay)

The story is Done when the essay record reaches the stage below on `main` with `gate` green:

- [ ] **Target stage**: [Build / Design QA / Publish / Cross-link]
- [ ] Every stage's entry conditions are met (`npm run registry -- promote <essay-id> <stage> --by <person> --check`)
- [ ] No held entity leaks (`registry scan` on the built site)
- [ ] At Publish, a `legacy_url` gives exactly one redirect rule, in the same PR that publishes the essay

## Open questions

- [question], [who answers it]
