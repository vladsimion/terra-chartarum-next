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

## T027 · The open review answers — done 2026-11-17

**Where each copy is.** Every map record now carries the `witness_kind` of the copy its image was made from, and each image carries the same value, which the gate requires on an `object` record.

| Map | `witness_kind` | Why |
|---|---|---|
| `peutinger` | `institutional` | the image is the parchment at the Austrian National Library, the one surviving copy |
| `ortelius` | `institutional` | the image is the sheet held by the Bibliothèque nationale de France |
| `ptolemy` | `unlocated` | the reproduction is public domain, but no holder is named for the manuscript, which is what `unlocated` records |
| `honterus` | `unlocated` | the same: a public-domain image of the 1532 sheet, no holder named |
| `hereford`, `trade-vesconte-1311` | `institutional` | already set before this slice |

**Who made it.** Answered by the editor on 17 November: mark `peutinger`'s maker unknown, leave `hereford` as it is. So `peutinger` carries `field_status.makers: unknown`, the way an anonymous map is recorded elsewhere in the catalogue, and its gate warning is gone; `hereford` keeps `makers: not_yet_verified` and its open question about whether the map's own "Richard de Haldingham" names the designer, the scribe or the donor. That gap is deliberate and its warning stands.

**One copy or the published map.** All six stay `record_scope: object`. That follows from the instruction to use the images: the gate allows an image only on an object record, so a `work` record would have cost that stone its figure. If any of them should stand for the published map after all, say so and the image comes off with it.

---

## What follows, once the three are answered

1. T028: set the essay's `maps[]` to the maps that remain, and run `npm run essay:preview -- dacia-lapidarium` to see any readiness errors the gate raises for them.
2. T029: `npm run registry -- promote <essay-id> Corpus --by "Vlad Simion"`.
3. T031 then needs the twelve evidence locators, which is the next thing I will ask you for; I draft each record from its source's bibliography entry and you give the locator.
