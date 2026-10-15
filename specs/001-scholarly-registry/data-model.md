# Data Model: Scholarly Entity Registry

Terms follow `GLOSSARY.md`; vocabularies are fixed by ADR 0003.

## Common entity envelope (all families)

| Field | Type | Rules |
|---|---|---|
| `id` | local ID | `[a-z0-9][a-z0-9._-]{0,127}`; unique within (authority, family); immutable |
| `authority` | string | default `tc`; `[a-z][a-z0-9]{1,15}` |
| `family` | enum | essay · map · cartographer · place · source · attestation · dataset · layer · collection · route · event · period · room · bib |
| `title` | string | required; free to change |
| `slug` | string | required for routable families; free to change |
| `previous_slugs` | string[] | generates redirects |
| `lifecycle` | enum | `proposed · researching · verified · ready_for_build · in_build · qa · publishable · published · superseded · blocked`; **forbidden on essays** (derived) |
| `superseded_by` | ref | required when `lifecycle = superseded` |
| `rooms` | `{ primary?: room-ref, secondary: room-ref[] }` | room refs must resolve to the seven rooms |
| `evidence` | Evidence[] | see below |
| `rights` | Rights | required when lifecycle ≥ `publishable` |
| `extraction` | Extraction | optional; see below |
| `private` | object | never public (FR-009) |
| `refs` | per-family typed reference fields | every ref must resolve |

**Derived (never authored):** `qualified_id = tc:{authority}:{family}:{id}`; `released = lifecycle == published`; for essays `lifecycle = f(stage)`; for layers `available = asset exists`.

## Family-specific fields (v1 subset)

| Family | Key fields | References |
|---|---|---|
| essay | `stage` (9 values), `question`, `dimensions[]` (optional: Measure, Witness, Use, Cosmos, Power, Silence) | maps[], layers[], places[], sources[], bib[] |
| map | per spec 004 FR-001; each descriptive field carries `{ value, status: recorded \| not_applicable \| not_yet_verified \| unknown }`; optional physical-object block (ADR 0002) | cartographers[], places[], layers[], bib[] |
| cartographer | names[], roles[], dates | maps[], bib[] |
| place | names[] (with language, script, `valid_from`/`valid_to`), `geometry_ref?` | sources[] |
| source | citation (CSL-JSON shape), `kind: source \| finding_aid` | bib |
| attestation | place, source, name form, script/language, locator, attestation class, `silence_state?` | place, source |
| dataset | question(s), extent, CRS, format, licence | layers[], sources[] |
| layer | role, theme, collections[], temporal envelope, `per_feature_time`, asset path | dataset, collections[] |
| collection | `layer_ids[]`, `default_layer_ids[]` (⊆ `layer_ids`), question | layers[] |
| route, event, period | `valid_from`/`valid_to`, date precision | places[], sources[] |
| room | name, order (1–7), descriptions | (none) |
| bib | CSL-JSON, `section` (one of seven) | (none) |

## Evidence

| Field | Type / values |
|---|---|
| `source` | source ref (finding aids rejected) |
| `locator` | string (page / folio / plate / record) |
| `locator_state` | `verified \| pending` |
| `verified_by`, `verified_on`, `consulted_copy` | required iff `verified` |
| `evidence_type` | textual · cartographic · archaeological · archival · epigraphic · other |
| `valid_from`, `valid_to` | ISO-like historical dates (negative years allowed) |
| `date_precision` | day · month · year · decade · century · range · unknown |
| `geometry_provenance` | source_geometry · georeferenced_trace · scholarly_reconstruction · generalized_editorial · modern_reference |
| `reconstruction` | none · partial · full |
| `confidence` | secure · probable · possible · conjectural · unknown |
| `silence_state` | non_survival · non_survey · non_request · alternative_naming · outside_frame · source_not_applicable · meaningful_silence |
| `last_verified` | date |

**Rule:** `confidence = secure` ⇒ every locator in that evidence is `verified`.

## Rights
`licence` (SPDX id or `rights-reserved` / `public-domain`), `attribution`, `text_copyright_status`, `reproduction_cleared: boolean` (kept separate, TC-D018).

## Extraction
`method: manual | ocr | htr | llm`; when not manual: `raw_evidence_ref`, `transformation_log_ref`; `adjudicated_by` and `adjudicated_on` are required before lifecycle may pass `verified`.

## State transitions

```
proposed → researching → verified → ready_for_build → in_build → qa → publishable → published
                any state → blocked (→ back to the prior state)
                published → superseded (requires superseded_by)
```
Essay stage → lifecycle: Concept→proposed; Corpus, Research→researching; Outline, Draft→verified; Build→in_build; Design QA→qa (→publishable when its checks pass); Publish, Cross-link→published.

## Integrity rules (each is one violation code)

| Code | Rule |
|---|---|
| `ID_SYNTAX` | id, authority or family malformed |
| `ID_DUPLICATE` | same (authority, family, id) declared twice; report lists every file |
| `REF_UNKNOWN` | reference does not resolve |
| `REF_FAMILY` | reference resolves to the wrong family |
| `ENUM_INVALID` | value outside a shared vocabulary, or an unmapped specialist term |
| `PROVENANCE_MISSING` | publishable record lacks required evidence or rights fields |
| `LOCATOR_UNVERIFIED_SECURE` | secure claim rests on a pending locator |
| `LOCATOR_VERIFICATION_INCOMPLETE` | verified locator missing verified_by / verified_on / consulted_copy |
| `ESSAY_LIFECYCLE_DECLARED` | essay declares lifecycle |
| `SUPERSEDED_WITHOUT_SUCCESSOR` | superseded without superseded_by |
| `COLLECTION_DEFAULTS` | default_layer_ids ⊄ layer_ids, or duplicate members |
| `ASSET_MISSING` | published layer has no runnable asset |
| `EXTRACTION_UNADJUDICATED` | automated extraction past `verified` without adjudication |
| `FINDING_AID_AS_SOURCE` | evidence cites a finding aid |
