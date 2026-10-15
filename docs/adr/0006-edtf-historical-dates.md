# ADR 0006 — Historical dates use EDTF

**Status**: Accepted · **Date**: 2026-10-15 · **Jira**: TCX-2 · **Spec**: 001 (analysis finding U1)

## Decision
All historical dates in registry records (`valid_from`, `valid_to`, publication dates, attestation dates) are written in the **Extended Date/Time Format (EDTF, ISO 8601-2), levels 0 and 1**. Years always have four digits with an optional sign: `0106`, `-0106`, `1595`.

`date_precision` is **derived** from the EDTF value and never authored:

| EDTF | Derived precision |
|---|---|
| `1595-03-12` | day |
| `1595-03` | month |
| `1595` | year |
| `159X` | decade |
| `15XX` | century |
| `1595/1602` | range |
| `1595?` / `1595~` / `1595%` | as above, with uncertain / approximate / both flags |

An empty or missing date is `unknown`.

## Why
- EDTF records uncertainty and approximation natively, so "uncertainty is data" (Principle III) applies to dates too, not only to geometry and confidence.
- A single standard has parsers in both TypeScript and R, so the same strings work in the site build and in R data-prep pipelines.
- Deriving precision from the value removes a field that could contradict it.

## Alternatives considered
Plain integer years (cannot express months, ranges or uncertainty); a free ISO-like string with a separate precision field (untestable, as the analysis found).

## Consequences
- Spec 001 data model and tasks updated; validation rejects strings that are not EDTF level 0–1.
- Imports from the live site (spec 008) convert legacy dates to EDTF and record any lossy conversions in the import report.
