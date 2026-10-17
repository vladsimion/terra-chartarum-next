# Contract: citation inputs

Spec 003's generator (`src/essays/citations.ts`) renders Chicago notes-bibliography and the three export formats from a CSL-JSON item. This spec adds the CSL items for four more inputs. All formatting is at build time and offline.

## Inputs

| Input | CSL item |
|---|---|
| Bibliography entry | the entry's own CSL-JSON, unchanged, with `URL` set to its canonical page address when the item has none, and `accessed` added |
| Dataset | `type: dataset`; `title`; `version` from the dataset's `version`; `publisher: "Terra Chartarum"`; `issued` from its date when present; `author` from `rights.attribution` when present; `URL` the canonical address of the layer page or Atlas view that shows it; `accessed` |
| Layer | `type: dataset`; `title` the layer's; `container-title` the dataset's title; `version`; `publisher`; `author` from `rights.attribution`; `URL` the Atlas view address of the layer (built by the shared view-address module); `accessed` |
| Site | `type: webpage`; `title: "Terra Chartarum"`; `publisher: "Terra Chartarum"`; `URL: https://terra-chartarum.org/`; `accessed` |

## Stable URL and access date

- The stable URL is the canonical address on the site origin (the Astro `site` setting). A former slug keeps resolving through slug history, so an older citation still lands on the entity.
- `accessed` is the build date: the `BUILD_DATE` environment variable (ISO date `YYYY-MM-DD`) when set, otherwise today's date in UTC. Tests always set it.
- A held or non-public input produces no item and no export file.

## Files

Entries: `/bibliography/<slug>/cite.{bib,ris,json}`. Datasets and layers: `/data/cite/{dataset,layer}/<slug>.{bib,ris,json}`, linked from the Atlas inspector (layer and its dataset) and written by the bibliography integration after the Atlas build. Essays and maps keep the files spec 003 and spec 004 define.

## Validation

Every export parses with the format's parser (`@citation-js/core` BibTeX and RIS plugins; CSL-JSON schema) in a test (SC-002).
