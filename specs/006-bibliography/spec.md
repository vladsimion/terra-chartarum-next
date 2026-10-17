# Feature Specification: Bibliography & Citation

**Feature Branch**: `006-bibliography`
**Created**: 2026-10-15
**Status**: Clarified (2026-10-17)
**Input**: "Bibliography is a primary scholarly navigation surface. Local bibliographies are authoritative; the site-wide bibliography is an aggregate index." (Constitution VI; TC-D003)

**Historical question served**: What does this publication rest on, and where is each work used?

## Clarifications

### Session 2026-10-17 (grill, ADR 0014)
- Q: How does a Source relate to a bibliography entry? → A: A Source points at exactly one entry (`entry`, required from `ready_for_build`, rule `SRC-ENTRY`). Several Sources may share an entry; an entry no Source points at is further reading. A finding aid stays a Source flagged `is_finding_aid`, is never cited as evidence, and has an entry.
- Q: What is a "citation"? → A: Nothing stored. It is derived at build time by two routes: **listed** (a record's `bibliography[]`: essays, maps, cartographers and, added here, datasets and layers) and **cited as evidence** (essay → Evidence → Source → entry, with locator and verification state). "Cited in" labels the two routes differently.
- Q: When is an entry public? → A: When it is published and released and at least one public record cites it by either route. Held-only and uncited entries are not listed; "Cited in" lists public records only.
- Q: What pages exist? → A: `/bibliography/` grouped by the seven sections (spec 003's keys; the draft's "cartographic witnesses" is the label "Historical maps"), and `/bibliography/<slug>/` per entry with the Chicago form, identifiers, other editions, "Cited in" and exports. Filters by section and essay; search over author, title, year and keywords from a build-time index; query-string state; complete without JavaScript.
- Q: How do entries arrive? → A: `registry import-bib <file>` reads BibTeX, RIS or CSL-JSON and writes held entries and CSL files with minted IDs and no `section`. Duplicates match on DOI, then ISBN, then normalised first author + year + title; matches are reported and never overwritten. Site-specific fields stay in the YAML, never in the CSL file.
- Q: Exports, stable URL, access date? → A: Spec 003's shared generator, with inputs added for an entry, a dataset and a layer (CSL type `dataset`), and a "Cite this site" statement. The stable URL is the canonical page address (slug history keeps old citations resolving); the access date is the build date from `BUILD_DATE` (default today, UTC) so tests are deterministic.
- Q: Editions and translations? → A: `edition_of` and `translation_of` between entries (acyclic, `BIB-EDITION`); the page shows public editions and translations only. Translator and editor names stay in the CSL-JSON.
- Q: Rights? → A: Entries and Sources carry no `rights` field in v1 (the site cites, it does not reproduce). Rights live where something is reproduced (maps, datasets, layers), whose Rights shape already keeps out-of-copyright text and cleared reproduction apart. An entry may link an external `digital_copy` URL with no claim about it.
- Q: Where do identifiers and keywords live? → A: Only in the entry's CSL-JSON, using CSL's own fields (`DOI`, `ISBN`, `URL`, `call-number` or `archive_location`, `keyword`). The registry reads them for duplicate matching and the search index.
- Q: What is spec 006 accepted on? → A: Fixtures: a seeded generator plus a small hand-authored set (an entry cited by two essays and a map, one cited only by a held essay, an uncited entry, two editions and a translation, a finding aid, entries with and without a DOI, and import samples in BibTeX, RIS and CSL-JSON). Spec 008 imports the live bibliography, mapping its section types to the seven, held.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Browse the bibliography as evidence (Priority: P1)
**Audience**: students; researchers; historians.
As a reader, I open Bibliography from the header and browse canonical entries by the seven sections, by essay, and by search; each entry lists where it is cited.

**Independent Test**: three fixture entries cited by two essays and one map record show correct "Cited in" lists; a held essay's citations are excluded.

**Acceptance Scenarios**:
1. **Given** an entry cited in an essay and a map record, **When** viewed, **Then** both appear under "Cited in" with deep links, and each says whether it lists the entry or cites it as evidence.
2. **Given** an entry cited only by held content, **When** viewed publicly, **Then** it is hidden from the public bibliography until released content cites it.
3. **Given** a search term, **When** entered, **Then** matches on author, title, year and keywords return.
4. **Given** an entry cited as evidence, **When** viewed, **Then** the citing essay is shown with the locator and its verification state, and a pending locator is visibly marked.
5. **Given** an entry with other editions or a translation, **When** viewed, **Then** the public ones are listed with their relation.

### User Story 2 — Cite the site and its parts (Priority: P1)
**Audience**: students; researchers; developers.
As a reader, I see citations in Chicago notes-bibliography and export any essay, map record, bibliography entry, dataset or layer as BibTeX, RIS or CSL-JSON, each with stable URL and access date (ADR 0004).

**Independent Test**: each fixture export parses with the format's parser and carries the canonical URL and the injected access date.

### User Story 3 — Distinguish sections and finding aids (Priority: P2)
**Audience**: researchers.
As a reader, I can see which entries are primary sources, historical maps, reference works, specialised studies, digital resources, datasets and licences, or further reading, and which entries are finding aids.

**Independent Test**: a fixture finding aid is badged on its entry page and never appears as evidence in any "Cited in" list.

### User Story 4 — Import entries from a reference manager (Priority: P2)
**Audience**: editor.
As the editor, I import a BibTeX, RIS or CSL-JSON export; new works become held entries, duplicates are reported and never overwritten, and the repository remains the source of truth.

**Independent Test**: importing one sample per format creates entries with minted IDs and valid CSL files; importing the same file again creates nothing and reports every match.

### Edge Cases
- The same work cited in multiple essays: one canonical entry, many citations.
- Different editions/translations: separate entries linked by an edition relation.
- Out-of-copyright text vs cleared reproduction: separate facts, kept where something is reproduced, not on entries.
- An entry with no `section`: not public; a warning from `ready_for_build`.
- An imported record whose DOI matches an existing entry: reported as a match, nothing written.
- A Source whose entry is held: the Source's evidence is not public.

## Requirements *(mandatory)*
- **FR-001**: Each entry MUST have an ID, a section (one of seven), and a CSL-JSON file holding its structured citation fields and identifiers (DOI, ISBN, URL, institutional catalogue reference, keywords); the YAML adds only `section`, `edition_of`, `translation_of`, `digital_copy` and the common record fields.
- **FR-002**: Reverse "Cited in" relationships MUST be derived and release-filtered, by both routes (listed, cited as evidence), and MUST label the route.
- **FR-003**: Essay, map, cartographer, dataset and layer records MUST reference entries by ID in `bibliography[]`.
- **FR-004**: Citation export MUST derive from canonical metadata only.
- **FR-005**: Canonical entries MUST be stored in the repository as CSL-JSON. New entries MAY be imported one-way from BibTeX/RIS exports (Zotero, Mendeley); the repository remains the source of truth (ADR 0004).
- **FR-006**: Every Source MUST point at exactly one entry, and a public Source's entry MUST be published and released (`SRC-ENTRY`).
- **FR-007**: An entry MUST be public only when published, released and cited by at least one public record; held-only and uncited entries MUST NOT appear in any public page, index, export or URL.
- **FR-008**: The Bibliography MUST have an index grouped by the seven sections and a page per entry, complete without JavaScript, with filters by section and essay and a search over author, title, year and keywords from a build-time index, state in the query string.
- **FR-009**: Exports MUST use spec 003's shared generator with inputs for an entry, a dataset and a layer, and a "Cite this site" statement; the stable URL MUST be the canonical page address and the access date MUST be the build date from `BUILD_DATE` (default today, UTC).
- **FR-010**: `edition_of` and `translation_of` MUST resolve to entries, never to the entry itself, and MUST NOT form a cycle (`BIB-EDITION`); the page MUST list public editions and translations only.
- **FR-011**: Entries and Sources MUST NOT carry `rights` in v1; an entry MAY carry an external `digital_copy` URL.
- **FR-012**: `registry import-bib` MUST read BibTeX, RIS and CSL-JSON, write held entries and CSL files with minted IDs and no `section`, match duplicates (DOI, ISBN, then normalised first author + year + title), report matches, and never overwrite.
- **FR-013**: A public record's `bibliography[]` MUST NOT name an entry that is not published and released (`BIB-LISTED-HELD`, warning from `ready_for_build`, error at `publishable`).
- **FR-014**: Each entry's CSL-JSON MUST parse as one item with a `type` and a `title` and an `id` equal to the entry's stable ID (`BIB-CSL`).
- **FR-015**: The entry page MUST badge an entry as a finding aid when any Source pointing at it is flagged `is_finding_aid`; a finding aid MUST NOT appear under "Cited as evidence".
- **FR-016**: Spec 006 MUST amend the spec 001 data model (Source `entry`; `bibliography[]` on dataset and layer; entry fields) in its Foundation phase; `FAM-UNKNOWN` stays strict.

### Key Entities
- **Bibliography entry** (record plus CSL-JSON), **Source** (points at an entry), **Citation** (derived: citing record, entry, route, and for evidence the locator and verification state), **Edition relation**.

## Success Criteria *(mandatory)*
- **SC-001**: 100% of essay citations (listed or as evidence) resolve to canonical entries.
- **SC-002**: Exported citations validate against the chosen format's parser in 100% of fixture tests.
- **SC-003**: Zero held references visible in public bibliography output (named-mutation test over the built output).
- **SC-004**: Importing the same file twice creates no second entry in 100% of fixture tests, across the three formats.
- **SC-005**: Filters and search respond in under 200 ms on a 1,000-entry generated fixture.
