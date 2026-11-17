# The anchor essay: the author's inputs for slice 5 (T025 to T027)

Three decisions are yours and nobody else's: the essay's question, a licence statement for four maps, and the open review answers for the maps the essay shows. Spec 009 marks all three **(author)**. This sheet holds everything around them, so that each answer is one command.

Answer in the "Your answer" line of each item, or in a reply; nothing here is applied until you do.

Status: raised 2026-11-17. T026 answered the same day by the instruction to find public-domain photographs and use them; T025 and T027 are open. Slice 5, branch `t009-anchor-record` (draft PR #115).

---

## T025 · The essay's question — done 2026-11-17

Answered by the editor:

> If every map of Dacia is built from the spolia of the one before it, what does each new map bury, and what does it keep?

The record is minted: `tc:tc:essay:essay-000001`, `content/essay/essay-000001.yaml`, at stage Concept and held. The five fields the mint command cannot set were set by hand: slug `dacia-lapidarium`, `accent: gold`, the secondary room `tc:tc:room:archive`, `portal_dimensions: [Measure, Silence]` and `legacy_url: /essays/dacia/`. The gate passes (295 entities, 0 errors) and all eight tests in `tests/essays/unit/anchor-record.test.ts` pass, the seven that were waiting included.

The `thesis` is a separate field and is not needed until Outline (T033).

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

### What was applied on 17 November, and what is still yours

Each record's `witness_kind` now follows the copy that was photographed for it, which is what the field records: where the object the record stands for actually is.

| Map | `witness_kind` | Why |
|---|---|---|
| `peutinger` | `institutional` | the image is the parchment at the Austrian National Library, the one surviving copy |
| `ortelius` | `institutional` | the image is the sheet held by the Bibliothèque nationale de France |
| `ptolemy` | `unlocated` | the reproduction is public domain, but no holder is named for the manuscript, which is exactly what `unlocated` records |
| `honterus` | `unlocated` | the same: a public-domain image of the 1532 sheet, no holder named |

Each image carries the same value, which the gate requires on an `object` record. Say the word and any of the four flips.

**Still yours, two questions.**

1. **A maker for `peutinger`, or `unknown`.** The record has no maker at all. The surviving parchment is an anonymous medieval copy of a Roman original, so `field_status.makers: unknown` is the usual answer, which is how `city-forma-urbis` and `city-agas-london` record an anonymous map. I have not set it, because it says the editor has confirmed there is no maker to name.
2. **A maker for `hereford`, or `unknown`.** Here `unknown` would be wrong: the map names "Richard de Haldingham e de Lafford", and the record's own open question says what is unsettled is whether that names the designer, the scribe or the donor. The choice is to mint a cartographer record for him with the attribution marked unresolved, or to leave the field as the gap it is.

**One option you may want instead.** All four records are `record_scope: object`, which is what lets them carry an image. If you would rather any of them stand for the published map instead of for one copy, it becomes `record_scope: work`, and then the gate requires it to carry no `witness_kind` and no image at all, so that stone would lose its figure and keep only its source line. Ptolemy is the one where that question really bites: his own maps do not survive, and what the image shows is a fifteenth-century manuscript of them.

---

## What follows, once the three are answered

1. T028: set the essay's `maps[]` to the maps that remain, and run `npm run essay:preview -- dacia-lapidarium` to see any readiness errors the gate raises for them.
2. T029: `npm run registry -- promote <essay-id> Corpus --by "Vlad Simion"`.
3. T031 then needs the twelve evidence locators, which is the next thing I will ask you for; I draft each record from its source's bibliography entry and you give the locator.
