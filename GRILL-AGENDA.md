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

## Still open
- Spec 003: which Trench A test pits depend on CND attestations (needs the essay author).

Constitution ratified as v1.0.0 on 2026-10-15. /speckit-analyze runs per feature once tasks.md exists.
