# The anchor essay: the author's inputs for slice 5 (T025 to T027)

Three decisions are yours and nobody else's: the essay's question, a licence statement for four maps, and the open review answers for the maps the essay shows. Spec 009 marks all three **(author)**. This sheet holds everything around them, so that each answer is one command.

Answer in the "Your answer" line of each item, or in a reply; nothing here is applied until you do.

Status: open, raised 2026-11-17. Slice 5, branch `t009-anchor-record` (draft PR #115).

---

## T025 · The essay's question

`ESSAY-QUESTION` needs it at Concept, before the record can exist at all; it is printed at the head of the essay and is the thing the whole piece answers. The legacy essay has no `question` field, so there is nothing to port: its frontmatter carries a `summary` and the opening carries a claim, not a question.

What the legacy opening says, at the pinned snapshot (`e82afd9`, lines 72 to 98): the maps are staged twice, as inscriptions above the ground line and as strata below it; every map of Dacia is built from the spolia of earlier maps, and buries the one before it (line 91); one year of history is one millimetre of earth, and Ptolemy waits 1.87 metres down (line 78, which is also ledger row L03).

Three candidates, drawn from that opening. They are drafts for you to take, cut or ignore.

1. If every map of Dacia is built from the spolia of the map before it, what does each one bury, and what does it keep?
2. What do nineteen centuries of maps of Dacia and Romania record of this land, and what do they decline to say?
3. Read as inscriptions and dug as strata, what do thirteen maps show about Dacia, and what do they show about the states that drew them?

**Your answer:** _(the question, in your words)_

Once you give it, this is what runs, and nothing else:

```bash
npm run registry -- new essay "Terra Sigillata · Lapidarium Dacicum" --room border --question "<your question>" --author "Vlad Simion"
```

Then, by hand on the new record, because the command cannot: the slug `dacia-lapidarium` (it derives one from the title), `accent: gold`, the secondary room `tc:tc:room:archive`, `portal_dimensions: [Measure, Silence]` and `legacy_url: /essays/dacia/`. The seven waiting tests in `tests/essays/unit/anchor-record.test.ts` then check every one of those, and the gate is run at Concept.

The `thesis` is a separate field and is not needed until Outline (T033); it is not asked for here.

---

## T026 · A licence for four maps

`ESSAY-CORPUS` will not let the essay reach Corpus unless every map in `maps[]` resolves and carries a rights state, and `RIGHTS-MISSING` wants a non-empty `rights.licence` from `ready_for_build` on. Two of the six already have one; four have none.

| Map | Record today | What it still needs |
|---|---|---|
| `hereford` | `rights.licence: Public domain`, repository Hereford Cathedral, image attributed to a public-domain reproduction via Wikimedia Commons | nothing for T026 |
| `trade-vesconte-1311` | `rights.licence: Public domain`, image attributed to the Archivio di Stato di Firenze via Wikimedia Commons | nothing for T026 |
| `ptolemy` | no `rights`, no `images`, no repository | a licence statement |
| `peutinger` | no `rights`, no `images`, no repository | a licence statement |
| `honterus` | no `rights`, no `images`, no repository | a licence statement |
| `ortelius` | no `rights`, no `images`, no repository | a licence statement |

The four hold no image, so the statement is about the record and any reproduction it later carries, not about a file in hand today. The shape is `rights: { licence, attribution?, reproduction_cleared?, text_public_domain? }`; `licence` is the only field the rule insists on.

**Your answer, per map:** _(the licence text for `ptolemy`, `peutinger`, `honterus`, `ortelius`; and the attribution, if the licence needs one)_

A map you cannot make a statement for is left out of the essay's `maps[]`, and its stone becomes source-only: the stone keeps its heading, its drawing and its source line, and loses its map figure. That is a real option, not a failure, and the dossier records which stone lost its figure and why. Say "leave it out" and I will treat it that way.

---

## T027 · The open review answers

From `docs/review/map-warnings-2026-10-20.csv`, for the six maps this essay shows. `witness_kind` is one of `held`, `institutional` or `unlocated`. The sheet suggests a value only where the record itself names a holder; for these it names none, which is why they are still open.

| Map | Open question | What the record says today |
|---|---|---|
| `ptolemy` | `witness_kind`, and whether `record_scope` should stay `object` | `record_scope: object`, no holder, no image. Ptolemy's own maps do not survive; what survives is later copies and printings. If this record stands for the work rather than one copy, `record_scope: work` is the honest shape and the witness question falls away |
| `peutinger` | `witness_kind`, and a maker or `unknown` | `record_scope: object`, no holder, no makers at all, and no legacy maker text to port |
| `honterus` | `witness_kind` | `record_scope: object`, no holder; maker already `tc:tc:cartographer:honterus` |
| `ortelius` | `witness_kind`, and whether `record_scope` should stay `object` | `record_scope: object`, no holder; maker already `tc:tc:cartographer:ortelius`. The Theatrum exists in many copies, so the same work-or-copy question as Ptolemy |
| `hereford` | a maker, or `unknown` | `witness_kind: institutional` already; `edition_state` carries the legacy line "Richard of Haldingham (traditional attribution)", and the record's own `open_questions` says it is unsettled whether that names the designer, the scribe or the donor. Naming him needs a new cartographer record; `unknown` needs nothing |
| `trade-vesconte-1311` | none outstanding for the essay | `witness_kind: institutional` sits on the image, from the Archivio di Stato di Firenze attribution; the maker is Pietro Vesconte |

**Your answers:** _(a `witness_kind` for the four; `object` or `work` for `ptolemy` and `ortelius`; a maker or `unknown` for `peutinger` and `hereford`)_

Everything here is applied to the map records as the CSV's `editor_witness_kind` and `editor_makers` columns describe, and the gate is run after each.

---

## What follows, once the three are answered

1. T028: set the essay's `maps[]` to the maps that remain, and run `npm run essay:preview -- dacia-lapidarium` to see any readiness errors the gate raises for them.
2. T029: `npm run registry -- promote <essay-id> Corpus --by "Vlad Simion"`.
3. T031 then needs the twelve evidence locators, which is the next thing I will ask you for; I draft each record from its source's bibliography entry and you give the locator.
