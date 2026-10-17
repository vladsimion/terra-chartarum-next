# Contract: map and cartographer rule IDs

New rules added to `specs/001-scholarly-registry/contracts/rule-ids.md` when they are implemented. Severity follows the registry's lifecycle ranking: "warn from" is the lowest lifecycle at which the finding is a warning, "error from" the lowest at which it is an error (`ready_for_build` or `publishable`). Each has a named mutation.

| Rule ID | Checks | Spec | Warn from | Error from |
|---|---|---|---|---|
| `MAP-FIELD-STATUS` | each field in `DISPLAYED_FIELDS` has a value or a `field_status` entry; every `field_status` value is one of the four; a `recorded` entry has a value; a status for a field with a value other than `recorded` is a mismatch | FR-002 | `ready_for_build` | `publishable` |
| `MAP-BASIS` | for a held witness, `basis.provenance` and `basis.atlas_context` are `observed` or `inferred` whenever the field has a value; an institutional witness carries no `basis` | FR-002 | `ready_for_build` | `publishable` |
| `MAP-VERIFICATION` | `verification` is one of the three; `last_verified` is a valid date unless `unverified`; `inspected` only on a held witness | FR-015 | | any |
| `MAP-IMAGE` | each image has a valid `type`, `https` `url`, `attribution`, a `static_url` for `iiif` and `deepzoom`, and a `witness_kind` equal to the record's; `alt` present | FR-001, FR-004, FR-017 | `ready_for_build` (for `alt`) | `publishable` (for `alt`); the rest any |
| `MAP-ATTRIBUTION` | `attribution: unresolved` if and only if some maker is a `workshop` | FR-011 | | `ready_for_build` |
| `MAP-DEALER-ONLY` | `attribution_evidence[]` is not made up only of Evidence records whose source has `source_kind` `dealer` or `auction`; at `publishable` at least one entry exists | FR-016 | `ready_for_build` | `publishable` |
| `MAP-MAKER-HELD` | every maker of a public map is public (published and released) | FR-012 | `ready_for_build` | `publishable` |
| `MAP-PRIVATE-FIELD` | no key at any depth, in any family, is a private acquisition word (`price`, `paid`, `cost`, `negotiation`, `vendor`, `dealer_contact`, `invoice`, `receipt`) | FR-010 | | any |
| `MAP-SCOPE` | `record_scope` is `object`, `work` or `concept`; an `object` has `witness_kind` (warn from `ready_for_build`, error at `publishable`); a `work` or `concept` has no `witness_kind`, no `images[]`, no `verification` of `inspected` and no `basis` | FR-003 | `ready_for_build` | `publishable` |
| `CART-KIND` | `kind` is `person` or `workshop`; `roles[]` values are from the three; a `workshop` has no `life_dates` | FR-001, FR-011 | | `ready_for_build` |

Existing rules that now also apply: `FAM-REQUIRED` (the map family's required list gains `witness_kind`, the cartographer's gains `kind`), `FAM-UNKNOWN`, `REF-UNKNOWN` and `REF-FAMILY` for `publication_place`, `coverage[]` (place), `attribution_evidence[]` (evidence) and `bibliography[]` (bibliography entry), `RIGHTS-CLEARED` for images, `DATE-*` for `date_published`, and the held-leak scan.
