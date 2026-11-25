# Essay: Târgoviște: seat, press and frontier

**Essay record**: `content/essay/essay-000002.yaml` (at Corpus, held; minted 22 November 2026, promoted to Corpus 25 November 2026)

**Jira**: TCX-84 (Stage III rank 3, epic TCX-79)

**Kind**: article

**Legacy URL**: none

This is a one-page essay spec (CLAUDE.md, "Essays"). It needs no full spec, because it is an essay on the existing framework (spec 003). The Stage III grill (TCX-80) confirmed this on 22 November 2026. Two of its parts come from other Stage III work and are not built here:
- the dated residence intervals of the princely seats (TCX-85, Wallachian slice);
- the place roles of the 1508 Leitourgikon (spec 012, ADR 0021).

## Question and thesis

- **Question** (Concept): What made Târgoviște, for three centuries the princely seat of Wallachia, a place where the three Romanian lands met? And how much of its later image as a national capital is evidence, how much contemporary representation, and how much later myth?
- **Thesis** (Outline, draft to test): Târgoviște mattered as a seat and a frontier, not as a capital in the modern sense. Its press, its monasteries and its routes to Brașov and the Danube tied Wallachia to Transylvania and Moldavia. Its standing as "the old capital" is largely a 19th- and 20th-century reading. *Weakened if* the evidence shows Târgoviște functioning as a fixed capital, with permanent institutions independent of the prince's residence, before Bucharest's rise; or if its cross-Carpathian ties prove no stronger than those of other Wallachian seats.

## Rooms

- **Primary**: City
- **Secondary** (up to two): Road (the Brașov–Târgoviște–Brăila corridor); Archive (the 1508 press and its copies)

## Maps and rights

The collection holds no map of Târgoviște before c. 1570. The candidates come from the Stage III map-witness work (TCX-83) and the after-1570 list in the programme: the Stolnic Cantacuzino map of Wallachia (Padua, 1700) and Specht's Austrian military survey.

| Map record | Shown or source-only | Rights state | Blocking? |
|---|---|---|---|
| `map-000001`, Mercator, *Walachia, Servia, Bulgaria, Romania* (Duisburg, 1589), held | in the corpus (the author's choice, 25 November 2026); shown or source-only not yet decided | No known copyright restrictions (Library of Congress, World Digital Library); `reproduction_cleared: false` | No: it has a rights state, which is all `ESSAY-CORPUS` needs |

**Next step, checked 23 November 2026:** the essay is at Concept, and the only stage it can move to is Corpus (stages are never skipped). `npm run registry -- promote tc:tc:essay:essay-000002 Corpus --by <person> --check` fails on one check: `ESSAY-CORPUS`, *maps: at least one map in the corpus*. It needs a map record with a rights state in the essay's `maps`. No Wallachian map has a record yet. The Cantacuzino map's rights could not be read on Commons that day (the API refused the request for rate), so no rights state was written. Once the author chooses the corpus and its records exist with rights, the promotion is the author's to run. **Update (23 November 2026, evening):** Mercator's 1589 map of Wallachia now has a held record with a rights state (`map-000001`, from the Library of Congress). If the author takes it into the corpus by adding it to the essay's `maps`, `ESSAY-CORPUS` passes. Whether the sheet names Târgoviște is not yet read. The Cantacuzino map is still without a record: the Library of Congress holds no copy, and Commons refused the request. The open questions are now on the record too (`open_questions`), as Research will require. **Done (25 November 2026):** the author took Mercator 1589 into the corpus, and the essay was promoted to Corpus by Vlad Simion with every entry check passing. **Next, Research:** `ESSAY-RESEARCH` needs Evidence records for the argument, each with a locator, and the `open_questions` list (already present).

## Interactions

| Interaction id | Component | Question it answers | Evidence |
|---|---|---|---|
| seats-timeline | Timeline | When was the prince at Argeș, Târgoviște or Bucharest? | from TCX-85 (residence intervals) |
| dealu-walk | (static sequence, no new component) | What lies between the town centre and Dealu on the hill? | to be gathered |

Neither interaction needs a new component. If one proves to, that part gets its own spec.

## Port or rewrite

- [ ] Faithful port of the legacy text
- [x] Rewrite: there is no legacy essay on Târgoviște. It is a new essay.

## Acceptance (what "Done" means for this essay)

The story is Done when the essay record reaches the stage below on `main` with `gate` green.

- [ ] **Target stage**: Outline, for Stage III's first slice: the question, the thesis with what would weaken it, the structure, and each planned interaction declared. Publish is a later story, once TCX-85's Wallachian slice and spec 012 are in.
- [ ] Every stage's entry conditions are met (`npm run registry -- promote essay-000002 <stage> --by <person> --check`)
- [ ] No held entity leaks (`registry scan` on the built site)
- [ ] At Publish, a `legacy_url` gives exactly one redirect rule: not applicable, as there is no legacy page

## Scope rules (from the ticket and the programme)

- **Three layers kept apart:** historical evidence, contemporary representation and later myth. Each claim is labelled with the one it belongs to.
- **Târgoviște was never a capital of modern Romania** (Bucharest from 1862). The essay says "princely seat", not "capital", unless quoting.
- **Battle sites are marked confirmed or disputed.** Rovine is disputed.
- **Rulers get at most one comparative chapter** (Vlad III and Stephen the Great, as the external drafts proposed).
- **Dealu Monastery is part of the seat's landscape,** a few kilometres above the town. The 1508 book is attributed to Dealu, not to the town. That distinction is ADR 0021's `produced_at` with `basis: attributed`.
- **Dates:** from Stage III's corrected list. Bucharest is first attested in 1459, in a charter of Vlad III. Every date from the external drafts stays pending until it is traced to an original.

## Open questions

- Opening: the walk from the town centre up to Dealu (the ticket's suggestion), or the 1508 epilogue? Vlad answers.
- Which after-1570 map is the essay's figure, and what are its rights? Answered by TCX-83's rights checks.
- Is "seat, press and frontier" the final title? Vlad answers.
