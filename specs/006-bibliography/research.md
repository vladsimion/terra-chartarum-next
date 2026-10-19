# Research: Bibliography & Citation

Decisions not already settled by the grill (ADR 0014), ADR 0004 or spec 003's research.

## R1. Duplicate matching on import
- **Decision**: an imported item matches an existing entry on, in order, (1) DOI normalised to lower case with any `https://doi.org/` prefix removed; (2) ISBN with hyphens removed, comparing ISBN-13 (an ISBN-10 is converted); (3) a key of normalised first author family name + year + the first six words of the title, all lower case with diacritics folded and punctuation removed. The first rule that matches decides; later rules do not run. A match is reported with the existing entry's ID and the rule that matched; nothing is written.
- **Rationale**: identifiers are exact; the weak key catches the common case of a missing DOI without merging different works by the same author in the same year (the title words separate them).
- **Alternatives**: fuzzy title similarity (false merges, hard to explain); matching on title alone (too many collisions).

## R2. Slugs and IDs for imported entries
- **Decision**: IDs are minted by `registry mint bibliography_entry` (opaque counters). The slug is `<first-author-family>-<year>-<first-title-word>` in ASCII lower case, skipping a leading "a", "an" or "the" (a slug of `moe-1994-a` says nothing); on collision with a live slug or a slug history entry, a letter suffix (`-b`, `-c`) is added. The editor may rename later; slug history keeps old addresses (ADR 0006).
- **Rationale**: readable addresses that survive a reference manager's churn; the ID stays opaque.
- **Alternatives**: slug from the full title (long); the citation key from BibTeX (not unique across managers).

## R3. Parsing imports
- **Decision**: parse with `@citation-js/core` and its BibTeX and RIS plugins into CSL-JSON, the same libraries spec 003 uses for output. A file that does not parse is rejected whole with the line of the first error; an item missing a `type` or `title` is skipped and reported.
- **Rationale**: one conversion path both ways; CSL-JSON is the stored form (ADR 0004 §3).
- **Alternatives**: separate BibTeX and RIS parsers (two more dependencies, drift).

## R4. The evidence route
- **Decision**: from each public essay, `evidence[]` gives Evidence records; each public Evidence record's `source` gives a Source; each Source's `entry` gives the entry. The locator and its verification state come from the Evidence record. A Source flagged `is_finding_aid` is skipped on this route (already forbidden by `REF-FINDING-AID`; the derivation is defensive).
- **Rationale**: it uses fields the registry already validates; no body parsing is needed in the registry or the derivation.
- **Alternatives**: parsing `<Cite>` tags from essay bodies (duplicates spec 003's scan and can disagree with `evidence[]`).

## R5. Search index
- **Decision**: `bibliography-index.json` holds, per public entry, the slug, title, first-author display name, all author names normalised, year, section, keywords, and the slugs of the essays that cite it. Search is a case- and diacritic-insensitive substring match on author, title, year and keyword fields; results are ordered by section then by author and year. No ranking beyond that.
- **Rationale**: a bibliography is scanned, not ranked; substring match meets the spec scenario and is trivially testable; 1,000 entries is a few tens of kilobytes compressed.
- **Alternatives**: a ranked full-text index (not asked for, more code).

## R6. CSL items for a dataset, a layer and the site
- **Decision**: a dataset becomes CSL type `dataset` with `title`, `version` and `publisher` ("Terra Chartarum"), `issued` from its EDTF date when present, `author` from its `rights.attribution` when present, and `URL`. A layer is the same, titled by the layer and naming its dataset in `container-title`. The site statement is a CSL `webpage` item. See [contracts/cite-inputs.md](./contracts/cite-inputs.md).
- **Rationale**: the CSL types and fields are the standard ones the Chicago style already knows how to render.
- **Alternatives**: a bespoke format (breaks the shared generator).

## R7. Deterministic access date
- **Decision**: the generator takes `accessed` as an input; the integration passes `BUILD_DATE` when set (ISO date) and otherwise today's UTC date; tests always set it.
- **Rationale**: a build must be reproducible for the same inputs; a date that changes silently would make byte-identical outputs impossible to assert.
- **Alternatives**: omit the access date (ADR 0004 requires it); a fixed date (wrong in production).
