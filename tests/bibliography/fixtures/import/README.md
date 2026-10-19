# Import samples (spec 006)

One sample per format for `registry import-bib`, written against `../registry/` (the fixture entries). The third column is what the importer should do with each item (research R1: DOI, then ISBN, then the weak key of first author family name + year + first six title words).

| Item | In | Matches | Expected |
|---|---|---|---|
| Moe, *A fixture study of frontiers* (1994) | `sample.bib` (DOI as `https://doi.org/10.1000/FIXTURE.4`) and `sample.ris` (`10.1000/fixture.4`) | entry 4 by DOI | reported as a match, nothing written |
| Marsh, *The Roads of the Province* (1955) | `sample.bib` (ISBN-10 `0306406152`) and `sample.ris` (`978-0-306-40615-7`) | entry 10 by ISBN | reported as a match, nothing written |
| Marsh, *The Roads of the Province*, 2nd ed. (1972) | `sample.csl.json` | entry 11 by ISBN | reported as a match, nothing written |
| Doe, *A Fixture Chronicle* (1991) | `sample.csl.json`, no identifier | entry 1 by the weak key (case and punctuation ignored) | reported as a match, nothing written |
| Moe, *A fixture study of frontiers, revisited in detail for the record* (1994) | `sample.ris`, no identifier | nothing: same author and year as entry 4, but the first six title words differ | created, held |
| Vale (2019), Orme (2021), Wells (2020) | one in each file | nothing | created, held |
| the item with no `type` | `sample.csl.json` | | skipped and reported |
