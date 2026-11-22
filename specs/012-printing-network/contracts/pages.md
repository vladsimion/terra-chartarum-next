# Contract: edition and person pages

## Edition: `src/pages/bibliography/[slug].astro`, new section

Shown only when the entry has place roles. Heading: **Where it was made and where it is kept**.

1. **Made at** the place, with its basis and confidence in words ("attributed by scholarship, high confidence") and the date.
2. **Copies kept at**: each current holding, with holder, shelfmark and since when.
3. **Formerly kept at**: each closed holding, with dates.
4. **No copy is known**: when `survival: none_known`, said in words instead of an empty list.
5. **Earlier attributions**: the historiography note, each with its source. These are never shown as places on the map.
6. **Printer**: each person link, with role, basis and confidence, linked to the person page.
7. **See on the map**: a link to the network collection, centred on the production place (the address is the state, ADR 0013).

Pending locators are marked pending (ADR 0003 §4).

## Person: `src/pages/people/[slug].astro` (new) and `/people/` (index)

- Names, with language; life dates, or "dates unknown".
- **Editions**, in date order. Each shows its production place and date and links to its edition page. A move is read from this list; no path is drawn.
- Only public editions are listed, derived from `people[].person` (never stored).

Both pages meet the ADR 0004 budgets and the spec 002 shell's accessibility checks. No script is required to read them.
