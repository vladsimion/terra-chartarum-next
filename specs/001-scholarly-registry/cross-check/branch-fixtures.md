# Cross-check: the parallel branch's fixtures through this gate (T117)

Date: 2026-10-16. Gate: `main` at `b20383d` (48 rules). Subject: the 23 fixture files under `tests/registry/fixtures/valid/` on `origin/001-scholarly-registry`. Decision behind it: `main` is the implementation; the branch is retired after porting.

## Method

1. Export the branch's fixtures, put them under `content/`, and run `registry check` unchanged: **60 errors, 5 warnings**. Almost all of it is the two models naming things differently, not defects.
2. Translate the naming layer only, mechanically (`cross-check/translate-branch-fixtures.py`): bare slug IDs to `tc:{authority}:{family}:{local-id}` with `origin: legacy`; `family:slug` references to canonical IDs; `bibliography` to `bibliography_entry`; `cartographers` to `makers`; lifecycle and release defaults; essay lifecycle derived from stage. Structural differences are left alone so the gate reports them. Result: **8 errors, 13 warnings**.
3. Map the branch's 17 rule codes to this gate's rules.
4. Probe the one behaviour that stood out (unknown fields).

Re-run: export the fixtures with `git archive origin/001-scholarly-registry tests/registry/fixtures`, then `python3 -I specs/001-scholarly-registry/cross-check/translate-branch-fixtures.py <fixtures/valid> <out-root>` and `npm run registry -- check --dir <out-root>`.

## Rule coverage: all 17 branch codes have a counterpart

`ASSET_MISSING` = `LIFE-AVAILABILITY`; `COLLECTION_DEFAULTS` = `REF-COLLECTION-SUBSET`; `DATE_INVALID` = `DATE-INVALID`; `ENUM_INVALID` = `ENUM-INVALID`; `ESSAY_LIFECYCLE_DECLARED` = `LIFE-ESSAY-DERIVED`; `EXTRACTION_UNADJUDICATED` = `AUTO-UNADJUDICATED`; `FILE_UNREADABLE` and `SCHEMA_INVALID` = `LOAD-PARSE`; `FINDING_AID_AS_SOURCE` = `REF-FINDING-AID`; `ID_DUPLICATE`, `ID_SYNTAX` = same names; `LOCATOR_UNVERIFIED_SECURE` = `LOC-SECURE-PENDING`; `LOCATOR_VERIFICATION_INCOMPLETE` = `LOC-VERIFIED-FIELDS`; `PROVENANCE_MISSING` = `PROV-GEOMETRY` and `PROV-SOURCE`; `REF_FAMILY`, `REF_UNKNOWN` = `REF-FAMILY`, `REF-UNKNOWN`; `SUPERSEDED_WITHOUT_SUCCESSOR` = `LIFE-SUPERSEDED`.

Limit: this mapping is by what each rule says, not by running the branch's own mutation tests through this gate. That would be a further slice if wanted.

## Disagreements

### Bug (fix in this repository)

| # | Finding | Evidence | Consequence |
|---|---|---|---|
| B1 | **Unknown fields are accepted silently.** `EntityBase` is `z.looseObject` and no rule rejects extra keys (T041 deferred per-family schemas to spec 002). The branch uses `z.strictObject` and rejects them. | A place record with `rooms_typo` and `unheard_of_field` passes: `registry check: PASS - 0 errors, 0 warnings`. The translated branch fixtures kept `previous_slugs` (this model's name is `slug_history`) and the gate passed. | A misspelt field is dropped without a trace. The worst case is `slug_history`: a misspelling loses the redirect for a former URL while the gate stays green, which defeats FR-013 and SC-002. |

New task T122 below. It needs the per-family field lists from `data-model.md`, and must allow the `legacy_*` import fields and the `private` block.

### Decisions (model differences; `main` stands unless noted)

| # | Branch | `main` | Basis |
|---|---|---|---|
| D1 | Bare slug as ID, no `origin` | `tc:{authority}:{family}:{local-id}`, `origin: legacy \| minted` | ADR 0006 items 1 and 11 |
| D2 | `lifecycle` optional; essays carry only `stage` | `lifecycle` and `release` on every record; essay lifecycle derived from stage | ADR 0003, TC-D019 |
| D3 | References as `family:slug` | Canonical IDs | ADR 0006 |
| D4 | Family `bibliography` | `bibliography_entry` | ADR 0006 item 11 amendment, GLOSSARY |
| D5 | Map field `cartographers` | `makers` | data-model.md; `FAM-REQUIRED` still catches a map without `makers` |
| D6 | `slug` required only for routable families; `previous_slugs` | `slug` on every entity; `slug_history` | spec Entity, FR-013 |
| D7 | `locator` as a plain string on attestations | `locator` as an object with a state | `evidence.ts` `LocatorShape`, TC-D018 |
| D8 | An external authority (`cnd`) as a record family of its own, file `apulum-cnd.yaml` | External authorities are `same_as[]` links, never records; allowlist `tc, pleiades, whg`. `LOAD-PATH` has no authority segment, so two records could not share a local-id. That follows from this rule and is not a defect. | ADR 0006 item 17 |
| D9 | Records set `lifecycle: published` on import | Imports start at `researching` until an editor confirms (`IMPORT-REVIEW`) | TC-D024 |
| D10 | `rooms: {primary, secondary}` on every record | No such field in spec 001. `main` accepts it only because of B1, so room assignments would be lost silently. | ADR 0003 sets "primary room" at the Concept gate; the field belongs to spec 007 or the essay schema. **Needs your decision**, see T123. |
| D11 | Fixtures hold only 2 of the 7 rooms | `ROOM-SET` requires all seven | Fixture incompleteness, not a rule difference |
| D12 | No `csl` on bibliography entries, no `version` on datasets, no `place_type`, no `rights` on layers/essays | Warnings `FAM-REQUIRED` and `RIGHTS-MISSING` | Branch fixtures are thinner than this model requires; warnings only |

### Where the branch is stricter or has something `main` lacks

Only B1. Everything else that the branch checks, `main` checks too.
