# Grill Agenda — decisions to settle before /speckit-plan

Run `/grill-with-docs` through these in order. Each answer becomes either a constitution amendment, an ADR or a resolved `[NEEDS CLARIFICATION]`.

## Identity and scope — DONE 2026-10-15 (TCX-9)
1. ~~Name and relationship to the live site~~ → successor, same name; data migrates, essays rebuilt; archive + redirects at v1 cutover (ADR 0001).
2. ~~v1 anchor~~ → Terra Sigillata (Trench A) + Corpus Chartarum Daciae collection with Roman Dacia layers; CND deferred to pilot acceptance (ADR 0002).
3. ~~Collection seed~~ → all 59 records migrate; physical-object fields schema-only in v1 (ADR 0002).

New questions raised: archive host (spec 008 FR-004); logo/typography (spec 002 FR-010); which Trench A test pits depend on CND (spec 003).

## Contracts — DONE 2026-10-15 (TCX-10, ADR 0003)
4. ~~Lifecycle~~ → one shared lifecycle; essay lifecycle derived from stage; availability derived.
5. ~~Confidence~~ → secure / probable / possible / conjectural + unknown.
6. ~~Locator verification~~ → verified_by + verified_on + consulted_copy; AI-found stays pending.
7. ~~Stage exit checks~~ → nine-gate contract accepted; pending locators publishable, never under a secure claim.
8. ~~Portal dimensions~~ → optional essay metadata, no v1 UI.
9. ~~Rooms~~ → Earth, Map, City, Border, Road, Archive, Theatre; all seven public at v1.

## Experience — DONE 2026-10-15 (TCX-11, ADR 0004)
10. ~~Budgets and browsers~~ → Core Web Vitals "good" thresholds + page-type JS budgets; last two versions; baseline the old site before freeze.
11. ~~Citation formats~~ → Chicago NB on page; BibTeX, RIS, CSL-JSON exports.
12. ~~Bibliography authoring~~ → CSL-JSON in repo; one-way import from Zotero/Mendeley exports.
13. ~~Place search~~ → basic exact/prefix in v1.
Also settled: visual identity carries over, rebuilt as tokens.

## Delivery — DONE 2026-10-15 (TCX-12, ADR 0005)
14. ~~Stack~~ → keep TC stack, rebuilt fresh; R allowed for data prep (testthat).
15. ~~Hosting~~ → Cloudflare Pages; successor at terra-chartarum.org (registered); old pages.dev site becomes the frozen archive.
16. ~~Repo / Jira~~ → vladsimion/terra-chartarum-next (private); Jira TCX.

Settled leftovers: 5,000-entity integrity fixture; held-only bibliography entries hidden.

## Spec 001 registry — DONE 2026-10-16 (TCX-2, ADR 0006)
Model decisions are in ADR 0006 (items 1–17). Plan-level decisions for `/speckit-plan`:
- Seams: `loadRegistry(dir)`, pure `validateRegistry(records) → IntegrityReport`, thin CLI; tests assert on stable rule IDs.
- Fixtures: committed hand-written valid/invalid sets; the 5,000-entity registry is generated from a fixed seed, not committed; SC-003 is a named-mutation suite (one rule ID each, a no-op mutation fails); SC-004 is a timed test.
- Scope and order: all five user stories in v1, built US1 → US3 → US2 → US5 → US4 (release filtering before reverse relationships).
- Spec 008 inputs: legacy repo `vladsimion/terra-chartarum`; the 59 maps come from its collection registry; audit real `port` records before writing the import spec.

## Spec 002 shell and design system — DONE 2026-10-16 (TCX-3, ADRs 0008, 0009)
Thirteen decisions, all accepted as recommended:
- Colour schemes: dark default, derived light by `prefers-color-scheme`, no toggle; contrast tested on the token file (AA); accents are named slots (ADR 0008).
- Fonts cover Latin, Latin-extended and Greek; the logo is the text wordmark with ✦ and an SVG favicon; no site search in the header (place search is the Atlas's).
- Mobile navigation is a no-JavaScript `<details>` disclosure; no client-side router in v1.
- Lens and footer destinations owned by later specs ship as **stub pages**; a build check lists them and fails the cutover if any remain.
- Home page: all published essays (title order), the seven rooms, Atlas and Handbook calls to action; no featured mechanism in v1.
- Licences: code MIT, original prose and data CC BY 4.0, every image/dataset/layer shows its own registry licence (ADR 0009).
- Breadcrumbs on every page except the home page and the seven lens landings.
- Home, About and Colophon copy is draft placeholder text marked `draft: true`; the author writes the final text, and none may remain at cutover.
- Plan-level: skip link and landmarks, a static 404, `lang` from the content, one CSS custom-properties token file, Stylelint for raw values.

## Spec 003 essay framework — DONE 2026-10-16 (TCX-4, ADR 0010)
Thirteen decisions, all accepted as recommended:
- Essay record: `rooms` is essay-only (primary plus up to two secondary); new essay fields `question`, `thesis` (required from Outline), `layers`, `bibliography`, `accent`, `authors`, `published_on`, `legacy_url`, `jira` (never public), `open_questions`, `interactions`, `signoffs`, `redirect_switched`, `stage_history` (ADR 0006 amendment).
- `registry promote` runs the cumulative exit checks, then rewrites `stage` and appends to `stage_history`; the gate re-checks the recorded stage. Sign-offs name a person and a date; accessibility and performance are proved by CI on the pull request; Cross-link needs `redirect_switched` (ADR 0010).
- Interaction declarations live in the record, referenced by id from the MDX body. A claim citation points at an Evidence record; Chicago notes and BibTeX, RIS and CSL-JSON are built at build time.
- v1 components: the declaration contract, the citation/export control and the evidence panel; the others when an essay needs them. US5 (research-gated publication) is out of v1. No section-level room tags.
- Trench A: all four Sondaje pits consume CND (48 cells); in v1 they are the essay's local data, `corpus: none`, additive retrofit later (ADR 0002 amendment).
- Spec 003 delivers the framework plus one fixture essay; the Terra Sigillata rebuild is its own Jira epic.

## Collection catalogue (spec 004) — DONE 2026-10-17 (TCX-5, ADR 0011)
- One Map object record per witness (`witness_kind: held | institutional`); image sources are embedded in the record; spec 004 amends spec 001's data model in its Foundation phase.
- `field_status` per displayed field (recorded, not_applicable, not_yet_verified, unknown): empty and unstated is a warning from `ready_for_build`, an error at `publishable`; held provenance and atlas context carry `basis: observed | inferred`.
- No price, vendor or negotiation data is ever committed (public repository); a gate rule rejects those field names.
- Generic family makers are `workshop` cartographers, `attribution: unresolved`; biography is released prose beside the record. A public map's makers must be public (`MAP-MAKER-HELD`).
- Viewer: OpenSeadragon loads on activation, static image first and as fallback, institutional IIIF endpoints, image withheld unless `reproduction_cleared`; authored `alt`; keyboard, touch, reduced motion, no-JS link out.
- Browse: static HTML list plus a build-time JSON index, filters in the query string, date overlap on EDTF, region from `coverage[]` places, sort by date (default), title or maker, no pagination, no text search in v1.
- Citation: the shared generator and control from spec 003, with a map-record input (CSL type `map`). Where used: derived at build, public referrers only.
- Verification: `unverified | checked_online | inspected` (held only), `last_verified` as an ISO date. Dealer or auction support alone fails at `publishable`.
- Enrichment queue: an editor CLI report and CI artefact, scored 1 to 3 on impact, risk and reuse, never published.
- Spec 004 is accepted on fixtures (generated 60 and 500 records, plus about six hand-authored ones); spec 008 maps the 59 legacy records and the editor releases them deliberately.

## Atlas (spec 005) — DONE 2026-10-17 (TCX-6, ADR 0013)
- Public means published and released, with no data-catalogue exception; amends the spec edge case and ADR 0002 (CND is mentioned only in prose).
- Spec 005's Foundation amends spec 001's data model: layers gain `theme`, `tags[]`, `synonyms[]`, `envelope`, `time_mode`, `facets[]` (collections derived; names follow the registry: `members`, `default_layers`); places gain `names[]` (historic or modern, with language and optional validity) and `location` (a WGS84 point); map-overlay layers gain `georef`.
- Rooms of a layer are derived from the public essays that list it; curated membership is spec 007's.
- Time: a feature shows when the year is inside its earliest-start to latest-end interval; possibly-valid features are flagged "date uncertain"; undated features inherit the envelope; an out-of-envelope active layer stays active and is marked; BCE supported.
- Data: sources in the repository, converted at build to FlatGeobuf or PMTiles, with a file-size gate and no bucket in v1; basemap and present-day reference from self-hosted Natural Earth PMTiles, no third-party tile services.
- View address: query string of `/atlas/` with public slugs, slug-history resolution, no `localStorage`; one shared view-URL module, also used by "Open in Atlas" links.
- Facets declared in the layer record, values computed at build, filtering per layer. Provenance shown by line and fill pattern plus legend and inspector text, never colour alone; confidence in the inspector only.
- No WebGL: a build-time SVG overview, text lists and feature tables, detected before MapLibre loads.
- Place search over names with a build-time index; a result recentres and shows a labelled marker, never changing Active Layers. Georeferenced overlays are built last, tested with a fixture, with quality fields in the inspector.
- Handbook as a content collection with stable anchors and draft skeleton copy; no UI framework, a typed store, a build-time catalogue index with a hand-written ranker, MapLibre measured first against the 350 KB budget; essay links via the shared view-URL module.
- Spec 005 is accepted on fixtures (a seeded 200-layer generator plus a small hand-authored set); spec 008 imports the real Roman Dacia layers.

## Still open
- Specs 006 to 008 are not yet grilled (006 bibliography, 007 rooms, 008 migration and cutover).

Constitution ratified as v1.0.0 on 2026-10-15. /speckit-analyze runs per feature once tasks.md exists.
