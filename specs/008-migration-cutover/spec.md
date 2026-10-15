# Feature Specification: Migration & Cutover

**Feature Branch**: `008-migration-cutover`
**Created**: 2026-10-15
**Status**: Draft
**Input**: ADR 0001 — successor build; migrate canonical data with IDs preserved; rebuild essays natively; cut over at v1 with a frozen archive and redirects.

**Historical question served**: How does a scholarly publication change its platform without breaking a single citation that points at it?

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Import canonical data with identities intact (Priority: P1)
**Audience**: editor; researchers who cite records.
As the editor, I import the live site's catalogue, datasets/layers, places, sources and bibliography through adapters; every record keeps its stable ID and passes the integrity gate.

**Independent Test**: run the importer on a snapshot; record counts match the source (e.g. 59 catalogue records); zero IDs changed; integrity report clean or every violation listed for remediation.

**Acceptance Scenarios**:
1. **Given** a live-site record, **When** imported, **Then** its local ID is preserved and qualified at the boundary as `tc:{authority}:{family}:{local-id}`.
2. **Given** a specialist vocabulary stricter than the shared one (Dacia/CND, VMN, HSE), **When** imported, **Then** it is preserved with an explicit mapping to the shared semantic layer.
3. **Given** a field missing in the source, **When** imported, **Then** it is recorded as `not_yet_verified` or `unknown`, never silently blank.
4. **Given** the import is re-run, **When** nothing changed upstream, **Then** output is byte-identical (deterministic).

### User Story 2 — Freeze the old site as an archive (Priority: P1)
**Audience**: all readers; anyone holding an old link.
As a reader with an old essay link, I land on the frozen archive copy of that essay, clearly marked as archived, with a link to the new site.

**Independent Test**: a sample of old essay URLs resolves to the archive with an "archived edition" banner.

### User Story 3 — Redirect map that shrinks as essays are rebuilt (Priority: P1)
**Audience**: editor; readers.
As the editor, every old URL has a redirect rule: rebuilt essays and migrated records go to their new canonical page; unrebuilt essays go to the archive. Publishing a rebuilt essay switches its rule automatically.

**Independent Test**: a link-checker over all old-site URLs reports zero 404s, before and after one essay's rebuild is published.

### User Story 4 — Cutover checklist (Priority: P2)
**Audience**: editor.
As the editor, a cutover checklist (DNS/hosting switch, archive live, redirects verified, integrity gate green, v1 anchor essay published) must pass before the domain moves.

### Edge Cases
- Old URL patterns with query strings (Atlas deep links): mapped to the new view-state contract where possible, otherwise to the Atlas landing with a notice.
- Records referenced only by not-yet-rebuilt essays: migrated anyway; reverse links point to archive URLs until rebuild.
- Private acquisition/price data present in the source: stripped at import.

## Requirements *(mandatory)*
- **FR-001**: Importers MUST preserve every stable ID and never rename.
- **FR-002**: Imports MUST be deterministic and re-runnable.
- **FR-003**: Every old public URL MUST have exactly one redirect rule.
- **FR-004**: The archive MUST be the frozen terra-chartarum.pages.dev site: read-only, with an "archived edition" banner, `noindex`, and a link to terra-chartarum.org. Redirects for rebuilt essays live in the archive project's redirects file (ADR 0005).
- **FR-008**: The successor MUST be served at terra-chartarum.org from its own static hosting project built from vladsimion/terra-chartarum-next; hosting choice recorded in ADR 0005.
- **FR-005**: Publishing a rebuilt essay MUST update its redirect rule in the same build.
- **FR-006**: Imported private fields MUST be dropped before any public build.
- **FR-007**: Before the freeze, the live site's key templates MUST be measured once with the ADR 0004 profile and the results recorded as a baseline.

## Success Criteria *(mandatory)*
- **SC-001**: Zero stable IDs changed by migration (automated diff).
- **SC-002**: Zero 404s across the full old-URL inventory at cutover.
- **SC-003**: 100% of imported publishable records pass the integrity gate or appear on a remediation list.
