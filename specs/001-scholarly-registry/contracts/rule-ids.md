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
| `ESSAY-QUESTION` | an essay at Concept or later has a `question` (spec 003; the rule is a stage check and is an error whenever it applies) | 003 FR-001 | always |
| `ESSAY-ROOMS` | `rooms.primary` is a room; at most two secondary rooms, each a room, none equal to the primary (from Concept) | 003 FR-014 | always |
| `ESSAY-HISTORY` | `stage_history` is contiguous from Concept, each stage once, with `on` and `by`; the last entry equals `stage` (from Concept) | 003 FR-003 | always |
| `ESSAY-ACCENT` | `accent`, when present, is a named accent slot (from Concept) | 003 FR-008 | always |
| `ESSAY-CORPUS` | every ID in `maps[]` resolves and its record carries rights (from Corpus) | 003 FR-002 | always |
| `ESSAY-RESEARCH` | `evidence[]` present with locators; `open_questions` key present (from Research) | 003 FR-002 | always |
| `ESSAY-OUTLINE` | `thesis` present (from Outline) | 003 FR-001 | always |
| `ESSAY-INTERACTION` | each declaration has `question`, `interpretation` and resolving evidence; every body `<Interaction id>` is declared; from Build every declaration is used (from Outline) | 003 FR-007 | always |
| `ESSAY-DRAFT` | the `.mdx` body exists; every `<Cite>` and `<EvidencePanel>` names resolving Evidence whose source is not a finding aid (from Draft) | 003 FR-004, FR-010 | always |
| `ESSAY-BODY-DYNAMIC` | every prop of a framework tag in the body is a string literal (from Draft) | 003 FR-004 | always |
| `ESSAY-BUILD` | `layers[]` and `bibliography[]` resolve; every map the body shows exists (from Build) | 003 FR-004 | always |
| `ESSAY-SIGNOFF` | three named, dated sign-offs and `design_qa_passed` (from Publish) | 003 FR-011 | always |
| `ESSAY-PUBLISH` | `release: released` and a valid EDTF `published_on` (from Publish) | 003 FR-012 | always |
| `ESSAY-BODY-PUBLIC` | every map, citation and evidence panel in the body is published and released (from Publish) | 003 FR-017 | always |
| `ESSAY-CROSSLINK` | when `legacy_url` is set, `redirect_switched` has `by` and a valid `on` (from Cross-link) | 003 FR-013 | always |
| `MAP-FIELD-STATUS` | each displayed field of a map has a value or a `field_status` entry; every status is one of the four; a `recorded` entry has a value; another status on a field with a value is a mismatch (warns from `ready_for_build`) | 004 FR-002 | `publishable` |
| `MAP-BASIS` | a held witness's `provenance` and `atlas_context` each carry `basis` observed or inferred when filled; an institutional witness has no `basis` (warns from `ready_for_build`) | 004 FR-002 | `publishable` |
| `MAP-VERIFICATION` | `verification` is one of three; `last_verified` is a real date unless `unverified`; `inspected` only on a held witness | 004 FR-015 | always |
| `MAP-IMAGE` | each image has a valid `type`, an `https` `url`, `attribution`, a `static_url` for `iiif` and `deepzoom`, and the record's `witness_kind`; `alt` present (the `alt` finding warns from `ready_for_build` and errors from `publishable`) | 004 FR-001, FR-004, FR-017 | always |
| `MAP-ATTRIBUTION` | `attribution` is `unresolved` if and only if some maker is a workshop | 004 FR-011 | `ready_for_build` |
| `MAP-DEALER-ONLY` | attribution evidence is not only dealer or auction material; a map at `publishable` has some (warns from `ready_for_build`) | 004 FR-016 | `publishable` |
| `MAP-MAKER-HELD` | every maker of a released map is published and released (warns from `ready_for_build`) | 004 FR-012 | `publishable` |
| `MAP-PRIVATE-FIELD` | no key at any depth, in any family, is an acquisition word (`price`, `paid`, `cost`, `negotiation`, `vendor`, `dealer_contact`, `invoice`, `receipt`); the value is never repeated | 004 FR-010 | always |
| `MAP-SCOPE` | `record_scope` is `object`, `work` or `concept`; an object has a valid `witness_kind`; a work or concept has no `witness_kind`, images, inspected verification or basis (warns from `ready_for_build`) | 004 FR-003 | `publishable` |
| `CART-KIND` | a cartographer's `kind` is `person` or `workshop`, `roles[]` are from the three, and a workshop has no `life_dates` | 004 FR-001, FR-011 | `ready_for_build` |
| `LAYER-THEME` | a layer's `theme` is one of the seven (warns from `ready_for_build`) | 005 FR-001 | `publishable` |
| `LAYER-TIME` | `envelope` is a valid EDTF interval whose earliest start is not after its latest end, and `time_mode` is `per_feature` or `envelope_only` (warns from `ready_for_build`) | 005 FR-001, FR-013 | `publishable` |
| `LAYER-FACET` | each facet has `property`, `label` and a `kind` of `category` or `range`; properties are unique; a per-feature layer does not use `valid_from` or `valid_to` | 005 FR-014 | always |
| `LAYER-GEOREF` | a `map-overlay` layer has a complete `georef` whose `map` is a map record, `residual_error_m` ≥ 0, `control_points` ≥ 3, `transformation` and `confidence` from their sets, and is not per-feature; any other role has none | 005 FR-019 | `ready_for_build` |
| `LAYER-ASSET-SIZE` | the source named by `asset` is within the host's per-file limit (25 MiB); judged only when the loader supplies sizes | 005 FR-006 | always |
| `PLACE-NAMES` | at least one name; each has a name, a BCP 47 `language`, a `kind` of `historic` or `modern`, valid EDTF `valid_from`/`valid_to` in order, and is not repeated (warns from `ready_for_build`) | 005 FR-009 | `publishable` |
| `PLACE-LOCATION` | `location` has numeric `lon` in -180 to 180 and `lat` in -90 to 90 (warns from `ready_for_build`) | 005 FR-009 | `publishable` |
| `SRC-ENTRY` | a source's `entry` is present and resolves to a bibliography entry, and a public source's entry is published and released (warns from `ready_for_build`) | 006 FR-006 | `publishable` |
| `BIB-EDITION` | `edition_of` and `translation_of` resolve to other bibliography entries and form no cycle through either field | 006 FR-010 | always |
| `BIB-CSL` | the file `csl` names exists, parses as exactly one CSL-JSON item with a `type`, a `title` and an `id` equal to the entry's stable ID; judged only when the loader supplies the files | 006 FR-014 | always |
| `BIB-LISTED-HELD` | a released essay, map, cartographer, dataset or layer lists only entries that are published and released in `bibliography[]` (warns from `ready_for_build`) | 006 FR-013 | `publishable` |
| `LIFE-AVAILABILITY` | `published` layer has a runnable asset | US5.5 | `published` |
| `LIFE-SUPERSEDED` | `superseded` has `superseded_by` resolving, or is withdrawn | FR-013 | always |
| `REL-VALUE` | release is `held` or `released` | FR-015 | always |
| `REF-UNKNOWN` | every declared reference resolves; names entity, field, missing ID | US3.1 | always |
| `REF-FAMILY` | a typed reference points at the right family: an essay's `maps[]` at maps, a successor of the same family; `relations[]` and an evidence target are untyped | FR-002, data-model.md "Reference fields" | always |
| `REF-FEATURE` | evidence `target.feature` exists in the geometry file | FR-003 | always |
| `REF-COLLECTION-SUBSET` | `default_layers ⊆ members` | US3.2 | always |
| `REF-FINDING-AID` | no evidence or attestation cites a source that is a finding aid | ADR 0003 §5 | `ready_for_build` |
| `ENUM-INVALID` | any enumerated field holds a known value | FR-005 | always |
| `FAM-REQUIRED` | the fields a family needs are present (data-model.md "Family fields") | FR-003 | `ready_for_build` |
| `FAM-UNKNOWN` | no field outside the fields the family's schema defines; a misspelt field is otherwise dropped silently (T122) | FR-003 | always |
| `VOCAB-UNKNOWN` | a record's `vocabulary` names a mapping file in `vocab-mappings/` (TC-D016, T118) | FR-011 | always |
| `VOCAB-TARGET` | every mapping lands on a term the shared vocabulary has | FR-011 | always |
| `VOCAB-SHADOW` | a specialist term that is also a shared term maps to itself | FR-011 | always |
| `DATE-INVALID` | `valid_from` and `valid_to` are EDTF level 0-1 with four-digit signed years (ADR 0007) | FR-003 | always |
| `DATE-ORDER` | the start is not definitely later than the end (earliest start vs latest end, so imprecise dates that may overlap pass) | FR-003 | always |
| `DATE-PRECISION-AUTHORED` | `date_precision` is derived from the date and never authored (ADR 0007) | FR-003 | always |
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
| `ROOM-SET` | exactly the seven fixed rooms exist (registry-level: runs only with `completeness`, which `check` turns on) | ADR 0003 §7 | always |
| `SLUG-UNIQUE` | current slugs are unique per family, a superseded record's included (its redirect starts there) | FR-013 | always |
| `SLUG-HISTORY-COLLISION` | a former slug equals a live slug | FR-013 | always |
| `SAMEAS-SYNTAX` | `same_as` authority allowlisted and ID syntax valid | FR-003 | always |
| `PRIV-LEAK` | private value or held ID found in built output (scan) | FR-009 | n/a (scan) |
| `IMPORT-FAMILY` | `port` imports only as `place` with a port type | FR-014 | always |
| `IMPORT-CONFIDENCE` | imported claim is not auto-`secure`; `legacy_confidence` kept | FR-014 | always |
| `IMPORT-REVIEW` | imports start at `researching`; `legacy_review_state` kept | FR-014 | always |
| `IMPORT-LAYER-LIFECYCLE` | an imported layer's lifecycle matches the FR-011 mapping of `legacy_layer_status`; unknown legacy terms fail | FR-011 | always |
| `IMPORT-CONFIRMED` | a confirmed import names who confirmed it and when; an automated tool cannot confirm | FR-014 | always |
| `IMPORT-REVIEWER` | `verified_by`/`verified_on` from legacy only when `editor_confirmed` | FR-014 | always |

Adding a rule means adding its ID here, its test, and its mutation.
