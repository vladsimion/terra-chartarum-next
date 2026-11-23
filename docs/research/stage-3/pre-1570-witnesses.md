# Pre-1570 cartographic witnesses: what the registry holds, and what is missing

Stage III rank 2, TCX-83 (epic TCX-79). The Stage III grill (22 November 2026) decided this is **records and data under the existing map model** (spec 004, ADR 0011), with no new spec.

**The point** (programme, "Map witnesses"): the collection has no maps before c. 1570, but that is a gap in the collection, not in the cartography. These witnesses show what Europe knew of the Danube, the Black Sea coast and the Carpathians before then.

## What the registry already holds (audit of `content/map/`, 22 November 2026)

| Record | Title | Date | Scope / witness | Lifecycle, release | Image | Licence / cleared |
|---|---|---|---|---|---|---|
| `ptolemy` | Ptolemy, Geographia | 0150 | object, unlocated | published, released | static | Public domain / not recorded |
| `peutinger` | Tabula Peutingeriana | 0400 | object, institutional | published, released | static | Public domain / not recorded |
| `carta-pisana` | Carta Pisana | 1290 | object, institutional | researching, held | static | Public domain / not recorded |
| `trade-vesconte-1311` | Black Sea and eastern Mediterranean chart | 1311 | object, institutional | published, released | static | Public domain / not recorded |
| `trade-vesconte-1321` | Western Mediterranean from a portolan atlas | 1321 | object, institutional | researching, held | static | Public domain / not recorded |
| `trade-loc-portolan` | Portolan chart of the Mediterranean and Black Seas | 1335 | object, institutional | researching, held | static | Public domain / not recorded |
| `trade-bianco-1436` | Portolan leaves from the Andrea Bianco atlas | 1436 | object, **witness kind missing** | researching, held | **none** | **none** |
| `fra-mauro` | Fra Mauro world map | 1459 | object, institutional | researching, held | static | Public domain / not recorded |
| `trade-roselli-1466` | Portolan chart of the Mediterranean | 1466 | object, institutional | researching, held | static | Public domain / not recorded |
| `trade-agnese-1544` | Portolan atlas of nine charts and a world map | 1544 | object, **witness kind missing** | researching, held | **none** | **none** |

The places the programme names already exist: Chilia (`plc-chilia`) and Cetatea Albă (`plc-cetatea-alba`).

## Gaps, by kind

1. **No record says what it shows of the Romanian lands.** `coverage` is empty on all ten. Each must be read against the image, by a person, before any place is listed. Candidates:
   - the Danube mouths, Chilia and Cetatea Albă on the Black Sea charts (Vesconte 1311, the 1335 chart, Roselli, Agnese);
   - Dacia on Ptolemy;
   - the Danube road stations on the Peutinger table;
   - Fra Mauro's naming of the lower Danube.

   Coverage is a claim, so it needs an Attestation per place named, with form `name` or `depiction`.
2. **No record names its holding institution.** `repository` is empty on all ten, although eight are institutional witnesses. Each needs the institution and its shelfmark: for example, the Marciana for Fra Mauro and the Austrian National Library for the Peutinger table. These are known, but must be written from the institution's own catalogue, with the date checked.
3. **No reproduction clearance is recorded.** Every record says "Public domain" but none records `reproduction_cleared`. A public-domain map is not the same as a free reproduction: the institution's image terms decide that. `RIGHTS-CLEARED` will require it at `publishable`. The three records already published (`ptolemy`, `peutinger`, `trade-vesconte-1311`) should be checked first.
4. **No IIIF images.** All images are static. The ticket asks for IIIF checks for the portolans and Fra Mauro: where the institution publishes a IIIF manifest, the record should point at it. The weekly link check (spec 010) then watches it.
5. **Two records are incomplete:** `trade-bianco-1436` and `trade-agnese-1544` have no witness kind, image or rights.
6. **One date to check:** Fra Mauro is recorded as 1459. The ticket says c. 1450, the usual date for the Venice map. 1459 is the date of the copy sent to Portugal, which is lost. Settle it from the Marciana's record, and give the record the EDTF date it supports (for example `1450~` or `1448/1459`).
7. **No Ruscelli Tabula Europae IX.** It is on the acquisition list. Recording it needs Vlad's acquisition decision first: as a held witness if bought, otherwise as an institutional witness.

## Out of scope for these records

- **Ortelius, *Romaniae… descriptio*.** It shows Thrace (Rumelia), not the Romanian lands, so it is not an anchor. The shifting meaning of "Romania" on early modern maps is a possible essay topic of its own.
- **Charters and chronicles as textual geography.** These are Sources and Attestations, not map records.

## Work list for TCX-83

- [ ] Vlad decides: buy the Ruscelli Tabula IX or not (item 7).
- [ ] Holding institution and shelfmark for the eight institutional witnesses, from each institution's catalogue (item 2).
- [ ] Image terms and `reproduction_cleared` for all ten, starting with the three published ones (item 3).
- [ ] IIIF manifests where published: portolans and Fra Mauro first (item 4).
- [ ] Complete `trade-bianco-1436` and `trade-agnese-1544` (item 5).
- [x] Settle the Fra Mauro date (item 6). Settled 2026-11-23: `1450~`, from its holder (see below).
- [ ] Coverage and its Attestations, read from each image (item 1). This is last, because it needs the images and a person reading them.

None of these can be completed from this session. The institutions' catalogues and image terms are online pages that need checking one by one, and coverage needs a person to look at each map. This file is the audit and the plan, and it says where each fact will come from.

## Checked on 23 November 2026

The session's network was opened to the institutions' and Commons' hosts on 23 November 2026, and these were read.

**Fra Mauro (item 6, settled).** The Biblioteca Nazionale Marciana, which holds the map, dates it "databile all'anno 1450 ca." It describes it as a manuscript on parchment sheets glued to a wooden support, "cm 230 x 230 ca." ([Il Mappamondo di Fra' Mauro](https://bibliotecanazionalemarciana.cultura.gov.it/patrimonio/patrimonio-librario/il-mappamondo-di-fra-mauro/)).

What changed in the registry:
- The record `fra-mauro` now has `date_published: "1450~"` and `repository: Biblioteca Nazionale Marciana, Venice`.
- Evidence `evidence-000023` cites the page, through `bibliography_entry-000058` and Source `source-000005`. Its locator is `pending` and `proposed_by: ai` until a person verifies it.
- The page gives no shelfmark, and its dimensions are approximate, so `dimensions` stays `not_yet_verified`.

**Where each image comes from (item 2 and item 3, leads only).** The image each record shows is a Wikimedia Commons file. Commons names the institution the file came from and the licence it gives, as below (Commons API, `extmetadata`, read 2026-11-23). These are leads for the holding institution, not catalogue facts. A Commons "Public domain" licence is also not the institution's reproduction terms, so `reproduction_cleared` stays `false`.

| Record | Commons file credits | Commons licence |
|---|---|---|
| `ptolemy` | "Medieval book" (no institution named) | Public domain |
| `peutinger` | Austrian National Library | Public domain |
| `carta-pisana` | BnF | Public domain |
| `trade-vesconte-1311` | Archivio di Stato di Firenze | Public domain |
| `trade-vesconte-1321` | Bibliothèque municipale de Lyon | Public domain |
| `trade-loc-portolan` | Library of Congress, item 2003630429 | Public domain |
| `fra-mauro` | Biblioteca Nazionale Marciana (page above) | Public domain |
| `trade-roselli-1466` | University of Minnesota (cartographic-images.net) | Public domain |

**Still blocked:**
- **The Library of Congress record** (`www.loc.gov/item/2003630429/`) returned HTTP 503 twice. Its title, date, rights and IIIF manifest are unread.
- **IIIF manifests (item 4)** are not checked yet for any record.
- **Holding institution and shelfmark (item 2)** for the other seven need each institution's own catalogue. The Commons credits above say where to look.
- **`trade-bianco-1436` and `trade-agnese-1544` (item 5)** stay incomplete. The Agnese workshop made many atlases, so the record must first say which copy it means, and that is the author's call, made from the bibliography it cites.
- **Ruscelli (item 7)** is the author's acquisition decision.

