# ADR 0007 — Historical dates use EDTF

**Status**: Accepted · **Date**: 2026-10-16 · **Jira**: TCX-2 · **Spec**: 001 · **Supersedes**: ADR 0006 item 16

The decision was first made on 2026-10-15 on the parallel branch `001-scholarly-registry` (as its ADR 0006, spec 001 analysis finding U1). It replaces the model decided in the registry grill on `main` (signed integer years plus an authored `date_precision`), which the branch's analysis showed to be weaker. The text below is that decision, with the details settled while porting it.

## Decision
All historical dates in registry records (`valid_from`, `valid_to`, and the dates of attestations and sources) are written in the **Extended Date/Time Format (EDTF, ISO 8601-2), levels 0 and 1**. Years always have four digits with an optional sign: `0106`, `-0106`, `1595`.

`date_precision` is **derived** from the value and never authored; a record that sets it fails `DATE-PRECISION-AUTHORED`.

| EDTF | Derived precision |
|---|---|
| `1595-03-12` | day |
| `1595-03` | month |
| `1595` | year |
| `159X` | decade |
| `15XX` | century |
| `1595/1602` | range |
| `1595?` / `1595~` / `1595%` | as above, with uncertain / approximate / both flags |

A missing date is `unknown`. An empty string is not a date: it is invalid.

### Settled while porting
- **Only the forms above are accepted.** The parser would also read times of day, seasons, long years (`Y170000002`), sets and lists; none belongs in a historical date, so they are rejected (`DATE-INVALID`). Unspecified digits stop at a century: `1XXX` is rejected, as the vocabulary has no millennium.
- **Ordering** (`DATE-ORDER`) compares the earliest instant the start can mean with the latest instant the end can mean. It fails only when the start is *definitely* later, so imprecise dates that might overlap (`15XX` to `1550`, `1595/1602` to `1600`) pass.
- **Open intervals** (`1595/..`) are accepted; they have no latest bound.
- `date_label` stays free text for display (`1540 (this copy; plate dated 1531)`); it is not validated.
- The library is `edtf` 4.11.1, wrapped in `src/registry/dates.ts` (`parseDate`, `isEdtf`, `datePrecision`), so a change of parser touches one module.

## Why
- EDTF records uncertainty and approximation natively, so "uncertainty is data" (Principle III) applies to dates too, not only to geometry and confidence.
- A single standard has parsers in both TypeScript and R, so the same strings work in the site build and in R data-prep pipelines.
- Deriving precision from the value removes a field that could contradict it.

## Alternatives considered
Plain integer years with an authored precision (cannot express months, ranges or uncertainty, and the two fields can disagree); a free ISO-like string with a separate precision field (untestable).

## Consequences
- Spec 001 data model, rules and fixtures change: `valid_from` / `valid_to` are EDTF strings, `DATE-INVALID` and `DATE-PRECISION-AUTHORED` are new, `DATE-ORDER` compares bounds, and the `date_precision` vocabulary is gone.
- Spec 005 filters features by year (`valid_from ≤ year ≤ valid_to`). With EDTF it compares the year against the bounds `parseDate` returns, rather than numbers.
- Imports from the live site (spec 008) convert legacy dates to EDTF and record any lossy conversions in the import report.
- Public output carries `valid_from`, `valid_to` and `date_label`; a consumer that needs the precision calls `datePrecision` on the value.
