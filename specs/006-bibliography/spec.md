# Feature Specification: Bibliography & Citation

**Feature Branch**: `006-bibliography`
**Created**: 2026-10-15
**Status**: Draft
**Input**: "Bibliography is a primary scholarly navigation surface. Local bibliographies are authoritative; the site-wide bibliography is an aggregate index." (Constitution VI; TC-D003)

**Historical question served**: What does this publication rest on, and where is each work used?

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Browse the bibliography as evidence (Priority: P1)
**Audience**: students; researchers; historians.
As a reader, I open Bibliography from the header and browse canonical entries by the seven sections, by essay, and by search; each entry lists where it is cited.

**Independent Test**: three fixture entries cited by two essays and one map record show correct "Cited in" lists; a held essay's citations are excluded.

**Acceptance Scenarios**:
1. **Given** an entry cited in an essay and a map record, **When** viewed, **Then** both appear under "Cited in" with deep links.
2. **Given** an entry cited only by held content, **When** viewed publicly, **Then** it is hidden from the public bibliography until released content cites it.
3. **Given** a search term, **When** entered, **Then** matches on author, title, year and keywords return.

### User Story 2 — Cite the site and its parts (Priority: P1)
**Audience**: students; researchers; developers.
As a reader, I see citations in Chicago notes-bibliography and export any essay, map record, dataset or layer as BibTeX, RIS or CSL-JSON, each with stable URL and access date (ADR 0004).

### User Story 3 — Distinguish sources from finding aids (Priority: P2)
**Audience**: researchers.
As a reader, I can see which entries are primary sources, cartographic witnesses, reference works, studies, digital resources, datasets or further reading.

### Edge Cases
- The same work cited in multiple essays: one canonical entry, many citations.
- Different editions/translations: separate entries linked by a "translation of / edition of" relation.
- Out-of-copyright text vs cleared reproduction: separate fields.

## Requirements *(mandatory)*
- **FR-001**: Each entry MUST have an ID, a section type (one of seven), structured citation fields and optional identifiers (DOI, ISBN, URL, institutional catalogue ref).
- **FR-002**: Reverse "Cited in" relationships MUST be derived and release-filtered.
- **FR-003**: Essay, map and dataset bibliographies MUST reference entries by ID.
- **FR-004**: Citation export MUST derive from canonical metadata only.
- **FR-005**: Canonical entries MUST be stored in the repository as CSL-JSON. New entries MAY be imported one-way from BibTeX/RIS exports (Zotero, Mendeley); the repository remains the source of truth (ADR 0004).

### Key Entities
- **Bibliography entry**, **Citation** (citing entity, entry, locator, verification state), **Edition relation**.

## Success Criteria *(mandatory)*
- **SC-001**: 100% of essay citations resolve to canonical entries.
- **SC-002**: Exported citations validate against the chosen format's parser in 100% of fixture tests.
- **SC-003**: Zero held references visible in public bibliography output.
