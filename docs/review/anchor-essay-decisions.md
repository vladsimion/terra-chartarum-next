# The anchor essay: every decision left before Publish

Written 2026-11-18 for spec 009, after T045. One sheet, so the essay's remaining decisions are one
read rather than thirty-eight conversations.

**How to answer.** If you accept everything proposed here, write one line at the top of §B:
`All as proposed — Vlad Simion, <date>.` and I apply the lot, with your name and that date in every
`approved by` and `adjudicated_by` field the gate asks for. To change anything, strike the row and
write what it should be instead; anything you strike I leave alone and come back on. Nothing in §D
can be answered from this sheet: those need your eyes on the built page.

**Where the essay stands.** Record at **Research**, `release: held`, no public page. The body is
ported whole: 0 of the 245 legacy paragraphs missing, sixteen drawings, four interactions, three
radars, four pit tables, the 52-cell file. Gate green on the working tree (308 entities, 0 errors).
The preview build, which pretends Publish, reports **88 readiness errors**; they are all accounted
for below.

---

## §A. Mine, not yours — no decision needed

These are code or scope items I had been carrying as "the author's" out of caution. They are not.
I will do them whatever you decide elsewhere, unless you tell me not to.

| # | What | Why it is mine |
|---|---|---|
| A1 | **The release list is short** (8 of the 88 errors: `MAP-MAKER-HELD` ×4, `BIB-LISTED-HELD` ×4). Four cartographers (Honterus, Ortelius, Ptolemy, Vesconte) and four bibliography entries that the shown maps point at are held, so a released map would link to a held record. I extend `selectUsedRecords` in `src/essays/preview.ts` and the release list of research R10 to include each shown map's makers and bibliography entries, and T053's test pins it. | Research R10 already foresaw exactly this and left it to the Publish slice. A public record linking to a held one is a broken link, which is what the rule is saying. |
| A2 | **`attribution_evidence` on five maps** (5 of the 6 `MAP-DEALER-ONLY` errors). Each map needs at least one evidence record behind its attribution, and five already exist, pointing at those very maps: Ptolemy → `evidence-000001`, Peutinger → `-000002`, Vesconte → `-000003`, Honterus → `-000004`, Ortelius → `-000005`. I wire each map's `attribution_evidence` to its own record. | The records exist and target these maps. Nothing is being claimed that is not already in the registry. |
| A3 | **The 52 cells' `reading` column stays empty** until B7 is answered, and the pit tables render it empty. No change unless you answer B7. | Already the state; listed so the sheet is complete. |

The sixth `MAP-DEALER-ONLY` error is Hereford's, which has no evidence record because its pointer is
unidentified. That one is B5.

---

## §B. One line each, and one line answers all of them

> **Your answer:**
>
> _(write `All as proposed — Vlad Simion, <date>.` here, or answer row by row)_

| # | Decision | My proposal | The one line of context |
|---|---|---|---|
| B1 | **The fifth interaction's locator**, which is what holds the promotion to Outline and therefore everything after it | `Planurile directoare de tragere, 1:20,000 Lambert–Cholesky series from 1916–17; the sheets georeferenced by geo-spatial.org` — minted as `evidence-000014`, `state: pending`, `proposed_by: person`, and `radar-secretum-satelles` declared with it | Your own stone text gives the series, the scale and the year; the appendix names the georeferencing. This is the same series-level pointer you already accepted for Iosephina and Szathmári, where the locator names the series and not the sheet, recorded as an open question rather than a blocker. The individual sheet stays an open question. |
| B2 | **Rights on the essay** (1 `RIGHTS-MISSING`) | `licence: CC BY 4.0` | ADR 0009: original prose is CC BY 4.0. The essay's prose is yours and original. |
| B3 | **Rights on the thirteen evidence records** (13 `RIGHTS-MISSING`) | `licence: CC BY 4.0` on each | ADR 0009: original data is CC BY 4.0. An evidence record is your claim about a source, not the source itself; the sources' own rights are already on their records and are untouched. |
| B4 | **Adjudicating the nine llm-assisted source imports** (9 `AUTO-UNADJUDICATED`): Ptolemy, Peutinger, Vesconte, Honterus, Ortelius, Cantacuzino, Cantemir, Iosephina, Szathmári | `adjudicated_by: Vlad Simion`, `adjudicated_on: <your date>` on each, meaning you have read the normalised record and accept it | The rule exists so a machine cannot bless its own normalisation. I can prepare the field but the judgement is yours by construction. Each record is a title, a kind and a bibliography entry; nothing in them is contested. |
| B5 | **Hereford's maker** (1 `FAM-REQUIRED`, and the sixth `MAP-DEALER-ONLY`). At Publish a `field_status` no longer satisfies the rule: the record needs makers | Name `Richard de Haldingham` as the maker with the role left unsettled in the open question, and keep the map and its figure | Your T027 answer was to leave it `not_yet_verified`, which is fine until Publish and an error at it. The alternative is Hereford becoming source-only, which costs the stone its figure. Naming him records what the map says of itself without settling whether he designed, scribed or donated it. |
| B6 | **Confirming the fifteen legacy imports** (15 `IMPORT-REVIEW`): the six maps and nine sources | Confirmed by you on the same date, which lets their lifecycle leave `researching` | The gate holds every imported record at `researching` until the editor says the import is right. It is the same read as B4, on the same records. |
| B7 | **The cell `reading` vocabulary** (research R6, T047), empty on all 52 cells | Adopt the corpus's own attestation classes: `exact`, `variant`, `alternative`, `textual_only`, `reconstructed`, `extra_muros`, `source_silent`, `survival_unknown` | These are the classes `data/dacia/attestations.csv` already uses. Adopting them means that when CND attestations land, each local cell maps onto its attestation without a translation step — and the reconciliation differences in §C become directly comparable instead of a judgement about wording. |
| B8 | **The thirty-five map `field_status` answers** (35 `MAP-FIELD-STATUS`): `atlas_context`, `georeferencing_status`, `language`, `provenance`, `publication_place` and `edition_state`, across the six maps | Declare each `not_yet_verified`, except where your own essay states the fact, in which case I fill the value and show you the list before applying: Honterus `publication_place: Basel`, Ortelius `publication_place: Antwerp`, Peutinger `language: Latin`, Ptolemy `language: Greek`, Hereford `language: Latin` | Each field needs a value **or** a `field_status` entry saying why there is none, and "not yet verified" is the honest entry for a field nobody has checked. Declaring ignorance is not the same as asserting a fact, and the Atlas and georeferencing fields are genuinely out of scope for v1. |

---

## §C. Row by row, but every row has a proposal

### C1. The thirty-one changed-claim ledger rows (T046)

`npm run essay:ledger` lists them; `tests/essays/unit/ledger.test.ts` fails at Build or later while
any row is `pending`. **Five of the seven derived numbers I was able to check against your own depth
scale, and they are right** — one millimetre of earth per year before 2026 puts every stratum on the
year its map carries, so the arithmetic is internally consistent and needs no decision from you.

| Row | What it is | My proposal |
|---|---|---|
| L01 | "Nineteen centuries of maps" | **Approve as written.** Ptolemy c. 150 to 2026 is 1876 years. |
| L02 | "Thirteen stones, one for each map" | **Reword** to "Thirteen stones on a wall, one for each survey" — twelve have a corpus source, six have a map record, and the thirteenth has neither, so "map" overclaims where "survey" does not. Strike this if you would rather keep "map". |
| L03 | "Ptolemy waits 1.87 metres down" against the drawing's "0 to 188 centimetres" | **Approve as written, no change.** There is no conflict: 187.6 cm is Ptolemy's stratum, 1.876 m; 188 cm is where the axis ends. |
| L04 | "A sterile band of twelve centuries" | **Approve as written.** Peutinger c. 350 to Honterus 1532 is 1182 years. |
| L05 | "after eighteen centuries"; "slept for eighteen centuries" | **Approve as written.** Ptolemy c. 150 to the Napoca decree of 1974 is 1824 years. |
| L06 | "sixteen centuries, and the state arrives" | **Approve as written.** Ptolemy c. 150 to the Josephine survey of 1769 is 1619 years. |
| L07 | "1:57,600 across one hundred and twelve sheets" | **Yours — I cannot check this.** It is a fact about Szathmári's Charta that needs the sheet count confirmed against the survey, and nothing in the repository holds it. |
| L08 | The sixteen `CorpusRef` lines become plain source lines, tallies as literal text, no Atlas link | **Approve.** The CND layers stay held (ADR 0002) and a held layer cannot be linked; the tallies are re-verified at Design QA. |
| L09 | `yearTo: 2024` dropped; the timeline keeps 2026 | **Approve.** The two disagreed and the field has no successor, so nothing in the text changes. |
| L10 | "Tabula Peutingeriana - ÖNB Vienna" → "The Peutinger table - ÖNB Vienna" | **Approve.** The body rule rejects a registry map's title typed into the prose. |
| L11 | "Hereford mappa mundi" → "The Hereford map" | **Approve.** Same rule. |
| L12 | The pit rows marked "not yet corpus-backed" | **Approve.** Spec 003 FR-016 requires it of a local cell. |
| L13 | `<Section>` becomes a heading that keeps its id | **Approve.** The framework has no Section component and rooms belong to the essay; every heading, its text and its anchor are unchanged. |
| L14 | The kicker becomes an ordinary first paragraph | **Approve.** Same words; the shell carries no kicker class. |
| L15 | The squeeze becomes the token flip | **Approve.** The shell forbids the CSS `filter` the legacy used; the reading offered is the same. |
| L16 | Each stone with a map record gains a `<MapFigure>` | **Approve.** The caption, credit and licence come from the record and the reader can reach it. |
| L17 | The Hereford source line becomes nothing | **Approve**, and it stays so until the Westrem inscription is chosen. Answering B5 does not change this: a maker is not a locator. |
| L18 | The timeline's intermediate ticks dropped | **Approve.** The events, their order and the square-root scale are unchanged. |
| L19 | The Russian source line becomes nothing | **Approve**, until the 1835 series and sheet index are identified. |
| L20 | The secret century's source line becomes nothing | **Approve** — or, if you answer B1, I can give this stone its citation too, from the same series-level pointer. Say so and I will. |
| L21 | Upright EB Garamond place-names become italic | **Yours, and I would rather you rejected it.** Rejecting adds a fourth hand to `StonePlate` and the letterforms stay as you drew them; approving slants them across all sixteen drawings. The words, sizes and positions are unaffected either way. |
| L22 | "Drag the seam" → "Move the seam" | **Approve.** The control is a radio group of five positions; the arrow keys move the reveal. |
| L23 | The compare slider's labels and caption move into captions and a paragraph | **Approve.** Same words, same order, none lost. |
| L24 | The core sample's label loses "Select a stratum to read it." | **Approve.** There is nothing to select; the rest of the label is unchanged. |
| L25 | The scrollytelling's steps become the component's list items | **Approve.** Each step keeps its heading, anchor and words, so no link into the section breaks. |
| L26 | The four pit `CorpusRef` lines become nothing | **Approve.** A pit has places, not a source, and every row already says the corpus does not hold it. |
| L27 | `extra muros`, `absent` and `(uncertain)` lose their italics | **Approve if you answer B7, otherwise yours.** Under B7 the mark moves out of the name and into the `reading` column as a class, which is better than italics: it becomes data rather than typography. Without B7 the words stay as plain text. |
| L28 | The pit tables gain a Reading and a Corpus column | **Approve.** No legacy cell moved; the reading column is what B7 fills. |
| L29 | The radars' `interactive` prop dropped | **Approve.** The essay ships no script and `:has()` gives the same reading. |
| L30 | The third radar sits outside an `<Interaction>` | **Approve now, and it disappears if you answer B1** — with the fifth declaration in place I wrap it and this row can be struck. |
| L31 | The Corpus Chartarum Daciae link dropped, the words kept | **Approve.** That programme is a held collection record with no page in v1; the link can return when it is published. |

### C2. The seven reconciliation rows (T047)

`docs/review/pit-cells-reconciliation.md`, regenerated by `npm run essay:reconcile`, which keeps
whatever you write in its last two columns. Your table stays the source of truth unless a resolution
says otherwise.

| Rows | What differs | My proposal |
|---|---|---|
| Stratum IX (Vesconte), all four pits | Your cell reads `absent`; the attestation class reads `extra_muros` | **The corpus is right and your cell should change, in all four.** Your own introduction draws the line: *extra muros* means the sheet does not cover the ground, *absent* means it covers the ground and declines to name it. A portolan of the Black Sea coast does not cover inland Dacia at all, which is *extra muros*. Your prose for those cells already says as much — "a coastal chart has no use for an inland ruin", "far inland of any pilot's interest". Strike this if you read the chart's coverage differently. |
| Sarmizegetusa, stratum VIII (Honterus) | Your cell reads `Várhely (uncertain)`; the class reads `survival_unknown` with no name | **Keep your name, take the corpus's class.** Under B7 the cell becomes name `Várhely`, reading `survival_unknown` — which says exactly what your "(uncertain)" says, in the vocabulary the corpus uses. |
| Napoca, stratum IV — `att-0032` "Kolozsvar" | The corpus holds the two names as two attestations; your cell holds `Klausenburg / Kolozsvár` as one | **No change; resolve as "the essay's table is right".** A cell carries one name and yours carries both deliberately: German official, Hungarian beside it. The retrofit will split it when the attestations land. |
| Sarmizegetusa — `att-0130` "Vlpia Traiana Zarmisgetusa" | Normalises to Ulpia Traiana Sarmizegetusa; the reconciler could place it in no stratum | **Yours.** Your Pit 1 note says the pit is sunk on the colonia rather than Regia, so this is probably the colonia's own full name under a stratum you did not give it a row for. Which stratum it belongs to is a judgement I should not make. |

---

## §D. Nothing here can be answered from this sheet

| # | What | Why it needs you, on the page |
|---|---|---|
| D1 | **The Design QA read** (T052), in both colour schemes | Someone has to look at sixteen drawings and say they still read as the stones they are. This is also where the thirty-two literal attestation tallies in the source lines get re-verified, and where L21's letterforms are either right or wrong to your eye. |
| D2 | **The Vesconte stone's heading against its figure's registry title** (T052) | The stone is headed "Portolan of the Black Sea"; the map record is titled "Eastern Mediterranean portolan". One of them should move, and which depends on what you meant the stone to be about. |
| D3 | **The three sign-offs** — historical, cartographic, data (T055) | `ESSAY-SIGNOFF` wants three names and three dates. This is the point of the whole stage machine. |
| D4 | **The archive-project pull request** that applies `archive/_redirects`, and `redirect_switched` (T059) | A different repository, and the switch that makes `/essays/dacia/` land on the new essay. |

---

## What happens when §B and §C come back

In order, and none of it needs you again until §D:

1. Apply §A, §B and §C; mint `evidence-000014`; declare the fifth interaction.
2. `registry promote … Outline` (T035), then `Draft` (T044) — which is what finally turns on T036's
   build cases and the port-fidelity check over the real page.
3. T048: `essay:ledger`, `essay:reconcile` and `port-fidelity` green.
4. T049 to T051: the real essay's e2e on the preview build, the CI and Lighthouse entries, and the
   sixteen drawings checked in both schemes against the ADR 0004 budgets.
5. Stop at D1 and D2, the Design QA read, which promotes to Build and Design QA.
6. After D3: `Publish`, the release-list test, the leak scan and the production build. Then D4, and
   `Cross-link`.

The honest estimate of what is left after §B and §C: the code is a day's work, and every remaining
gate is either mechanical or in §D.
