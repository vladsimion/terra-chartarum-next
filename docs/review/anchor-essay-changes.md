# Anchor essay: the changed-claim ledger

Spec 009 (FR-004). The rebuilt essay is a faithful port of the author's text. Every change to that text or its data is a row here, approved by the author before the essay leaves Draft. `npm run essay:ledger` lists the rows still `pending`; `tests/essays/unit/ledger.test.ts` fails once the essay is at Build or later with any row pending, and whenever an `approved` row has no name or date.

Columns: `id`, the legacy line in `dacia.mdx` at the pinned snapshot `e82afd9`, the legacy text, the proposed text, the reason, `status` (`pending`, `approved` or `rejected`; a rejected row means the legacy text stays), who approved it and the date (`YYYY-MM-DD`). Rows start `pending`; "(to propose at port)" means the proposed wording is written when the section is ported.

| id | legacy line | legacy text | proposed text | reason | status | approved by | date |
| --- | --- | --- | --- | --- | --- | --- | --- |
| L01 | 74 (and the summary, line 5) | Nineteen centuries of maps of Dacia and Romania, staged twice | (to propose at port) | a derived duration: Ptolemy (c. 150) to now is about nineteen centuries; confirm the wording | pending | | |
| L02 | 130, 1588 | Thirteen stones on a wall, one for each map; The same thirteen maps | (to propose at port) | only twelve stones have a corpus source and six have a map record; the thirteenth, the satellite, has neither | pending | | |
| L03 | 78, 1586 | Ptolemy waits 1.87 metres down | (to propose at port) | the depth is derived from the strata; the drawing's own label says "0 to 188 centimetres" (line 1600), so 187 and 188 disagree; check against the section data | pending | | |
| L04 | 1589, 1600 | A sterile band of twelve centuries | (to propose at port) | a derived duration; check against the strata dates | pending | | |
| L05 | 90, 2148 | after eighteen centuries; slept for eighteen centuries | (to propose at port) | derived durations; check each against the years the sentence spans | pending | | |
| L06 | 2043 | sixteen centuries, and the state arrives | (to propose at port) | a derived duration: Ptolemy (c. 150) against the Josephine Survey (1769 to 1773) | pending | | |
| L07 | 1925 | 1:57,600 across one hundred and twelve sheets | (to propose at port) | a figure that depends on the survey data; verify it | pending | | |
| L08 | 168, 276, 378, 478, 583, 694, 809, 907, 1007, 1122, 1217, 1303, 2105, 2128, 2151, 2174 | the sixteen `CorpusRef` lines, each giving a source, its records and silences, and an Atlas link | a plain source line (a citation backed by its evidence record) with the tallies as literal text, no Atlas link | the CND layers stay held (ADR 0002), and a held layer cannot be linked; the tallies are re-verified at Design QA | pending | | |
| L09 | 14 and 134 to 136 | `yearTo: 2024` in the frontmatter; the timeline runs to 2026 | the frontmatter field is dropped; the timeline keeps 2026 | the two disagree; the field has no successor, so nothing in the text changes unless you want the date reconsidered | pending | | |
| L10 | 2225 | Tabula Peutingeriana - ÖNB Vienna, Cod. 324 | (to propose at port, for example: the Peutinger table) | the body rule rejects the registry map's title typed in the prose | pending | | |
| L11 | 2226 | Hereford mappa mundi - Hereford Cathedral | (to propose at port, for example: the Hereford map) | the body rule rejects the registry map's title typed in the prose | pending | | |
| L12 | 2093 to 2200 (the four pit tables) | tables with no mark of corpus status | each row marked "not yet corpus-backed" | spec 003 FR-016 requires a local cell to be shown as not yet corpus-backed | pending | | |
