# ADR 0021 — Place roles: how a record is tied to a place, and what the map may draw

**Status**: Accepted · **Date**: 2026-11-22 · **Jira**: TCX-80 (Stage III grill), TCX-81 · **Epic**: TCX-79 (Stage III) · **Extends**: ADR 0003 (shared vocabularies), ADR 0006 (record model), ADR 0011 (map record model), ADR 0013 (Atlas contracts)

## Context
A Princeton catalogue pins the 1508 Leitourgikon on the Library of the Romanian Academy. That is where a copy is kept, not where the book was printed (Dealu, Târgoviște, by attribution). The pin is a reasonable data-model default, but it misleads anyone who reads a pin as "where it comes from". Stage III's first priority, the printing network of 1508 to the 1560s, is about exactly those places: where books were made, and where their copies ended up. A place shown for an object must therefore say what kind of tie it is.

## Decision
1. **Two roles.**
   - `produced_at`: where the record's object was made.
   - `held_at`: where a copy is kept, always over a dated interval. A closed interval is shown as "formerly at", a label derived from the end date and never stored as a role.
   - What a map or source *shows* of a place is not a place role. It stays in map coverage and in Attestations of form `depiction`, which already carry their evidence.
2. **One shape.** A record carries a `place_roles` list. Each link has:
   - `place` (a Place ID) and `role`;
   - `basis`: `stated` if the object itself names the place (a colophon), `attributed` if scholarship assigns it;
   - `confidence` (the shared scale, ADR 0003 §3 as amended by ADR 0020);
   - `valid_from` and `valid_to` (EDTF, ADR 0007);
   - `evidence` (Evidence record IDs).
   `basis` and `confidence` are separate: Dealu for 1508 is attributed with high confidence, while its date is stated.
3. **At most one `produced_at` per record.** The current attribution carries its basis and confidence. Superseded attributions (for 1508: Venice, Bistrița, Snagov, Govora, Cetinje) go in the record's historiography note with their sources, not on the map as "contested".
4. **One `held_at` per copy per holding period.** Each link names its `holder` (the institution; required) and, where known, a `shelfmark`. Two copies in one city stay distinct, and a copy that moved has one dated link per holding.
5. **First slice: printed editions only.** An edition is a `bibliography_entry`; its surviving copies are its `held_at` links. No family for single physical objects is added yet. A general `object` family is reconsidered when a copy carries evidence of its own, such as an owner's mark that dates a former holding.
6. **Maps are not migrated in this decision.** Map records keep `publication_place` and `repository` (ADR 0011). `place_roles` is refused on a map until a separate migration moves those fields across, so the same fact never has two homes.
7. **The map rule.** The Atlas never draws a pin for an object without its role:
   - one pin per role, styled by role, with a legend entry for each role shown;
   - by default only `produced_at` is shown, and copies sit behind a toggle;
   - an `attributed` place is drawn and labelled differently from a `stated` one.

## Considered options
- **A `formerly_at` role:** rejected. It is a `held_at` with an end date, and a separate role lets the two disagree.
- **A `depicts` role:** rejected. Coverage and depiction Attestations already hold it, with evidence.
- **Several `produced_at` links shown as "contested":** rejected. Five pins for one book overstate old guesses; the doubt belongs in confidence and the historiography note.
- **A record for each copy now:** deferred (decision 5).
- **Migrating maps at the same time:** deferred (decision 6), to keep spec 004's catalogue out of Stage III's first slice.

## Consequences
- **Gate rules** (rule IDs set by the spec):
  - at most one `produced_at`;
  - `held_at` requires `holder` and a `valid_from`;
  - `basis` and `role` are checked against their vocabularies;
  - `place_roles` is refused on a map.
- **Test cases** (from the grill):
  - the Sibiu catechism of 1544: `produced_at` known, no copy survives (`held_at` empty);
  - the twelve surviving 1508 copies: twelve `held_at` links, none open-ended without a holder;
  - Coresi's move from Târgoviște to Brașov: two editions, two `produced_at` places, two dates.
- **GLOSSARY.md** gains **Place role**.
- **The printing-network spec** (Stage III rank 1) builds on this ADR. It is the only Stage III candidate that gets a full spec.
