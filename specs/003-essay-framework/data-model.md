# Data Model: Essay Framework & Editorial Pipeline

Extends the Essay section of spec 001's data model. Fields are those of the clarified FR-001; `FAM-UNKNOWN` rejects anything not listed.

## Essay record (`content/essay/<id>.yaml`)

| Field | Rule |
|---|---|
| Entity base | `id`, `family: essay`, `origin`, `title`, `slug`, `slug_history`, `release`, `relations[]` (related essays come from here), `private`; `lifecycle` is stored and must equal the value derived from `stage` (`LIFE-ESSAY-DERIVED`) |
| `stage*` | one of the nine stages in order |
| `stage_history*` | list of `{stage, on, by}`; contiguous from Concept; last entry equals `stage` (`ESSAY-HISTORY`) |
| `authors*` | list of names (citation export) |
| `published_on` | EDTF date, required from Publish |
| `question*` | the historical question; required from Concept |
| `thesis` | one sentence; required from Outline |
| `rooms*` | `{primary: <room id>, secondary: [<room id>, …]}`; primary required from Concept; at most two secondary; none equals the primary; every id resolves to a room (`ESSAY-ROOMS`) |
| `maps[]`, `places[]`, `sources[]`, `evidence[]` | existing typed references |
| `layers[]` | layer IDs (typed reference) |
| `bibliography[]` | bibliography-entry IDs (typed reference) |
| `accent` | an accent slot name (`ESSAY-ACCENT`); default slot when absent |
| `open_questions[]` | strings; the key must exist from Research (it may be empty) |
| `interactions[]` | `{id, component, question, evidence[], interpretation}` (see below) |
| `signoffs` | `{historical, cartographic, data}`, each `{by, on}`; required from Publish (`ESSAY-SIGNOFF`) |
| `design_qa_passed` | boolean; required true from Publish |
| `legacy_url` | the old address a rebuilt essay supersedes |
| `redirect_switched` | `{by, on}`; required at Cross-link when `legacy_url` is set |
| `jira` | epic key; never public |
| `rights` | as for other content families |
| `portal_dimensions[]` | unchanged (ADR 0003 §6) |

## Stage table (cumulative; each stage also needs every earlier stage's checks)

| Stage | Derived lifecycle | Exit check added at this stage | Rule |
|---|---|---|---|
| Concept | proposed | `question`, `rooms.primary`, `authors`, a one-entry `stage_history` | `ESSAY-QUESTION`, `ESSAY-ROOMS`, `ESSAY-HISTORY` |
| Corpus | researching | every ID in `maps[]` resolves; a rights state for each (the map's `rights` exists) | `ESSAY-CORPUS` |
| Research | researching | `sources[]` with locators on the evidence; `open_questions` key present | `ESSAY-RESEARCH` |
| Outline | verified | `thesis`; every planned interaction declared with question, evidence, interpretation | `ESSAY-OUTLINE`, `ESSAY-INTERACTION` |
| Draft | verified | the body exists; every citation resolves; no finding aid cited; body props are literals | `ESSAY-DRAFT`, `ESSAY-BODY-DYNAMIC`, `REF-FINDING-AID` |
| Build | in_build | layers resolve; integrity gate green; body entities exist | `ESSAY-BUILD` |
| Design QA | qa (publishable once `design_qa_passed`) | image rights cleared | `RIGHTS-CLEARED` |
| Publish | published | `release: released`; three sign-offs; `published_on`; everything the body embeds or cites is public; essay page type in the CI template list | `ESSAY-PUBLISH`, `ESSAY-SIGNOFF`, `ESSAY-BODY-PUBLIC` |
| Cross-link | published | reverse links present; `redirect_switched` when `legacy_url` is set | `ESSAY-CROSSLINK` |

## Interaction declaration

| Field | Rule |
|---|---|
| `id` | unique within the essay; the body refers to it as `<Interaction id="…">` |
| `component` | the component name (a shared one, or `bespoke`) |
| `question` | the question the interaction asks; required |
| `evidence[]` | Evidence IDs; each must resolve; at least one |
| `interpretation` | the expected interpretation; required |

`ESSAY-INTERACTION` fails a declared interaction missing a field, a used `id` that is not declared, and (from Build) a declared `id` the body never uses.

## Bibliography section (on `bibliography_entry`, shared with spec 006)

`section`: `primary_sources`, `historical_maps`, `reference_works`, `specialised_studies`, `digital_resources`, `datasets_licences`, `further_reading`, in this order on the page; a section with no entries is hidden.

## Trench A cell data (local, used by the Terra Sigillata epic)

A cell is `{pit, stratum, name, language, reading, note, corpus: none | attestation, attestation?}`; `corpus: none` renders as "not yet corpus-backed"; setting `attestation` to an ID is the only change a retrofit makes. The cell file lives with the essay, not in the registry.

## Derived (never stored)

Related essays (from `relations[]`, public essays only), the reverse links on referenced entities (spec 001), and the rendered citations and exports.
