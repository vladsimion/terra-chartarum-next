Programme note for Stage III, published 2026-11-22 as page 47120387 under Projects — Active Research & Implementation Programmes. The text below is what was published (the page opens with an info panel holding the first two paragraphs).

**Status:** in progress. Grilled on 22 November 2026 (TCX-80; ADR 0021 place roles, ADR 0022 term records); ranks 1 (TCX-82, spec 012) and 5 (TCX-86) are Done, ranks 2 to 4 (TCX-83, TCX-84, TCX-85) In Progress. **Owner:** Vlad. **Jira:** epic TCX-79 (stories TCX-80 to TCX-86). **Updated:** 25 November 2026.

Current focus is unchanged: the Terra Sigillata cutover, then Stage II (Transylvania, TCX-67). This page supports the order Vlad sets on evidence, context and resources; it does not set it. All locators below are `pending` unless marked otherwise (constitution Principle VI).

## 1. Where Stage III sits

Terra Chartarum Next runs in **programme stages** (GLOSSARY.md): **I Dacia** (the v1 anchor, Terra Sigillata · Lapidarium Dacicum, published 18 November 2026), **II Transylvania** (Phase 0 foundations, TCX-67, planned to open December 2026) and **III Wallachia and Moldavia**. One analytical framework governs every stage and phase: constitution 1.1.0 Principle XI, ADR 0020 and `FRAMEWORK.md` (Decision Log TC-D044). Stage III claims therefore carry `analytical_dimensions` and the shared confidence scale from the start.

## 2. Thesis

Stage III is **not a separate "Wallachia and Moldavia" topic**. Its purpose is to show the strong, continuous relationship between Transylvania, Wallachia and Moldavia across history. It adds relations, corridors and shared objects to the Dacia and Transylvania work, not a third silo.

## 3. Priorities (Vlad's ranking)

Criteria: evidence readiness · reuse of Dacia/Transylvania registries · three-entity payoff · resources (sheets, reviewers, time, rights) · dependencies.

| Rank | Candidate | Jira | Depends on |
|---|---|---|---|
| 1 | Printing network, 1508–1560s (Dealu, Sibiu, Brașov, Coresi; Venetian paper) | TCX-82 | Place-role ADR (TCX-81); corridor geometry thin slice (TCX-86) |
| 2 | Pre-1570 cartographic witnesses (Ptolemy, portolans, Fra Mauro) | TCX-83 | Acquisition and rights checks, started early |
| 3 | Târgoviște essay | TCX-84 | Wallachian slice of rank 4 |
| 4 | Princely seats over time (Argeș, Târgoviște, Bucharest, Siret, Suceava, Iași) | TCX-85 | — |
| 5 | Passes and corridors layer (Brașov–Târgoviște–Brăila, Olt/Sibiu, Oituz) | TCX-86 | — |

The order stands; thin slices of ranks 4 and 5 are built early because ranks 1 and 3 need them.

## 4. To settle in the grill (TCX-80)

- The boundary with the Stage II comparative essay "Between Three Empires" (Romanian lands 1700–1850).
- **Place-role ADR** (TCX-81): every object→place link carries a typed role (`produced_at`, `held_at`, `formerly_at`, `depicts`, …) with its own confidence, and the map never draws a pin without stating its role. Prompted by an external catalogue that pins the 1508 Leitourgikon on its holding library rather than its place of production.
- **Term-record design:** one canonical record per modern analytical term, with typed fields (ancient attestation, first documented use, later critique, coinage).
- Which candidates are full specs and which are one-page essay specs (CLAUDE.md: one essay on the existing framework is not a programme).

## 5. The 1508 Leitourgikon: what the evidence supports

- **Date** 10 November 1508: *stated* in the epilogue, with patron (Radu the Great, continued by Mihnea) and typographer (Macarie).
- **Place** Dealu Monastery, Târgoviște: *attributed, high confidence* (scholarly consensus; the epilogue does not name the place; bibliographies bracket it). Earlier hypotheses (Venice, Bistrița in Oltenia, Snagov, Govora, Cetinje) go in a historiography note, not a "contested" Atlas flag.
- Three entities inside one book: Venetian paper reportedly imported via Sibiu merchants; ornaments argued Venetian vs Moldavian; Macarie's training in Venice / Cetinje.
- 12 surviving copies (5 in Romania, 7 abroad): a natural `held_at` test case.
- In Slavonic, not Romanian. Romanian-language printing emerges in Transylvania (Sibiu 1544 catechism, lost; Coresi in Brașov, who first worked in Târgoviște). Ljubavić's Târgoviște prints of 1545 and 1547 are reportedly the first Wallachian prints naming the place: **pending**, read the colophons.

Read in full: Negoiță, "The Slavonic Leitourgikon of Macarie (1508)", *Mapping Eastern Europe* (Princeton). To consult: Panaitescu facsimile (1961); *Liturghierul lui Macarie 1508/2008* (Mihăilă); Demény & Demény, *Carte, tipar și societate* (1986); Bianu–Hodoș, BRV.

## 6. Terminology: "Carpato-Danubiano-Pontic"

- Ancient geography is not modern historiographical terminology. Earliest secure naming of the Carpathians: Ptolemy, *Geographia* III (Karpates oros); Ovid witnesses the Danube/Black Sea world but not the mountains' name.
- "Carpatho-Danubian": documented landmark Pârvan, *Dacia* (CUP 1928); coinage not attributed to him without checking earlier usage. Romanian edition title and date **to verify** (1937 vs 1967).
- "Carpato-Danubiano-Pontic": prominent from the 1970s; a critique attributed to Alexandru Vulpe is **pending** a source page. Introduce as a modern analytical construction.

## 7. Early cartographic witnesses

No collection maps before c.1570 is not empty space. Pre-1570 witnesses: Ptolemaic Dacia (Tabula Europae IX; Ruscelli sheet on the acquisition list), portolan charts (Black Sea, Danube mouths, Kilia, Cetatea Albă), Fra Mauro (c.1450), Tabula Peutingeriana, charters and chronicles as textual geography. Later: Mercator/Hondius, Stolnic Constantin Cantacuzino's map of Wallachia (Padua 1700), Cantemir's Moldavia, Specht's Austrian survey. Caution: Ortelius's *Romaniae… descriptio* shows Thrace/Rumelia, not the Romanian lands.

## 8. External drafts reviewed

Two AI-drafted proposals ("Between the Carpathians and the Danube" and a Târgoviște expansion) were reviewed. Kept: geography first, Târgoviște as an anchor place, evidence vs representation vs later myth, confirmed vs disputed battle sites. Rejected or corrected: scope (8 chapters, 4 spin-offs, 6 layers) too large for now; a thin ruler-comparison table; Bucharest's first attestation (1459, not 1465); Siret missing from Moldavian seats. Every date and claim from those drafts stays `pending` until traced to an original.

## 9. Sources

- Repository: [FRAMEWORK.md](https://github.com/vladsimion/terra-chartarum-next/blob/0ea65b2/FRAMEWORK.md), [ADR 0020](https://github.com/vladsimion/terra-chartarum-next/blob/0ea65b2/docs/adr/0020-one-analytical-framework.md), [GLOSSARY.md](https://github.com/vladsimion/terra-chartarum-next/blob/0ea65b2/GLOSSARY.md) (at 0ea65b2).
- Working note: Claude project doc `phase3-three-entities-priorities.md` (22 November 2026).
