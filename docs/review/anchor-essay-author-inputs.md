# The anchor essay: the author's inputs for slice 5 (T025 to T027)

Three decisions are yours and nobody else's: the essay's question, a licence statement for four maps, and the open review answers for the maps the essay shows. Spec 009 marks all three **(author)**. This sheet holds everything around them, so that each answer is one command.

Answer in the "Your answer" line of each item, or in a reply; nothing here is applied until you do.

Status: raised 2026-11-17. T026 answered the same day by the instruction to find public-domain photographs and use them; T025 and T027 are open. Slice 5, branch `t009-anchor-record` (draft PR #115).

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

## T026 · A licence for four maps — done 2026-11-17

Answered by the editor's instruction of 17 November 2026: find public-domain photographs for the four and use them with the licence and rights. Each file below was opened and looked at before it was written into the record, so what the `alt` says is what the image shows.

| Map | File on Wikimedia Commons | What it shows | Holder named | Licence |
|---|---|---|---|---|
| `ptolemy` | `Ptolemy Cosmographia Dacia+Danube.jpg` | the ninth map of Europe in a manuscript Cosmographia: Dacia between the Carpathians and the Danube, Zarmizegethusa regia inland, the Black Sea in blue | none | public domain |
| `peutinger` | `Tabula Peutingeriana (ÖNB) 13.jpg` | the segment that carries Dacia: Napoca, Porolissum and Apulum strung above the Danube, the itinerary running on to Byzantium | Austrian National Library, Vienna | public domain |
| `honterus` | `Chorographia Transylvaniae Sybembürgen 1532.jpg` | the 1532 Basel woodcut: the Carpathian ring in rows of hills around hundreds of named settlements, dedicated to the council of Sibiu | none | public domain |
| `ortelius` | `Daciarum, Moesiarumque, vetus descriptio … btv1b53194602t (2 of 3).jpg` | the Parergon sheet of 1595: the Danube across the plate, Dacia above and the two Moesias below | Bibliothèque nationale de France | public domain |

Each record now carries that image and `rights: { licence: Public domain, attribution: … }`. No map was left out, so no stone drops to source-only. The gate passes: 294 entities, 0 errors.

Two notes, both honest gaps rather than problems:

- For `ptolemy` and `honterus` the reproduction is public domain but Commons names no repository for the copy photographed. Each record carries an `open_question` saying so, which is the state of the evidence, not a licence doubt.
- The Ortelius file is in three parts; part 1 is the commentary page and part 2 is the map sheet. The record takes part 2.

---

## T027 · The open review answers

From `docs/review/map-warnings-2026-10-20.csv`, for the six maps this essay shows. `witness_kind` is one of `held`, `institutional` or `unlocated`. The sheet suggests a value only where the evidence names a holder; the table below says what each record holds after the images of T026.

| Map | Open question | What the record says today |
|---|---|---|
| `ptolemy` | `witness_kind`, and whether `record_scope` should stay `object` | `record_scope: object`; a public-domain manuscript image, but no repository named for the copy. Ptolemy's own maps do not survive; what survives is later copies and printings. If this record stands for the work rather than one copy, `record_scope: work` is the honest shape and the witness question falls away |
| `peutinger` | `witness_kind`, and a maker or `unknown` | `record_scope: object`; the image is of the parchment at the Austrian National Library, which is a basis for `institutional`. Still no makers at all, and no legacy maker text to port |
| `honterus` | `witness_kind` | `record_scope: object`; a public-domain image of the 1532 woodcut, but no repository named for the sheet. Maker already `tc:tc:cartographer:honterus` |
| `ortelius` | `witness_kind`, and whether `record_scope` should stay `object` | `record_scope: object`; the image is the Parergon sheet held by the Bibliothèque nationale de France, which is a basis for `institutional`. Maker already `tc:tc:cartographer:ortelius`. The Theatrum exists in many copies, so the same work-or-copy question as Ptolemy |
| `hereford` | a maker, or `unknown` | `witness_kind: institutional` already; `edition_state` carries the legacy line "Richard of Haldingham (traditional attribution)", and the record's own `open_questions` says it is unsettled whether that names the designer, the scribe or the donor. Naming him needs a new cartographer record; `unknown` needs nothing |
| `trade-vesconte-1311` | none outstanding for the essay | `witness_kind: institutional` sits on the image, from the Archivio di Stato di Firenze attribution; the maker is Pietro Vesconte |

**Your answers:** _(a `witness_kind` for the four; `object` or `work` for `ptolemy` and `ortelius`; a maker or `unknown` for `peutinger` and `hereford`)_

What the images added on 17 November change here: `peutinger` now rests on a copy held by the Austrian National Library and `ortelius` on one held by the Bibliothèque nationale de France, which is the basis the warnings sheet uses to suggest `institutional`. `ptolemy` and `honterus` still name no holder, so they still have no suggestion. The call stays yours.

One rule to keep in step: on an `object`-scope record the image's `witness_kind` must equal the record's. The four images carry none today because the records carry none; when you set a record's `witness_kind`, its image takes the same value in the same change.

Everything here is applied to the map records as the CSV's `editor_witness_kind` and `editor_makers` columns describe, and the gate is run after each.

---

## What follows, once the three are answered

1. T028: set the essay's `maps[]` to the maps that remain, and run `npm run essay:preview -- dacia-lapidarium` to see any readiness errors the gate raises for them.
2. T029: `npm run registry -- promote <essay-id> Corpus --by "Vlad Simion"`.
3. T031 then needs the twelve evidence locators, which is the next thing I will ask you for; I draft each record from its source's bibliography entry and you give the locator.
