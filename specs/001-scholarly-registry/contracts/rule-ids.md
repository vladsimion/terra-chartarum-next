# Contract: rule IDs

Stable string IDs. Tests and CI assert on these, never on message text. "From" is the lowest lifecycle at which the rule is an error; below it the rule is a warning (`always` = every state). Each mutation in `tests/registry/mutations.test.ts` names the rule it must trigger (SC-003).

| Rule ID | Checks | Spec | From |
|---|---|---|---|
| `LOAD-PARSE` | file parses as YAML and matches its schema shape | FR-005 | always |
| `LOAD-PATH` | filename equals local-id and directory equals family | FR-002 | always |
| `ID-SYNTAX` | ID matches the boundary pattern; minted IDs match counter form | US1.4 | always |
| `ID-DUPLICATE` | no two records share a canonical ID; names both files | US1.3 | always |
| `ID-AUTHORITY` | authority is `tc` or on the allowlist | FR-002 | always |
| `ID-FAMILY` | family is in the closed list | FR-001 | always |
| `ID-ORIGIN` | `origin` present; `legacy` IDs match the legacy pattern | FR-002 | always |
| `LIFE-VALUE` | lifecycle is a known value | FR-005 | always |
| `LIFE-ESSAY-DERIVED` | essay lifecycle matches its stage, not set by hand | US5.4 | always |
| `LIFE-AVAILABILITY` | `published` layer has a runnable asset | US5.5 | `published` |
| `LIFE-SUPERSEDED` | `superseded` has `superseded_by` resolving, or is withdrawn | FR-013 | always |
| `REL-VALUE` | release is `held` or `released` | FR-015 | always |
| `REF-UNKNOWN` | every declared reference resolves; names entity, field, missing ID | US3.1 | always |
| `REF-FEATURE` | evidence `target.feature` exists in the geometry file | FR-003 | always |
| `REF-COLLECTION-SUBSET` | `default_layers ⊆ members` | US3.2 | always |
| `REF-FINDING-AID` | no evidence source is a finding aid | ADR 0003 §5 | `ready_for_build` |
| `ENUM-INVALID` | any enumerated field holds a known value | FR-005 | always |
| `DATE-ORDER` | `valid_from ≤ valid_to` | FR-003 | always |
| `PROV-GEOMETRY` | geometry provenance present for feature targets | US2.1 | `ready_for_build` |
| `PROV-RECONSTRUCTION` | `scholarly_reconstruction` carries `reconstruction: true` | US2.1 | `ready_for_build` |
| `PROV-SOURCE` | evidence has a source and evidence type | FR-003 | `ready_for_build` |
| `PROV-MODERN-AS-EVIDENCE` | no evidence record, and no layer with role `historical`, `evidence` or `map-overlay`, has geometry provenance `modern_reference` | Constitution III | always |
| `LOC-VERIFIED-FIELDS` | `verified` requires `verified_by`, `verified_on`, `consulted_copy` | US2.2 | always |
| `LOC-SECURE-PENDING` | `secure` claim with a `pending` locator | US2.5 | always |
| `LOC-AI-VERIFIED` | AI-proposed locator cannot be `verified` without a person | FR-008 | always |
| `RIGHTS-MISSING` | rights/licence present | US2.3 | `ready_for_build` |
| `RIGHTS-CLEARED` | reproduction rights cleared for images | ADR 0003 §5 | `publishable` |
| `SIL-STATE` | silence attestation has exactly one silence state | US2.4 | always |
| `SIL-MISPLACED` | silence state only on a silence attestation | FR-004 | always |
| `SIL-SECURE` | silence rated `secure` without verified source coverage | FR-004 | always |
| `AUTO-UNADJUDICATED` | publishable record with an unadjudicated automated step | FR-008 | `publishable` |
| `AUTO-LOG` | automated step has tool, version, input, date | FR-008 | `ready_for_build` |
| `AUTO-ARTEFACT-HASH` | large artefact reference carries a checksum | FR-008 | `ready_for_build` |
| `ROOM-SET` | exactly the seven fixed rooms exist | ADR 0003 §7 | always |
| `SLUG-UNIQUE` | live slugs are unique | FR-013 | always |
| `SLUG-HISTORY-COLLISION` | a former slug equals a live slug | FR-013 | always |
| `SAMEAS-SYNTAX` | `same_as` authority allowlisted and ID syntax valid | FR-003 | always |
| `PRIV-LEAK` | private value or held ID found in built output (scan) | FR-009 | n/a (scan) |
| `IMPORT-FAMILY` | `port` imports only as `place` with a port type | FR-014 | always |
| `IMPORT-CONFIDENCE` | imported claim is not auto-`secure`; `legacy_confidence` kept | FR-014 | always |
| `IMPORT-REVIEW` | imports start at `researching`; `legacy_review_state` kept | FR-014 | always |
| `IMPORT-LAYER-LIFECYCLE` | an imported layer's lifecycle matches the FR-011 mapping of `legacy_layer_status`; unknown legacy terms fail | FR-011 | always |
| `IMPORT-REVIEWER` | `verified_by`/`verified_on` from legacy only when `editor_confirmed` | FR-014 | always |

Adding a rule means adding its ID here, its test, and its mutation.
