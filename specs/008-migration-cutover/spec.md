# Feature Specification: Migration & Cutover

**Feature Branch**: `008-migration-cutover`
**Created**: 2026-10-15
**Status**: Clarified (2026-10-17)
**Input**: ADR 0001 — successor build; migrate canonical data with IDs preserved; rebuild essays natively; cut over at v1 with a frozen archive and redirects.

**Historical question served**: How does a scholarly publication change its platform without breaking a single citation that points at it?

## Clarifications

### Session 2026-10-17 (grill, ADR 0016)
- Q: What does v1 import? (layer count corrected below) → A: One adapter per legacy registry, run as a named profile. The v1 profile covers the `atlas` authority (maps, cartographers, bibliography, toponyms, layers, collections, geo release assets) and the Dacia records the anchor needs (the Roman Dacia layers and the CND places and sources Trench A uses). Other programmes (VMN, HSE, Antarctica, Crusades, the rest of CND) stay in the frozen archive and arrive as their own profile when their essays are rebuilt. Everything imported is `held` (TC-D024).
- Q: What does the importer read? → A: A pinned snapshot of the legacy repository (github.com/vladsimion/terra-chartarum) at a recorded commit; the SHA is written to a committed import manifest. Legacy TypeScript registries (which import Astro modules) are read by static extraction from the syntax tree and never executed; a non-literal value fails the import and names the file. CSV and JSON are read directly. Nothing is fetched from the live site.
- Q: What if the import is run again? → A: It writes to a staging directory; `--apply` copies into `content/` only records that do not already exist and never overwrites a file. A re-run with no upstream change is byte-identical and applies nothing; records whose upstream changed are listed in the report for a manual merge.
- Q: What are imported slugs? → A: The legacy local-id, so an old path maps predictably and slug history starts empty. A rebuilt essay keeps its old slug unless the editor changes it (the old one then goes into slug history).
- Q: How does the legacy bibliography map? → A: Each legacy item is a Source that keeps its legacy ID verbatim and points at a minted bibliography entry (ADR 0014); inline citations on maps become entries through the `import-bib` duplicate matcher; the `section` comes from a mapping table, and an unmapped entry is not public until the editor sets one.
- Q: What about records that are not a single object? → A: The legacy `recordScope` (`object`, `work`, `concept`) and `custody` (`held`, `institutional`, `unlocated`) become `record_scope` and `witness_kind`; `witness_kind` is required only for objects. ADR 0011 and spec 004 are amended. The legacy values are kept as `legacy_record_scope` and `legacy_custody`.
- Q: How do the other legacy catalogue fields map? → A: `year` (signed integer) becomes a four-digit signed EDTF year with lossy conversions logged; `blurb` becomes `significance`; `cartographerId` becomes `makers[]`; free-text `engraver` and `publisher` matching no cartographer stay as text in `edition_state` with the makers field `not_yet_verified`; `relatedMapIds` become `relations[]`; `uncertainties[]` become `open_questions[]`; `publicationStatus` becomes `legacy_publication_status`; `essaySlug`, `relatedEssaySlugs`, `room`, `secondaryRooms` and `roomAnchor` go to `migration/essay-links.json` to seed the rebuild of each essay.
- Q: What is dropped? → A: Private acquisition and price fields (FR-006, ADR 0011) and the legacy room fields on maps (rooms are derived), reported by field name and count. The current catalogue corpus contains no private values.
- Q: Images and rights? → A: Images are not copied into this public repository. Each becomes an `images[]` entry at its address on the frozen archive, with `credit` as attribution, `license` as the licence text, `alt` kept and `reproduction_cleared` false, so the viewer withholds it until the editor clears it. IIIF sources keep their institutional address. There are no DeepZoom tiles to migrate.
- Q: Specialist vocabularies? → A: Mapping files ship for the Dacia profile (`vocab-mappings/cnd.yaml`, spec 001's mechanism); the original term is kept on the record and an unmapped term fails the import.
- Q: How do redirects work? → A: The archive is the old site itself (ADR 0005 §4), so an old URL whose content has not moved keeps working in place and needs no rule. A **redirect inventory** built from the snapshot's routes lists every old URL with exactly one outcome: served in place, or one rule (a migrated record page or a rebuilt essay). The successor generates the rule file; the editor applies it to the archive project by pull request with a named `redirect_switched` sign-off. This replaces the draft's "unrebuilt essays go to the archive".
- Q: Old Atlas deep links? → A: Every old Atlas URL, with any query, redirects to `/atlas/?from=legacy`, and the Atlas shows a notice that the old view could not be restored. Parameters are not translated in v1.
- Q: How is the archive labelled? → A: The banner, the `noindex` header and the link to terra-chartarum.org are held here as a patch for the archive project, with `npm run archive:check -- <url>` run by hand at cutover.
- Q: What is the cutover check? → A: `npm run cutover:check` runs the integrity gate, `shell:check --cutover`, the site-wide link check, the inventory-against-redirect-file zero-404 check and the Lighthouse budgets; the manual steps (redirect file applied, archive check, DNS and custom domain) are a numbered list in `docs/cutover.md` with a named sign-off each. A one-off `npm run baseline` records the live site's key templates before the freeze.
- Q: Accepted on what? → A: Fixtures: a trimmed snapshot fixture shaped like the legacy repository (including a TypeScript registry that imports Astro modules), plus the real snapshot run as a manual acceptance step by the editor.

### Session 2026-10-19 (grill refresh, after specs 004 to 007)
- Q: What changed in the legacy snapshot? → A: Checked against `e82afd9`: maps (59), cartographers (19), bibliography (34), toponyms (12), collections (6), release assets (27), routes (31) and essays (22) match; the v1 profile imports **27 layers**, not 16; the toponym mapping is rewritten from the real keys (title from `modern`, `ancient` as a name, `cndPlaceId` as a relation to a separate held CND place, never a merge); no registry holds a value the static extraction cannot read (the non-literal code sits outside the `RAW` arrays).
- Q: Which Dacia records? → A: The 40 pilot places and the 12 Trench A sources, with the two Roman Dacia layers; no CND attestations, and the other places and sources stay in the archive. All 27 atlas layers, the `dacia-*` ones included, are imported with the `atlas` registry.
- Q: What do the legacy Atlas layer pages become? → A: The 27 `/atlas/layers/<layer>/` pages are Handbook documents, so they are served in place by the archive; only `/atlas/` with any query redirects to `/atlas/?from=legacy`.
- Q: Order and tooling? → A: Foundation, US1 (two pull requests: extraction and mapping, then adapters with stage and apply), US3, US2, US4, Polish. The real snapshot is a fresh pinned clone, never the editor's working copy. `csv-parse` is added exact-pinned. The link check moves to `src/shell/links.ts` for `cutover:check`. The Lighthouse step of `cutover:check` reads the `registry` CI run for the commit with `gh`. `cutover:check` is expected to fail on the real registry until the author finalises the room introductions and publishes the anchor essay.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Import canonical data with identities intact (Priority: P1)
**Audience**: editor; researchers who cite records.
As the editor, I import the live site's catalogue, datasets/layers, places, sources and bibliography through adapters; every record keeps its stable ID and passes the integrity gate.

**Independent Test**: run the importer on a snapshot; record counts match the source (e.g. 59 catalogue records); zero IDs changed; integrity report clean or every violation listed for remediation.

**Acceptance Scenarios**:
1. **Given** a live-site record, **When** imported, **Then** its local ID is preserved, its slug equals it, and it is qualified at the boundary as `tc:{authority}:{family}:{local-id}`.
2. **Given** a specialist vocabulary stricter than the shared one (Dacia/CND, VMN, HSE), **When** imported, **Then** it is preserved with an explicit mapping to the shared semantic layer, and an unmapped term fails the import.
3. **Given** a field missing in the source, **When** imported, **Then** it is recorded as `not_yet_verified` or `unknown`, never silently blank.
4. **Given** the import is re-run, **When** nothing changed upstream, **Then** staging output is byte-identical and `--apply` writes nothing.
5. **Given** a record already in `content/` that was edited by hand, **When** `--apply` runs, **Then** it is not touched, and a changed upstream version is listed in the report.
6. **Given** a legacy `work`, `concept` or `unlocated` record, **When** imported, **Then** it keeps its ID with the right `record_scope` and `witness_kind`.
7. **Given** a legacy image, **When** imported, **Then** it points at the archive address with `reproduction_cleared` false and nothing is copied into the repository.
8. **Given** a private field in the source, **When** imported, **Then** it is dropped, reported by name and count, and written nowhere.

### User Story 2 — Freeze the old site as an archive (Priority: P1)
**Audience**: all readers; anyone holding an old link.
As a reader with an old essay link, I land on the frozen archive copy of that essay, clearly marked as archived, with a link to the new site.

**Independent Test**: a sample of old essay URLs resolves to the archive with an "archived edition" banner.

**Acceptance Scenarios**:
1. **Given** the archive patch applied, **When** `archive:check` runs against a sample, **Then** each page has the banner, the `X-Robots-Tag: noindex` header and the link to terra-chartarum.org.
2. **Given** an unrebuilt essay's old URL, **When** opened after cutover, **Then** it is served by the archive in place, with no redirect.

### User Story 3 — Redirect map that shrinks as essays are rebuilt (Priority: P1)
**Audience**: editor; readers.
As the editor, every old URL has exactly one outcome: served in place by the archive, or one redirect rule for content that moved (a migrated record page or a rebuilt essay). Publishing a rebuilt essay switches its outcome in the same pull request.

**Independent Test**: a link-checker over all old-site URLs reports zero 404s, before and after one essay's rebuild is published.

**Acceptance Scenarios**:
1. **Given** the snapshot, **When** the inventory is built, **Then** every old route has one outcome and none has two.
2. **Given** a migrated record page, **When** the rule file is generated, **Then** its old path maps to its new canonical page (slug equals the legacy id).
3. **Given** a rebuilt essay with `legacy_url`, **When** its pull request publishes it, **Then** the generated rule file gains its rule in that same change.
4. **Given** an old Atlas URL with a query string, **When** the rule file is generated, **Then** it maps to `/atlas/?from=legacy` and the Atlas shows the notice.

### User Story 4 — Cutover checklist (Priority: P2)
**Audience**: editor.
As the editor, a cutover checklist (DNS/hosting switch, archive live, redirects verified, integrity gate green, v1 anchor essay published, no stub page or draft copy left) must pass before the domain moves.

**Acceptance Scenarios**:
1. **Given** a production build in which any destination is still a stub page or any page still carries draft copy, **When** the cutover checklist runs `npm run shell:check -- --cutover`, **Then** it exits 1 and names each remaining page, and the domain does not move (spec 002 FR-015 and FR-016).
2. **Given** a redirect file that leaves an inventory URL with no outcome, **When** `cutover:check` runs, **Then** it exits 1 and names the URL.
3. **Given** the live site before the freeze, **When** `npm run baseline` runs with the ADR 0004 profile, **Then** the key templates' results are recorded as a comparison.

### Edge Cases
- Old URL patterns with query strings (Atlas deep links): redirected to the Atlas landing with a notice; parameters are not translated in v1.
- Records referenced only by not-yet-rebuilt essays: migrated anyway; reverse links point to archive URLs until rebuild.
- Private acquisition/price data present in the source: stripped at import.
- A non-literal value in a legacy TypeScript registry: the import fails, naming the file and the key.
- A legacy item with no mappable bibliography section: imported held with no `section`; not public.
- Two legacy items that cite the same work: one entry, two Sources.
- A legacy local-id that collides with another record's slug: the import fails, naming both.

## Requirements *(mandatory)*
- **FR-001**: Importers MUST preserve every stable ID and never rename; an imported record's slug MUST equal its legacy local-id.
- **FR-002**: Imports MUST be deterministic and re-runnable; they MUST write to a staging directory, and `--apply` MUST add only records that do not exist and never overwrite a file.
- **FR-003**: Every old public URL MUST have exactly one outcome in the redirect inventory: served in place by the archive, or one redirect rule.
- **FR-004**: The archive MUST be the frozen terra-chartarum.pages.dev site: read-only, with an "archived edition" banner, `noindex`, and a link to terra-chartarum.org. Redirects for rebuilt essays live in the archive project's redirects file (ADR 0005).
- **FR-005**: Publishing a rebuilt essay MUST update its redirect rule in the same pull request. The rule comes from the essay's `legacy_url` (spec 003 FR-013), and `redirect_switched` (`{by, on}`) is a required Cross-link confirmation that the editor made the switch (ADR 0010).
- **FR-006**: Imported private fields MUST be dropped before any public build and written nowhere; the report names them.
- **FR-007**: Before the freeze, the live site's key templates MUST be measured once with the ADR 0004 profile and the results recorded as a baseline.
- **FR-008**: The successor MUST be served at terra-chartarum.org from its own static hosting project built from vladsimion/terra-chartarum-next; hosting is a Cloudflare Worker serving static assets (ADR 0012).
- **FR-009**: The cutover checklist MUST include `npm run shell:check -- --cutover` over the production build, so no stub page or draft copy ships.
- **FR-010**: The importer MUST be one adapter per legacy registry run as a named profile; the v1 profile MUST cover the `atlas` authority and the Dacia anchor records, and every imported record MUST be `held`.
- **FR-011**: The importer MUST read a pinned snapshot, record its commit SHA in a committed manifest, read legacy TypeScript by static extraction without executing it, and fetch nothing from the live site.
- **FR-012**: Each legacy bibliography item MUST become a Source keeping its legacy ID and pointing at a minted entry; inline map citations MUST become entries through the `import-bib` matcher.
- **FR-013**: The legacy `recordScope` and `custody` MUST map to `record_scope` and `witness_kind`, the originals kept as `legacy_record_scope` and `legacy_custody`.
- **FR-014**: The legacy catalogue fields MUST map as in the clarifications and [contracts/field-mappings.md](./contracts/field-mappings.md); lossy conversions MUST be logged.
- **FR-015**: Images MUST be referenced at their archive address, never copied, with `reproduction_cleared` false.
- **FR-016**: Specialist vocabulary mappings MUST ship for the Dacia profile and an unmapped term MUST fail the import.
- **FR-017**: `registry inventory` MUST build the redirect inventory from the snapshot's routes, and `registry archive-redirects` MUST generate the rule file from the inventory and the registry.
- **FR-018**: Every old Atlas URL MUST redirect to `/atlas/?from=legacy`, and the Atlas MUST show a notice for it.
- **FR-019**: The archive banner, header and link MUST be held as a patch for the archive project, with `npm run archive:check -- <url>` verifying them.
- **FR-020**: `npm run cutover:check` MUST run the automatable checks and `docs/cutover.md` MUST list the manual steps with a named sign-off each.
- **FR-021**: Spec 008 MUST add the import-only `legacy_record_scope`, `legacy_custody` and `legacy_publication_status` fields and the rules `MIG-SLUG`, `MIG-LEGACY` and `MIG-IMAGE-CLEARED` to the registry in its Foundation phase; the map fields it fills (`record_scope`, the widened `witness_kind`, `open_questions[]`, rule `MAP-SCOPE`) are added by spec 004's Foundation (ADR 0016 amends ADR 0011), and the importer needs the Foundations of specs 004, 005 and 006; `FAM-UNKNOWN` stays strict.

### Key Entities
- **Import snapshot** (pinned legacy checkout) and **import manifest**; **Import profile**; **Redirect inventory** (every old URL with one outcome); **Redirect rule file**; **Essay links** (seeds for rebuilds); **Import report** (created, skipped, matched, changed upstream, dropped, lossy).

## Success Criteria *(mandatory)*
- **SC-001**: Zero stable IDs changed by migration (automated diff).
- **SC-002**: Zero 404s across the full old-URL inventory at cutover.
- **SC-003**: 100% of imported publishable records pass the integrity gate or appear on a remediation list.
- **SC-004**: Importing the same snapshot twice yields byte-identical staging output and an empty `--apply` in 100% of fixture tests.
- **SC-005**: No file under `content/` is modified by `--apply` in 100% of fixture tests; no image binary is added to the repository.
- **SC-006**: `cutover:check` fails on each deliberately broken fixture (a stub page, a draft room, a dead link, an inventory URL with no outcome) and passes on a clean one.
