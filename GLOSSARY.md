# GLOSSARY — Shared Domain Language

This glossary is maintained by `/grill-with-docs`. Specs, plans, code identifiers and Jira tickets use these terms exactly. If a term is wrong or missing, change it here first (with an ADR when the change is material) and then propagate.

## Publication

| Term | Meaning | Not to be confused with |
|---|---|---|
| **Essay** | A long-form visual argument answering one historical question, composed over shared evidence. Owns its narrative and local bibliography, never private data. | A blog post; a layer description |
| **Trench** | An essay inside a Corpus programme, each a separate "excavation" with its own lens. | A chapter |
| **Corpus (programme)** | A deep research programme (pattern: Corpus Chartarum) with several essays sharing one evidence corpus, GIS, object records and bibliography. | A collection of layers |
| **Room** | One of seven reader-facing conceptual paths: Earth, Map, City, Border, Road, Archive, Theatre. Membership is metadata, never a folder or a data taxonomy. | Theme, Collection |
| **Portal dimension** | Optional additive essay tag: Measure, Witness, Use, Cosmos, Power, Silence. Never replaces an essay's native lenses. | Theme |
| **Editorial stage** | One of: Concept, Corpus, Research, Outline, Draft, Build, Design QA, Publish, Cross-link. | Lifecycle state |
| **Held / released** | Whether an essay is public. Held metadata must never leak into public pages, payloads or URLs. | Draft |

## Scholarly entities

| Term | Meaning |
|---|---|
| **Stable ID** | Immutable scholarly identifier, qualified at boundaries as `tc:{authority}:{family}:{local-id}`. Never a title or slug. |
| **Map object** | One physical or digital map witness (edition/state-specific). One canonical record. |
| **Cartographer** | A maker (cartographer, engraver, publisher) with a profile record. |
| **Place** | A historical place authority with alternate names and temporal validity. |
| **Source** | A primary or secondary work cited as evidence. A finding aid (a work used only to find sources) is not a source. |
| **Attestation** | place × source × form: evidence that a source names or depicts a place. |
| **Locator** | Page / folio / plate / record reference inside a source. `verified` only if read by this project; otherwise `pending`. |
| **Bibliography entry** | Canonical citation record; essay bibliographies reference entries by ID. |

## Evidence and uncertainty

| Term | Meaning |
|---|---|
| **Evidence type** | What kind of witness supports a claim (textual, cartographic, archaeological, archival, …). |
| **Geometry provenance** | `source_geometry`, `georeferenced_trace`, `scholarly_reconstruction`, `generalized_editorial`, `modern_reference`. |
| **Date precision** | Precision of a temporal claim, independent of geometry precision. |
| **Reconstruction** | An editorial inference, always flagged as such and distinguished from documentary evidence. |
| **Silence state** | Typed historical absence: non-survival, non-survey, non-request, alternative naming, outside frame, source-not-applicable, meaningful silence. |
| **Confidence** | Ordinal: `secure` (direct, verified) · `probable` (strong indirect) · `possible` (thin or contested) · `conjectural` (editorial inference) · plus `unknown`, which is not a level. |
| **Lifecycle** | Shared state of any entity: proposed → researching → verified → ready_for_build → in_build → qa → publishable → published; superseded / blocked. For essays it is derived from the editorial stage. |
| **Availability** | Derived build-time fact that a layer's runnable asset exists. Never stored; never a lifecycle value. |
| **Pending locator** | A locator not yet read against `consulted_copy` by a person. Publishable, shown as pending; cannot support a `secure` claim. |

## Atlas

| Term | Meaning |
|---|---|
| **Atlas** | The interactive historical-GIS workspace: a historical argument-building instrument, not a file manager. |
| **Layer (GeoLayer)** | One canonical registered dataset rendering; role is `context`, `historical`, `evidence` or `map-overlay`. |
| **Map Context** | Physical geography and modern reference layers. Never historical evidence. |
| **Theme** | One of seven canonical meaning-based families (Territories & Boundaries, Networks & Circulation, Places & Settlements, Names/Peoples/Attestations, Conflict/Campaigns/Frontiers, Cartographic Evidence, Historical Map Overlays). |
| **Collection** | A curated bundle of canonical layers that together answer a historical question. Owns defaults; never owns geometry. |
| **Active Layers** | The reader's current map composition, distinct from any discovery lens. |
| **Inspector** | The single panel exposing a layer's provenance, licence, documentation, essays and facets. |
| **Atlas Handbook** | The interpretive companion teaching readers how to *read* the Atlas. "Handbook", never "Help". |

## Rule of thumb
*The essay interprets; the Atlas spatialises; the Handbook documents; the dataset substantiates.*
