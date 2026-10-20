# GLOSSARY — Shared Domain Language

This glossary is maintained by `/grill-with-docs`. Specs, plans, code identifiers and Jira tickets use these terms exactly. If a term is wrong or missing, change it here first (with an ADR when the change is material) and then propagate.

## Publication

| Term | Meaning | Not to be confused with |
|---|---|---|
| **Essay** | A long-form visual argument answering one historical question, composed over shared evidence. Owns its narrative and local bibliography, never private data. | A blog post; a layer description |
| **Trench** | An essay inside a Corpus programme, each a separate "excavation" with its own lens. | A chapter |
| **Pit** | One of the four Sondaje test pits of Trench A, each with its own strata. | A trench |
| **Cell** | One name at one stratum of a pit in Trench A: pit, stratum, name, language, reading, note. It is the essay's own local data (`corpus: none`) until a CND Attestation backs it; adding the Attestation ID is the only retrofit change. | A row, an Attestation |
| **Trench A** | The v1 anchor essay, *Terra Sigillata · Lapidarium Dacicum* (slug `dacia-lapidarium`): the whole essay, its Lapidarium and its trench section together. Its sections keep their own titles. | The section titled "the trench"; the Corpus Chartarum Daciae programme |
| **Lapidarium** | The first part of Trench A: an exhibition of Stones, each shown as a carved plate above the ground line. | The Archive room; the frozen archive |
| **Stone** | One exhibit of the Lapidarium, anchored to one Corpus source (the satellite is anchored to none). | A map; a source; a Pit |
| **Corpus (programme)** | A deep research programme (pattern: Corpus Chartarum) with several essays sharing one evidence corpus, GIS, object records and bibliography. | A collection of layers |
| **Room** | One of seven reader-facing conceptual paths: Earth, Map, City, Border, Road, Archive, Theatre. Membership is metadata, never a folder or a data taxonomy: an essay declares its rooms, and a map or layer is in a room only through the public essays that use it. All seven rooms are always public; each has its own page. | Theme, Collection |
| **Portal dimension** | Optional additive essay tag: Measure, Witness, Use, Cosmos, Power, Silence. Never replaces an essay's native lenses. | Theme |
| **Editorial stage** | One of: Concept, Corpus, Research, Outline, Draft, Build, Design QA, Publish, Cross-link. | Lifecycle state |
| **Stage history** | The recorded sequence of an essay's editorial stages, each with a date and the person who promoted it. It must be contiguous. | The version-control log; Lifecycle |
| **Sign-off** | A named person's confirmation, with a date, that a quality check (historical, cartographic or data QA, or a switched redirect) is done. A tool cannot sign. | A passing automated check |
| **Interaction declaration** | An essay's statement, before Build, of what a bespoke interaction asks, which evidence it rests on, and the interpretation it expects. | The interaction's code |
| **Claim citation** | A citation in an essay that points at an Evidence record, so the reader sees source, locator and verification state. | A bibliography entry (general reading) |
| **Held / released** | Release state of any entity, separate from lifecycle. Everything starts held; only a released entity at lifecycle `published` is public. Held metadata must never leak into public pages, payloads or URLs. | Draft; lifecycle `published` |

## Scholarly entities

| Term | Meaning |
|---|---|
| **Stable ID** | Immutable scholarly identifier, qualified at boundaries as `tc:{authority}:{family}:{local-id}`. Never a title or slug. |
| **Authority** | The namespace that issued an ID: `tc` for records this project mints (and for legacy IDs, kept verbatim), or a registered external code such as `pleiades`. |
| **Slug history** | The list of former public slugs of an entity; each keeps resolving to the entity's current page. |
| **Evidence record** | A first-class entity, with its own stable ID, stating that a source supports a claim about a target (an entity, or a feature of a layer). Essays and layers cite evidence records and never embed provenance. |
| **Tombstone** | The page a superseded entity keeps at its own address, linking to its live successor when there is one. A tombstone with no successor is a withdrawal: the old address shows a notice, never an error. |
| **Map object** | One witness of a map (edition/state-specific), held, institutional or unlocated, when its record scope is `object`; one canonical record per witness. A `work` or `concept` record is not a witness. |
| **Witness** | One concrete copy of a map that a record describes: **held** (an object this project owns) or **institutional** (an institution's copy, known through its scan). Each witness is its own Map object record. Not the edition, and not the abstract map. A record is a witness only when its scope is `object`; an **unlocated** witness is an object whose location is not known. |
| **Workshop** | A Cartographer record for a family or firm (for example "Visscher") whose individual maker is not established. A map attributed to one is marked unresolved. Not an individual Cartographer. |
| **Field status** | The explicit state of one displayed field of a record: recorded, not applicable, not yet verified or unknown. A blank is never presented as complete. Not Lifecycle, not Confidence. |
| **Verification** | How far a map record has been checked: unverified, checked online or inspected (held witnesses only), with the date last checked. Not Field status, not Confidence. |
| **Enrichment queue** | The editor-only ranked list of records that most need work (publication impact × scholarly risk × reuse value). Never published. Not a to-do list on the site. |
| **Record scope** | What a Map object record stands for: an `object` (a concrete witness), a `work` (an edition known from the literature) or a `concept` (an idea with no artefact). Not a lifecycle state. |
| **Cartographer** | A maker (cartographer, engraver, publisher) with a profile record. |
| **Place** | A historical place authority with alternate names and temporal validity. |
| **Source** | A primary or secondary work cited as evidence, pointing at one Bibliography entry. A finding aid (a work used only to find sources) is recorded as a Source flagged as a finding aid and is never cited as evidence. |
| **Attestation** | place × source × form: evidence that a source names or depicts a place. A source's silence about a place is also an Attestation (form `silence`) carrying one silence state. |
| **Locator** | Page / folio / plate / record reference inside a source. `verified` only if read by this project; otherwise `pending`. |
| **Bibliography entry** | The canonical citation record, whose CSL-JSON holds the citation fields. Essays, maps, cartographers, datasets and layers list entries by ID. |
| **Cited as evidence** | The route by which an entry is cited through a claim citation: essay → Evidence record → Source → entry, with the locator and its verification state. Not merely listed. |
| **Listed in bibliography** | The route by which a record names an entry in its `bibliography[]`, without a locator. Not a claim citation. |
| **Edition relation** | A link from one Bibliography entry to another that it is an edition of (`edition_of`) or a translation of (`translation_of`). Not a version of a record. |

## Evidence and uncertainty

| Term | Meaning |
|---|---|
| **Evidence type** | What kind of witness supports a claim (textual, cartographic, archaeological, archival, …). |
| **Geometry provenance** | `source_geometry`, `georeferenced_trace`, `scholarly_reconstruction`, `generalized_editorial`, `modern_reference`. |
| **Historical date** | A date written in EDTF levels 0-1 with four-digit signed years (`0106`, `-0106`, `159X`, `1595?`, `1595/1602`); uncertainty and approximation are part of the value (ADR 0007). |
| **Date precision** | Precision of a temporal claim (day, month, year, decade, century, range), derived from the date and never authored; independent of geometry precision. |
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
| **Atlas view** | The complete state a reader can share: year, active layers, focused layer, lens, collection context and per-layer facets. It lives in the address and nowhere else. Not a saved map; not Active Layers (one part of it). |
| **Temporal envelope** | The span of years a layer as a whole covers. A layer with no per-feature dates shows while the year is inside it. Not a feature's own dates. |
| **Time mode** | Whether a layer's features carry their own dates (`per_feature`) or only the envelope applies (`envelope_only`). Not date precision. |
| **Facet** | A feature property a layer declares as filterable (a category or a range), applied and reset per layer. Not Theme; not lens. |
| **Out of range** | An active layer whose envelope does not include the chosen year. It stays active and is marked, never removed. Not inactive; not hidden. |
| **Present-day reference** | Modern geography shown as context, labelled as such and never styled as historical evidence. Not a historical layer. |

## Shell and design system

| Term | Meaning | Not to be confused with |
|---|---|---|
| **Shell** | The shared frame every page sits in: header, footer, breadcrumbs, skip link and the visual language. It owns no scholarly content. | A page template for one essay; the Atlas interface |
| **Lens** | One of the seven header destinations (Essays, Rooms, Atlas, Collection, Cartographers, Bibliography, About), each a way of entering the material. | Room (a curatorial path), Theme (a layer family) |
| **Design token** | A named visual value (colour, type, spacing, motion, radius) defined once, with a value for each colour scheme. Components use tokens and never raw values. | A theme; a CSS class |
| **Colour scheme** | The dark or light set of token values. Dark is the identity and the default; light is derived and served when the reader's system asks for it. | Theme (a family of layers, above); the spec's earlier "light and dark themes" |
| **Accent slot** | A named accent colour in the token set, with a passing contrast pair in each colour scheme. An essay picks one by name. | A free colour value |
| **Stub page** | A placeholder at a Lens or footer destination that a later spec owns, marked "in preparation" and replaced by its owner. None may remain at cutover. | A 404; a draft essay |
| **Draft copy** | Placeholder prose for the home, About or Colophon pages, the Handbook topics and the seven room introductions, marked `draft: true` (or `copy_status: draft` on a room) until the author writes the final text. None may remain at cutover. | A held record |

## Migration

| Term | Meaning | Not to be confused with |
|---|---|---|
| **Legacy site** | The live terra-chartarum.pages.dev site before cutover, whose repository is the source of the import. | The successor |
| **Frozen archive** | The legacy site after cutover: read-only, with an "archived edition" banner and `noindex`. Called the frozen archive to keep it apart from the Archive room. | The Archive room (one of the seven rooms) |
| **Import profile** | A named set of legacy registries the importer reads in one run (v1: the `atlas` authority and the Dacia anchor records); each profile arrives with the essays it serves, and everything it imports is held. | A migration of the whole legacy site |
| **Import snapshot** | The pinned checkout of the legacy repository, at a recorded commit, that the importer reads. | A backup |
| **Redirect inventory** | Every old URL with its one outcome: served in place by the frozen archive, or one redirect rule. | The redirect file (which is generated from it) |

## Rule of thumb
*The essay interprets; the Atlas spatialises; the Handbook documents; the dataset substantiates.*
