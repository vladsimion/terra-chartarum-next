# ADR 0023 — Person records: one record per person, apart from the Cartographer profile

**Status**: Accepted · **Date**: 2026-11-22 · **Jira**: TCX-82 (spec 012, clarification Q1) · **Epic**: TCX-79 (Stage III) · **Amends**: ADR 0006 item 10 (the closed family list) · **Extends**: ADR 0021 (place roles)

## Context
The printing network (spec 012) is about people as much as books. Macarie printed at Dealu in 1508, Ljubavić at Târgoviște in 1545–47, and Coresi first at Târgoviște, then at Brașov. A printer's movement is shown through the dated editions they made at each place (ADR 0021), so each edition must link to its printer.

The closed family list has no record for a person. The only maker family, Cartographer, is defined as the profile of a maker of maps (cartographer, engraver, publisher), and the Cartographers lens lists exactly those.

## Decision
1. **A new family, `person`,** added to ADR 0006's closed list by a spec amendment (spec 001, through spec 012). A person record holds:
   - names, each with its language and kind;
   - life dates in EDTF (ADR 0007), which may be uncertain or unknown;
   - the usual entity fields: lifecycle, held/released, same_as (for example VIAF or Wikidata).
2. **One record per person, whatever their roles.** A person who printed books and also made maps is one person record. A Cartographer profile may point to it. The two families are not merged, and the Cartographers lens is unchanged.
3. **Links carry the role.** An edition names its printer with a role (`printer`), a basis (`stated` in the book, or `attributed`) and a confidence, as place roles do. More roles (patron, translator, typesetter) are added when a record needs them, each as a vocabulary value with a glossary definition.
4. **A person's movement is never a stored path.** It is read from the dated editions they made, as ADR 0021 already requires.

## Considered options
- **Widening Cartographer to "maker":** rejected. It would change a defined term, the Cartographers lens and every map record's meaning, to fit people who never made a map.
- **Printers as names inside each edition's citation:** rejected. A printer could not be followed across editions, and Coresi's move from Târgoviște to Brașov could not be shown.

## Consequences
- **Spec 012** amends spec 001's family list and data model. It adds the gate rules for person records and for the printer link (role, basis and confidence vocabularies).
- **GLOSSARY.md** gains **Person** (added with spec 012's clarifications).
- A Cartographer that is also a person gains an optional pointer to the person record when a real case needs one. No migration of existing Cartographer records is planned.
