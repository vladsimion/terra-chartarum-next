# Data Model: The Anchor Essay

Nothing here adds a registry family or a rule. The essay, evidence and cell shapes are spec 003's; this document says what values this essay takes and what the review files hold. Field rules are the existing `ESSAY-*` rules unless a test is named.

## Essay record (`content/essay/<id>.yaml`)

| Field | Value | Rule |
|---|---|---|
| `id` / `slug` | `tc:tc:essay:essay-NNNNNN` (minted by `registry new essay`) / `dacia-lapidarium` | `ID-*`, `SLUG-UNIQUE`; the slug is set by hand, because `registry new` derives one from the title |
| `title` | Terra Sigillata · Lapidarium Dacicum | |
| `origin` | `minted` | counter id enforced for minted records |
| `authors` | `["Vlad Simion"]` | `ESSAY-QUESTION` stage group |
| `accent` | `gold` | `ESSAY-ACCENT` |
| `rooms` | `primary: tc:tc:room:border`, `secondary: [tc:tc:room:archive]` | `ESSAY-ROOMS` |
| `portal_dimensions` | `[Measure, Silence]` | |
| `question`, `thesis` | the author's | `ESSAY-QUESTION` (Concept), `ESSAY-OUTLINE` (Outline) |
| `maps` | up to six: `ptolemy`, `peutinger`, `hereford`, `trade-vesconte-1311`, `honterus`, `ortelius` | `ESSAY-CORPUS`: each resolves and has `rights` |
| `sources`, `evidence`, `bibliography` | the twelve sources; the 17 evidence records; the twelve entries | `ESSAY-RESEARCH`, `ESSAY-BUILD` |
| `interactions` | five (below) | `ESSAY-INTERACTION` |
| `legacy_url` | `/essays/dacia/` | private field; `ESSAY-CROSSLINK` needs `redirect_switched` |
| `stage`, `stage_history`, `lifecycle` | one stage at a time from Concept; `lifecycle` derived | `ESSAY-HISTORY`, `LIFE-ESSAY-DERIVED` |
| `design_qa_passed`, `signoffs`, `published_on`, `redirect_switched` | set at Design QA, Publish and Cross-link; all by Vlad Simion | `ESSAY-SIGNOFF`, `ESSAY-PUBLISH`, `ESSAY-CROSSLINK` |
| `open_questions` | present (may be empty) | `ESSAY-RESEARCH` |
| `release` | `held` until Publish | `ESSAY-PUBLISH` |

Not carried over from the legacy frontmatter: `eras`, `regions`, `mapCount`, `yearFrom`, `yearTo`, `readingMinutes`, `metaScores`, `featured`, `order`, `status`, `cover`, `hero`, `publishedAt`, `updatedAt`, and the legacy lenses other than the two mapped to portal dimensions.

## Interaction declarations (`interactions[]`)

| `id` | `component` | Built from | Evidence |
|---|---|---|---|
| `hereford-against-vesconte` | `compare-slider` | the comparison desk | the interaction's own evidence record |
| `core-sample` | `scrollytelling` | the trench (13 strata) | its own record |
| `radar-ptolemy-iosephina` | `section-radar` | the section comparison (XII Ptolemy against IV Iosephina) | its own record |
| `radar-vesconte-secretum` | `section-radar` | IX Vesconte against I Secretum | its own record |
| `radar-secretum-satelles` | `section-radar` | I Secretum against 0 Satelles | its own record |

Each carries `question` and `interpretation`, written by the author (the legacy text supplies candidates). The timeline and the squeeze toggle are not declared: they ask the reader to interpret nothing.

## Evidence records (17, `content/evidence/`)

`evidence-NNNNNN`, each: `target`, `source` (a public source record), `locator.value` (author-supplied) with `state: pending` until a person verifies it, `evidence_type`, `confidence`. Twelve rest on the stones' sources (`src-ptolemy-geographia`, `src-tabula-peutingeriana`, `src-hereford-mappa`, `src-vesconte-portolan`, `src-honterus-chorographia`, `src-ortelius-parergon`, `src-cantacuzino-wallachia`, `src-cantemir-moldavia`, `src-iosephina-survey`, `src-russian-staff-1835`, `src-szathmari-charta`, `src-secret-century`); five rest on the interactions. No evidence record cites a finding aid (`REF-FINDING-AID`).

## Cell file (`content/essay/<id>.cells.json`)

An array of 52 `Cell`:

| Field | Meaning | Source |
|---|---|---|
| `pit` | `sarmizegetusa`, `apulum`, `napoca` or `drobeta` | the four pit headings |
| `stratum` | 0 to XII (13 per pit) | the "Stratum" column |
| `name` | the name found, with the author's `extra muros`, `absent` and `(uncertain)` marks | the "Name found" column |
| `language` | the tongue | the "Tongue" column |
| `reading` | the reading class | open for the author (research R6); `""` until confirmed |
| `note` | the author's note | the "Note" column |
| `corpus` | `none` | always; `attestation` is added only by a later CND retrofit |

Validation (`tests/essays/unit/cells-file.test.ts`): exactly 52 entries; four pits of thirteen strata each, in order; every row `corpus: 'none'` with no `attestation`; every row rendered "not yet corpus-backed".

## Review files (`docs/review/`)

**Changed-claim ledger** (`anchor-essay-changes.md`): one row per change to the author's text or data: `id`, `legacy line`, `legacy text`, `proposed text`, `reason`, `status` (`pending`, `approved`, `rejected`), `approved by`, `date`. A rejected row means the legacy text stays.

**Reconciliation report** (`pit-cells-reconciliation.md`): one row per cell compared with the legacy `attestations.csv` pit rows (50 rows against the essay's 52): `pit`, `stratum`, the essay's `name`, the CSV's `name_original`, `name_normalized` and class, the difference (`none`, `name`, `language`, `note`, `missing in CSV`, `missing in essay`), `resolution` and `resolved by`.

**Legacy paragraph manifest** (`anchor-essay-legacy-paragraphs.json`): `{line, sha256}` for each normalised paragraph of the legacy prose.

## Release list

The records that become public at Publish: the essay; its 17 evidence records; the 12 sources and their 12 bibliography entries; and the maps it shows (up to six). `tests/essays/unit/release-list.test.ts` pins the set; everything else stays held (research R10).

## State

An essay moves Concept, Corpus, Research, Outline, Draft, Build, Design QA, Publish, Cross-link, one stage per `registry promote`, never skipping. It is `held` until Publish. The ledger and reconciliation tests fail from Build on while anything is unresolved.
