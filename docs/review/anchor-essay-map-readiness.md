# The anchor essay: what Publish will want from its six maps

Written 2026-11-17 at spec 009 T028, from `npm run essay:preview -- dacia-lapidarium`. The preview builds a copy of the registry in which the essay and everything it uses are marked published and released, so it shows now what the gate will say at Publish. The copy is thrown away; nothing here has changed a record.

The build fails with **61 errors**. Four are the essay's own and are simply later stages: `thesis` (Outline), `evidence` and `open_questions` (Research), and a `rights` licence for the essay itself. The other 57 are the six maps, and they are the real finding: these are legacy imports that have never been made publication-ready.

| Record | What the gate wants before Publish |
|---|---|
| `essay-000001` | ESSAY-OUTLINE; ESSAY-RESEARCH ×2; RIGHTS-MISSING |
| `hereford` | BIB-LISTED-HELD ×3; FAM-REQUIRED; IMPORT-REVIEW; MAP-DEALER-ONLY; MAP-FIELD-STATUS ×5 |
| `honterus` | IMPORT-REVIEW; MAP-DEALER-ONLY; MAP-FIELD-STATUS ×6; MAP-MAKER-HELD |
| `ortelius` | IMPORT-REVIEW; MAP-DEALER-ONLY; MAP-FIELD-STATUS ×6; MAP-MAKER-HELD |
| `peutinger` | FAM-REQUIRED; IMPORT-REVIEW; MAP-DEALER-ONLY; MAP-FIELD-STATUS ×6 |
| `ptolemy` | IMPORT-REVIEW; MAP-DEALER-ONLY; MAP-FIELD-STATUS ×6; MAP-MAKER-HELD |
| `trade-vesconte-1311` | BIB-LISTED-HELD; IMPORT-REVIEW; MAP-DEALER-ONLY; MAP-FIELD-STATUS ×6; MAP-MAKER-HELD |

## What each rule is asking for

- **IMPORT-REVIEW** (every map): a legacy import stays `researching` until the editor confirms it. Publishing a map means confirming its import first.
- **MAP-FIELD-STATUS** (every map, five or six fields each): `atlas_context`, `georeferencing_status`, `language`, `provenance`, `publication_place` and for four of them `edition_state` need either a value or a `field_status` entry saying why there is none. The second is cheap and honest, and is how the rest of the catalogue answers it.
- **MAP-DEALER-ONLY** (every map): an attribution needs at least one evidence record supporting it. The essay is already minting seventeen evidence records; some of them can carry this.
- **MAP-MAKER-HELD** (`ptolemy`, `honterus`, `ortelius`, `trade-vesconte-1311`): the cartographer records behind these maps are held. Either they join the release list at Publish, or the maps cannot name them.
- **BIB-LISTED-HELD** (`hereford` ×3, `trade-vesconte-1311`): the bibliography entries these maps list are held, with the same choice.
- **FAM-REQUIRED makers** (`hereford`, `peutinger`): the two maps with no maker at all, which is T027's open question.

## What it means for the release list

Research R10 lists what Publish releases: the essay, its seventeen evidence records, the twelve sources and their entries, and the maps it shows. This run says that list is short by two kinds of record: **the cartographers the maps name**, and **the bibliography entries the maps list**. Either they are released with the maps, or those references come off the map records. That is a decision for the Publish slice (T053 onwards), not for Corpus, and it is recorded here so that it is not met for the first time on the day of publication.

Nothing above blocks the stage the essay is at. It reached Corpus on 2026-11-17, which needs only that every map resolves and carries a rights state, and all six do.

---

## After the field-status answers, 17 November 2026

The thirty-five `MAP-FIELD-STATUS` errors are cleared. Nothing was invented to do it: `georeferencing_status` is now the value `none`, which is true of all six, `atlas_context` is `not_applicable` on the two that come from no atlas or series (the Peutinger roll and the Hereford map), and every other missing field carries `not_yet_verified`, which says exactly what is the case, that nobody has checked it yet. Any of them can be upgraded to a value later; the rule then wants the status to read `recorded`.

The preview build now fails with **53 errors**, and every one of them needs a person or a decision:

| Rule | Count | What it needs |
|---|---|---|
| `IMPORT-REVIEW` | 15 | each legacy record (the six maps and nine sources) needs `editor_confirmed: true`, `confirmed_by` naming a person and `confirmed_on`. The rule refuses a confirmation that looks automated, which is the point of it |
| `RIGHTS-MISSING` | 14 | a `rights.licence` on the essay itself and on its thirteen evidence records. One decision, applied fourteen times: what licence does the essay and its own notes carry? |
| `AUTO-UNADJUDICATED` | 9 | the nine sources imported with machine assistance need `adjudicated_by` and `adjudicated_on`, again a named person |
| `MAP-DEALER-ONLY` | 6 | each map's attribution needs at least one evidence record behind it. Some of the sheets name their own maker in a cartouche, which is attribution evidence, but saying so is a scholarly call |
| `MAP-MAKER-HELD` | 4 | the cartographers the maps name are held; either they join the release list or the maps stop naming them |
| `BIB-LISTED-HELD` | 4 | the bibliography entries the Hereford and Vesconte records list are held, with the same choice |
| `FAM-REQUIRED` | 1 | the Hereford maker, left open deliberately on 17 November |

The first three are the author's by design: these rules exist so that no machine can mark a legacy import reviewed. The last three are the release-list decision this document already records, and they belong to the Publish slice.

