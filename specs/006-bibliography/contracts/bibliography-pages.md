# Contract: bibliography pages

Pages exist only for public entries (published, released, cited by a public record; ADR 0014). A held or uncited entry generates no page, no index entry, no export and no link.

## Addresses

| Page | Address |
|---|---|
| Bibliography index | `/bibliography/` |
| Entry page | `/bibliography/<slug>/` (a former slug redirects, ADR 0006) |
| Entry exports | `/bibliography/<slug>/cite.bib`, `cite.ris`, `cite.json` |
| Search index | `/data/bibliography-index.json` |
| Dataset and layer exports | `/data/cite/dataset/<slug>.{bib,ris,json}`, `/data/cite/layer/<slug>.{bib,ris,json}` |

## Index page

Public entries grouped under the seven section headings in order (empty sections hidden), each entry as its Chicago bibliography form linking to its page. A filter form (section, essay) and a search field are present with and without JavaScript; without JavaScript the form submits as a GET to the same page and the list stays complete. With JavaScript, `filters.ts` loads the index, applies the filters and search, and writes them to the query string. A "Cite this site" statement with its exports sits at the foot.

### Query string

`section=<key>` (repeatable), `essay=<slug>` (repeatable), `q=<text>`. An unknown key or value is ignored. The same query on a fresh load gives the same view.

### Search index entry

`{ slug, title, author, authors: [normalised], year, section, keywords: [normalised], essays: [slug] }`, ordered by section, then author, then year. No other field.

## Entry page

Order: the Chicago bibliography form; a "Finding aid" badge when any Source pointing at the entry is flagged; the section label; identifiers from the CSL-JSON as links (DOI, ISBN, URL, catalogue reference) and the external `digital_copy` link; "Other editions and translations" (public entries, with the relation); "Cited in"; the cite and export control.

### Cited in

Two labelled groups, each hidden when empty:
- **Cited as evidence**: the citing essay linked, the locator (value and state), and the verification state; a pending locator is visibly marked and says it is pending. A finding aid never appears here.
- **Listed in bibliography**: the citing record linked (essay, map, cartographer, layer; a dataset has no page and is named with its layer when one lists it).

Only public citing records appear. The groups are sorted by the citing record's title.

## Export control

The shared control and generator of spec 003 with the entry as input: Chicago bibliography form on the page, and the three downloads. Each export carries the canonical URL and the access date (`BUILD_DATE`; see [cite-inputs.md](./cite-inputs.md)).

## Leak rule

Nothing about a held entry, a held citing record or a held Source may appear in any page, JSON file or URL (SC-003, tested on the built output).
