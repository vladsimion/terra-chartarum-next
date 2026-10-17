# Data Model: Bibliography & Citation

Extends the bibliography entry, source, dataset and layer rows of spec 001's data model ("Family fields"), building on spec 003's `section` field. Fields are those of the clarified FR-001, FR-003, FR-006 and FR-010; `FAM-UNKNOWN` rejects anything not listed.

## Bibliography entry (`content/bibliography_entry/<id>.yaml` and `<id>.csl.json`)

| Field | Rule |
|---|---|
| Entity base | `id`, `family: bibliography_entry`, `origin`, `title`, `slug`, `slug_history`, `lifecycle`, `release`, `relations[]`, `private` |
| `csl*` | path of the entry's CSL-JSON file (existing); one CSL item whose `id` equals the entry's stable ID and which has `type` and `title` (`BIB-CSL`) |
| `section` | one of the seven (spec 003): `primary_sources`, `historical_maps`, `reference_works`, `specialised_studies`, `digital_resources`, `datasets_licences`, `further_reading`; required from `ready_for_build` (an entry without one is not public) |
| `edition_of`, `translation_of` | optional entry IDs (typed references to the same family); never the entry itself; no cycles through either field (`BIB-EDITION`) |
| `digital_copy` | optional `https` URL of an external digital copy; no claim about its rights |

The labels of the seven sections, in order: Primary sources; Historical maps; Reference works; Specialised studies; Digital resources; Datasets and licences; Further reading.

Identifiers and keywords are not fields of the YAML. They live in the CSL-JSON (`DOI`, `ISBN`, `URL`, `call-number` or `archive_location`, `keyword`).

## Source (`family = source`), addition

| Field | Rule |
|---|---|
| `entry*` | the bibliography entry this Source points at (typed reference); required from `ready_for_build` (`SRC-ENTRY`) |

`is_finding_aid` and `source_kind` are unchanged. `source_kind` values `dealer` and `auction` (spec 004) are unchanged.

## Dataset and layer, addition

| Field | Rule |
|---|---|
| `bibliography[]` | entry IDs (typed references, family bibliography_entry) |

## Derived values (never stored)

| Value | Derived from |
|---|---|
| Listed citation | a public record's `bibliography[]` (essay, map, cartographer, dataset, layer) |
| Evidence citation | public essay `evidence[]` → Evidence record → Source (not a finding aid) → `entry`, with the Evidence locator and verification state |
| Cited in | the public records of both routes, each labelled |
| Public entry | published, released, and at least one citation from a public record |
| Other editions and translations | public entries linked by `edition_of` and `translation_of`, in either direction |
| Finding-aid badge | any Source pointing at the entry has `is_finding_aid` |
| Stable URL | the canonical address `https://terra-chartarum.org/bibliography/<slug>/` (the `site` origin) |

## Public projection

The allowlist adds, for bibliography entry: `section`, `edition_of`, `translation_of`, `digital_copy`, and the contents of the CSL-JSON file (which is public by construction: it holds only citation facts); for source: `entry`, `is_finding_aid`, `source_kind`. A record that is not published and released is not projected, and an entry that no public record cites is dropped from public output even if projected.

## Citation (derived record, in memory only)

`{ entry, route: 'listed' | 'evidence', citing: { family, slug, title }, locator?: { value, state }, verification?: state }`.
