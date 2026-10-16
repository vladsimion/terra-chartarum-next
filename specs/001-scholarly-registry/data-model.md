# Data Model: Scholarly Entity Registry

Terms follow `GLOSSARY.md`. Rules cite the spec (FR-/US-) and ADR 0006. `*` marks a required field.

## Shared types

| Type | Definition |
|---|---|
| `StableId` | Boundary form `tc:{authority}:{family}:{local-id}`. Authority `[a-z0-9][a-z0-9-]*`, family from the closed list (segment pattern `[a-z][a-z0-9_-]*`, a superset of the legacy pattern so `bibliography_entry` fits), local-id `[A-Za-z0-9][A-Za-z0-9._:-]*` (imports) or `{family}-{6 digits}` (minted). Unique per family. |
| `Origin` | `legacy` \| `minted` |
| `Lifecycle` | `proposed, researching, verified, ready_for_build, in_build, qa, publishable, published, superseded, blocked` (ADR 0003) |
| `Release` | `held` \| `released`, default `held` |
| `Confidence` | `secure, probable, possible, conjectural, unknown` |
| `GeometryProvenance` | `source_geometry, georeferenced_trace, scholarly_reconstruction, generalized_editorial, modern_reference` |
| `HistoricalDate` | An EDTF level 0-1 string with four-digit signed years: `0106`, `-0106`, `1595-03`, `159X`, `15XX`, `1595?`, `1595/1602` (ADR 0007). Precision (`day, month, year, decade, century, range`; `unknown` when missing) is **derived** from it, never authored. |
| `EvidenceType` | `textual, cartographic, archaeological, archival, other` (extensible only by ADR) |
| `SilenceState` | `non_survival, non_survey, non_request, alternative_naming, outside_frame, source_not_applicable, meaningful_silence` |
| `LocatorState` | `verified, pending` |
| `SameAs` | `{ authority*, id* }`, authority from the allowlist |
| `Rights` | `{ licence*, attribution, reproduction_cleared: boolean, text_public_domain: boolean }` (out-of-copyright text and reproduction rights are separate, Constitution VI) |

## Entity (every family)

| Field | Rule |
|---|---|
| `id*` | `StableId`; must match filename and `family` directory (US1.1, 1.4) |
| `family*` | closed list: essay, map, cartographer, place, source, attestation, dataset, layer, collection, route, event, period, room, bibliography_entry, evidence (FR-001) |
| `origin*` | `Origin` |
| `title*`, `slug*` | mutable; slug unique among live slugs |
| `slug_history[]` | former slugs; none may equal a live slug (FR-013) |
| `lifecycle*` | `Lifecycle`; essays derive it from stage and must not set it (US5.4) |
| `release*` | `Release` |
| `same_as[]` | `SameAs` (FR-003) |
| `relations[]` | declared references, each a `StableId`; every one must resolve (FR-005) |
| `superseded_by` | `StableId`, required when `lifecycle = superseded` and a successor exists (FR-013) |
| `private` | optional block of private fields; never projected (FR-009) |
| `legacy_family`, `legacy_confidence`, `legacy_review_state`, `legacy_layer_status`, `legacy_reviewer`, `legacy_review_date`, `legacy_normalization_method`, `editor_confirmed`, `confirmed_by`, `confirmed_on` | optional, imports only (FR-014, FR-011). The `IMPORT-*` rules constrain a record only until the import is **confirmed**: `editor_confirmed: true` with `confirmed_by` (a person, never an automated tool) and `confirmed_on`. A bare flag confirms nothing and is reported by `IMPORT-CONFIRMED`; afterwards the record follows its own lifecycle. A row with `legacy_normalization_method: llm_assisted` needs `adjudicated_by` and `adjudicated_on` before it is `publishable` (`AUTO-UNADJUDICATED`). |

## Evidence record (`family = evidence`)

| Field | Rule |
|---|---|
| `target*` | `{ entity: StableId, feature?: string }`; entity must resolve; `feature` must exist in the referenced geometry file when given |
| `source*` | `StableId` of a source; finding aids are rejected (stage-5 rule) |
| `locator` | `{ value*, state*: LocatorState, proposed_by*: person | ai, verified_by?, verified_on?, consulted_copy? }`; `verified` requires all three of `verified_by`, `verified_on`, `consulted_copy` (US2.2); a locator with `proposed_by = ai` cannot be `verified` unless `verified_by` names a person |
| `evidence_type*` | `EvidenceType` |
| `valid_from`, `valid_to` | `HistoricalDate`; the start is not definitely later than the end (`DATE-INVALID`, `DATE-ORDER`) |
| `date_label` | free text for display; `date_precision` is derived and a record that sets it fails (`DATE-PRECISION-AUTHORED`) |
| `geometry_provenance` | required when the target is a feature; `scholarly_reconstruction` also requires `reconstruction: true` (US2.1) |
| `reconstruction` | boolean; reconstructions are always flagged |
| `confidence*` | `Confidence`; `secure` forbidden if any supporting locator is `pending` (US2.5) |
| `rights` | `Rights`; required from `ready_for_build` (US2.3). Families that carry rights: evidence, layer, dataset, map, attestation, essay. A place is an authority record: its rights ride on its sources and evidence. |
| `last_verified` | date |
| `provenance_chain[]` | refs to `provenance/` steps (FR-008) |

## Attestation (`family = attestation`)

place × source × form. `place*`, `source*` (StableIds), `form*` (`name, depiction, silence`, extensible by ADR). When `form = silence`, exactly one `silence_state*` is required and `confidence = secure` additionally requires `source_coverage_verified: true` (FR-004). `silence_state` on any other form or family is a violation.

## Reference fields

Every field that points at another record. `referenceFields(record)` returns them all and `REF-UNKNOWN` checks each one.

| Family | Reference fields |
|---|---|
| all | `relations[]`, `superseded_by` |
| evidence | `target.entity`, `source`, `provenance_chain[]` (resolves to provenance steps) |
| attestation | `place`, `source` |
| collection | `members[]`, `default_layers[]` |
| map | `makers[]` (cartographer IDs) |
| layer | `dataset` |
| essay | `evidence[]`, `maps[]`, `places[]`, `sources[]` |

Typed references must point at the right family (`REF-FAMILY`): essay `maps[]` → map, `places[]` → place, `sources[]` → source, `evidence[]` → evidence; collection `members[]` and `default_layers[]` → layer; map `makers[]` → cartographer; layer `dataset` → dataset; evidence `source` → source; attestation `place` → place and `source` → source; `superseded_by` → the record's own family. `relations[]` and an evidence `target.entity` may point at anything.

## Family fields

Minimum fields per family beyond the Entity base. Everything not listed is optional or defined by a later spec.

| Family | Required | Optional |
|---|---|---|
| map | `makers[]` | `edition_state`, `repository`, physical-object fields (schema-only in v1, ADR 0002) |
| cartographer | none | `life_dates` |
| place | `place_type` (a port is `port`) | `location_status` |
| source | `is_finding_aid` (boolean, default `false`) | `source_kind` |
| dataset | `version` | `licence` |
| layer | `role` (`context, historical, evidence, map-overlay`), `asset` (path), `dataset` | `geometry_provenance` |
| route, event, period | none | `valid_from`, `valid_to`, `date_label` |
| bibliography_entry | `csl` (path to CSL-JSON) | none |

Modern reference geometry is context only: a layer whose `geometry_provenance` is `modern_reference` MUST have role `context`, and an evidence record MUST NOT have geometry provenance `modern_reference` (`PROV-MODERN-AS-EVIDENCE`, Constitution III).

## Essay (`family = essay`)

`stage*` (the nine editorial stages) and `design_qa_passed` (boolean, used only to tell `qa` from `publishable`, ADR 0003 §2); optional `portal_dimensions[]`, each one of `Measure, Witness, Use, Cosmos, Power, Silence` (FR-012, no UI in v1); references `evidence[]`, `maps[]`, `places[]`, `sources[]`.

## Collection (`family = collection`)

`members[]` (layer IDs), `default_layers[]`; `default_layers ⊆ members` (US3.2). A collection owns defaults, never geometry.

## Room (`family = room`)

Exactly seven, fixed IDs: `tc:tc:room:earth`, `map`, `city`, `border`, `road`, `archive`, `theatre`, in that order. A missing or extra room is a violation (ADR 0003 §7).

## Provenance step (`provenance/`)

`id*`, `tool*`, `tool_version*`, `input*` (source ref + locator), `ran_on*`, `parameters`, `artefact` (`{ url | shelfmark, sha256 }` for large artefacts), `status*` (`proposed` \| `adjudicated`), `adjudicated_by`, `adjudicated_on` (both required when adjudicated). A publishable record whose chain holds a `proposed` step fails (FR-008).

## Derived (never stored)

- **Availability** of a layer: a runnable asset exists at build time. `published` + missing asset fails (US5.5).
- **Essay lifecycle**: from editorial stage (ADR 0003 §2).
- **Reverse relationships**: for each declared reference, the referring entities that are `published` and `released` (FR-007). Only public targets get an entry, so a held entity's id is never handed out.
- **Public record**: the allowlist projection of an entity that is `published` and `released` (FR-009, FR-015).
- **Redirects and tombstones**: one 301 per former slug to the current page; a superseded record keeps its own address as a tombstone linking to its live successor (null when there is none), and its former slugs redirect to the tombstone, never past it (FR-013, spec 002 FR-011). Every record's current slug stays claimed, a superseded record's included, so no live record can reuse the address a redirect starts from. `renderRedirects` writes the Cloudflare `_redirects` text and refuses a path that could inject extra rules.

## Lifecycle behaviour

States and order per ADR 0003. A rule's severity depends on lifecycle (R6):

| Check group | Error from | Below that |
|---|---|---|
| ID syntax, family, lifecycle value, duplicates, reference resolution, enum values | `proposed` (always) | n/a |
| Provenance, locator, rights fields | `ready_for_build` | warning |
| Full rule set (rights cleared, held-leak preconditions, adjudicated chain) | `publishable` | warning or lower rule |

Transitions are not enforced by the registry beyond value validity; the editor moves records. `superseded` and `blocked` are side states reachable from any state. For severity, `blocked` ranks as `proposed` (it is not progressing, so it can wait with gaps) and `superseded` ranks as `ready_for_build`: provenance, locator and rights rules still bind a retired record because it was public, but publication checks (asset availability, cleared images, adjudication) do not. The rank table is typed against the lifecycle vocabulary, so a new value cannot silently rank as `proposed`.

## Release behaviour

`held` is the default and the safe state. Public pages, payloads, search indexes, exports and redirects include an entity only when `lifecycle = published` and `release = released`. A held entity may still be referenced by another held or released entity; the reference is valid but never surfaces publicly (spec edge case).
