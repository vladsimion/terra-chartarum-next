# Contract: citations and exports

All formatting is at build time, offline, from CSL-JSON; nothing citation-related ships to the browser.

## On the page
- A claim citation points at an Evidence record. The note is Chicago notes-bibliography, formatted from the evidence's source (its bibliography entry's CSL-JSON) plus the locator.
- The note shows the verification state: `verified` with who and when, or `pending` as visible text. A claim rated `secure` on a pending locator already fails the gate (`LOC-SECURE-PENDING`).
- The essay's bibliography lists its `bibliography[]` entries grouped into the seven sections in order (primary sources, historical maps, reference works, specialised studies, digital resources, datasets and licences, further reading); a section with no entries is hidden. Entries are formatted as Chicago bibliography items.

## Exports of the essay itself
Three static files per public essay, built from its record (`title`, `authors`, `published_on`, stable URL) and the build's access date:

| File | Format |
|---|---|
| `/essays/<slug>/cite.bib` | BibTeX |
| `/essays/<slug>/cite.ris` | RIS |
| `/essays/<slug>/cite.json` | CSL-JSON |

The access date is `SOURCE_DATE_EPOCH` when set and the build date otherwise. The stable URL is the essay's canonical address on terra-chartarum.org. Map records, datasets and layers get the same three exports from spec 004/005 pages, using this module.

## Vendored style
The Chicago notes-bibliography CSL style and the locale file are kept unmodified under `src/essays/csl/` with their CC BY-SA 3.0 attribution (the project's code stays MIT; ADR 0009).
