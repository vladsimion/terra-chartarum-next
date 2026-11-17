# The anchor essay: the twelve locators, and drafts for the thesis and the five interactions

Written 2026-11-17 for spec 009 T031 and T033. Three things are asked of the author here, and each is laid out so the answer is a line, not an essay. The drafts are drawn from the author's own legacy text at the pinned snapshot `e82afd9`, with the line cited, so nothing below is invented.

**Status, 17 November 2026.** Sections 1 to 3 are answered and applied: the author supplied catalogue and archival references, nine of which are now evidence records with `state: pending` and `proposed_by: ai`, while Hereford, the Russian sheet and the firing-plan sheet stay uncited until they are identified; the thesis is in, and four of the five interactions are declared with his revised wording. What is written below in those sections is what was asked and drafted, kept as the record of it. Section 4, the bibliography sections, is still open.

---

## 1. The twelve locators (T031)

A locator is the pointer a reader follows to check a claim: the place inside the source where the thing the stone says is actually to be found. It goes in each evidence record as `locator.value`, stays `pending` until a person has verified it, and is printed in the essay's source note.

Two of the twelve already carry their pointer in the source's own title, so those are proposals rather than questions. The rest need yours; the middle column says the form the pointer usually takes for that kind of source, so you are filling in a shape rather than inventing one.

| Stone and source | What it is, and the form a pointer takes | Proposed, or yours to give |
|---|---|---|
| I Ptolemy, `src-ptolemy-geographia` | a coordinate catalogue; a book and chapter, optionally a coordinate pair | **Proposed: `Geographia III.8`**, which the source title already names. Add a coordinate if you want the reader taken to one place |
| II Peutinger, `src-tabula-peutingeriana` | a road itinerary; a segment number, optionally a named station | **Proposed: `segm. VII–VIII`**, which the source title already names. The copy we show is the Vienna parchment, where Napoca, Porolissum and Apulum sit on one segment |
| III Hereford, `src-hereford-mappa` | one object; a position on the map, or a numbered legend in the standard catalogue of its inscriptions | |
| IV Vesconte, `src-vesconte-portolan` | a signed chart; which sheet of the atlas, or the named stretch of coast | |
| V Honterus, `src-honterus-chorographia` | a single printed sheet; the sheet entire, or a named place on it | |
| VI Ortelius, `src-ortelius-parergon` | a plate in the Parergon; the plate's title or its number in the 1595 edition | |
| VII Cantacuzino, `src-cantacuzino-wallachia` | a printed regional map; sheet or plate | |
| VIII Cantemir, `src-cantemir-moldavia` | a book with a map; the map plate, or a book and chapter of the Descriptio | |
| IX Iosephina, `src-iosephina-survey` | a military survey in sections; the Siebenbürgen section and sheet numbers | |
| X Russian General Staff, `src-russian-staff-1835` | a survey in sheets; the sheet number | |
| XI Szathmári, `src-szathmari-charta` | the Charta, in many sheets; the sheet number or numbers | |
| XII The secret century, `src-secret-century` | firing-plan sheets and their successors; the sheet name or number, and the year of the issue | |

Once these are in, I create the twelve evidence records, set each `locator.state` to `pending`, give each an evidence type and a confidence, attach them to the essay and promote it to Research. The test at `tests/essays/unit/evidence-records.test.ts` checks every one of them as it lands.

---

## 2. The thesis (T033)

The question you gave is: *If every map of Dacia is built from the spolia of the one before it, what does each new map bury, and what does it keep?* The thesis is your answer to it in one sentence, and the essay then has to earn it.

Three drafts, each committing the essay to a different burden of proof:

1. **Measure is inherited; authority is overwritten.** Each map of Dacia keeps its predecessor's geometry as spolia and buries the claim that gave it meaning, so that what survives nineteen centuries is a skeleton of coordinates and not the states that drew them.
   *What it would have to prove:* that the measure readings carry across the section while authority does not. The three section comparisons already say exactly this.
2. **What each map keeps is the measurement; what it buries is the silence that produced it.** Every sheet inherits the coordinates of the one before and quietly discards the record of what that sheet could not, or would not, say.
   *What it would have to prove:* that silence is the reading that changes most and is hardest to recover. The Vesconte-against-secret-century comparison is the strongest evidence, and the pit tables are the rest.
3. **Each new map buries its predecessor's authority and keeps its names.** A name cut by a Greek geographer resurfaces on a city-limit sign after eighteen centuries, while the empire, the kingdom and the state that each claimed the ground in turn survive only as the shape of a border.
   *What it would have to prove:* the onomastic thread through the four pits, which is what the 52 cells are for.

The first is the safest, the second the most interesting, the third the most concrete. They are not exclusive; a sentence can carry two of them.

---

## 3. The five interactions (T033)

Each declared interaction prints a question above it and an expected interpretation below it, so the reader is told what to look for and what you concluded. Both are drafted here from your legacy prose, with the line cited; edit freely.

### `hereford-against-vesconte` — the compare slider

- **Question:** Two sheets cut within a decade of each other: where do they agree?
- **Interpretation:** Only in their emptiness. Hereford leaves the interior blank because scripture had already answered the question, Vesconte because no pilot had thought to ask it. The same silence, reached by opposite roads. *(legacy lines 1576 to 1579)*

### `core-sample` — the scrollytelling trench

- **Question:** How much of this country's mapping is actually continuous?
- **Interpretation:** It is not. Between the road-maps of Rome and the Renaissance woodcuts lies a sterile band of twelve centuries in which nobody surveyed this ground; a wall of thirteen stones reads as a sequence, but the section shows it is mostly absence. *(legacy lines 1586 to 1590)*

### `radar-ptolemy-iosephina` — stratum XII against stratum IV

- **Question:** Sixteen centuries apart, what actually changed between Ptolemy and the Josephine survey?
- **Interpretation:** Not measurability but ownership. Authority more than doubles while measure gains only half again, and silence rises with both: the better the state saw, the more carefully it declined to say. *(legacy lines 2049 to 2055)*

### `radar-vesconte-secretum` — stratum IX against stratum I

- **Question:** Two of the most precise instruments in the section, six centuries apart, are equally silent. Is it the same silence?
- **Interpretation:** No. The pilot withheld nothing and simply never surveyed the interior; the general staff surveyed everything and withheld it on purpose. One silence is a limit, the other a policy. *(legacy lines 2067 to 2072)*

### `radar-secretum-satelles` — stratum I against stratum 0

- **Question:** When the satellite replaced the military survey, what fell away?
- **Interpretation:** Authority and silence together. Measure and limit do not move, both layers measuring to the limit of their instruments, but authority halves and silence falls by more than half, the only reversal of that size in the section. *(legacy lines 2084 to 2089)*

Each of the five also needs one evidence record of its own, which I mint once the questions are settled; several can rest on a stone's source with a different locator.

---

## 4. The twelve bibliography sections (T034)

Each of the twelve entries behind the stones' sources needs one of the seven sections before it can be public, and the essay's bibliography builder rejects anything else. The test is written; the choice is yours. My proposal is the obvious split, and I would not expect you to change more than one or two.

| Entry, behind | Proposed section | Why |
|---|---|---|
| `src-ptolemy-geographia` | `primary_sources` | a coordinate catalogue in a text, not a drawn map |
| the other eleven, from Peutinger to the secret century | `historical_maps` | each is a map, chart, survey or sheet, which is what that section is for |

If you would rather the Cantemir entry went under `primary_sources`, because the Descriptio is a book, say so: we cite the 1737 printed map rather than the book, which is why it is proposed as a map.

None of the twelve is enriched yet. They are thin by design: a title, an author, a year and a note. Anything you want public as more than that needs the fields filled before Publish, and the test only insists on the section and the CSL file.
