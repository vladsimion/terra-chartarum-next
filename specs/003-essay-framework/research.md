# Research: Essay Framework & Editorial Pipeline

Decisions not already settled by the grill (ADR 0010 and the amendments), ADR 0004 or ADR 0005.

## R1. MDX for the body
- **Decision**: essay bodies are MDX rendered by `@astrojs/mdx`, one `.mdx` file beside each record. Framework components are imported by the layout, not by the author.
- **Rationale**: spec 001's plan already puts a body next to the record; MDX is what the live site's native essays use; the components are static HTML with no island by default.
- **Alternatives**: plain Markdown with directives (no component props to scan); authoring in the YAML (not prose).

## R2. Citation formatting library
- **Decision**: `@citation-js/core` with the CSL, BibTeX and RIS plugins, run at build time only. Chicago notes-bibliography uses the official CSL style file and locale, vendored in the repository.
- **Rationale**: ADR 0004 asks for Chicago notes-bibliography on the page and three export formats; formatting from CSL-JSON is exactly what these libraries do, and a hand-written Chicago formatter would be wrong for some entry types. Nothing ships to the browser.
- **Alternatives**: `citeproc` directly (the same engine, fewer export plugins); a hand-written formatter limited to books and articles (the entries include maps and archival items).
- **Licence**: the official CSL style files are CC BY-SA 3.0. They are vendored unmodified with their attribution and kept apart from the project's MIT code (ADR 0009).

## R3. Rewriting a record without losing its comments
- **Decision**: `promote` and `new essay` use the `yaml` package's Document API, which keeps comments and key order, and write atomically (temp file, then rename).
- **Rationale**: records are edited by hand too; a command must not reformat them.
- **Alternatives**: parse to an object and dump (loses comments).

## R4. Essay lifecycle is stored, and derived
- **Decision**: `promote` writes `lifecycle` together with `stage`, using the table in ADR 0003 §2, so the stored value is always consistent. `LIFE-ESSAY-DERIVED` stays and fails any record where they disagree.
- **Rationale**: the registry reads `lifecycle` from the file in every rule and in the public projection; computing it at load time would make the stored record and the checked record differ.

## R5. Scanning the body
- **Decision**: `essay-body.ts` finds the framework tags (`MapFigure`, `Cite`, `EvidencePanel`, `Interaction`, `CitationExport`) and reads their props with a small scanner. Props must be string literals; a computed prop is a violation (`ESSAY-BODY-DYNAMIC`), because the gate cannot resolve it. The loader attaches the result to the in-memory record as `body` (like `file`, never a field of the YAML), and `FAM-UNKNOWN` exempts it.
- **Rationale**: the spec says the gate scans tags and does not parse MDX in full (clarified); a literal-only rule keeps that sound.
- **Alternatives**: a full MDX/remark parse in the gate (pulls the site toolchain into the framework-free module).

## R6. Accent slot names live in the registry, the values in the tokens
- **Decision**: `src/registry/accent-slots.ts` lists the slot names; spec 002's accent test asserts `tokens.css` defines exactly these. `ESSAY-ACCENT` checks an essay's `accent` against the list.
- **Rationale**: the gate must validate the name without reading CSS; a test keeps the two lists equal.

## R7. The bibliography section is a field on the entry
- **Decision**: a bibliography entry gets `section`, one of seven values (`primary_sources`, `historical_maps`, `reference_works`, `specialised_studies`, `digital_resources`, `datasets_licences`, `further_reading`). This spec adds the field to the schema (it must render sections now); spec 006 owns authoring and the site-wide index.
- **Rationale**: the constitution fixes the seven sections; local bibliographies are authoritative.

## R8. A claim citation in the page with and without JavaScript
- **Decision**: `Cite` renders a numbered note marker that links to the note in the page's notes list; the note shows the Chicago text and, in a native `<details>`, source, locator and verification state. The evidence panel is the same data, opened from the note. No script.
- **Rationale**: US1 AC4 and the no-JavaScript requirement; zero JS keeps the budget for bespoke interactions.

## R9. Export files and the access date
- **Decision**: the three exports are static files generated at build time per essay (`/essays/<slug>/cite.bib`, `.ris`, `.json`), each with the essay's stable URL and an access date taken from `SOURCE_DATE_EPOCH` when set and the build date otherwise, so tests can fix it.
- **Rationale**: ADR 0004 requires a stable URL and access date; reproducible builds need a controllable date.

## R10. What `promote` checks and what it only reports
- **Decision**: it runs every registry rule on the candidate record in the context of the whole registry and refuses on any `ESSAY-*` error or any error that mentions the essay. It prints the CI requirement for Publish (ADR 0010) and never claims it ran axe or Lighthouse.
- **Rationale**: ADR 0010; one definition of validity, the gate's.

## R11. The public projection of an essay
- **Decision**: the allowlist gains `question`, `thesis`, `rooms`, `layers`, `bibliography`, `accent`, `authors`, `published_on` and `interactions` (the question and expected interpretation are reader-facing). `jira`, `signoffs`, `stage_history`, `open_questions`, `legacy_url` and `redirect_switched` stay private by default.
- **Rationale**: ADR 0006 item 15 (private is the default); only what the page shows is allowlisted.

## R12. The fixture essay
- **Decision**: a small neutral essay under `tests/essays/fixtures/registry/` exercises every contract (two map figures, a claim citation to a pending locator and one to a verified locator, one declared interaction, all seven bibliography sections, a secondary room, a related essay) and is built only under the test environment, never in the production build.
- **Rationale**: spec 003 delivers the framework, not Terra Sigillata.
