# Contract: the Atlas view address

The Atlas view lives in the query string of `/atlas/`. One module, `src/atlas/view-url.ts`, parses and serialises it; the Atlas and every "Open in Atlas" link use that module and nothing else (ADR 0013).

## Grammar

| Parameter | Meaning | Value |
|---|---|---|
| `y` | year | signed integer, negative for BCE (`y=-106`, `y=1400`) |
| `l` | active layers, in activation order | comma-separated public layer slugs |
| `f` | focused layer | one public layer slug, which must also be active |
| `lens` | discovery lens | `theme`, `collection` or `room` |
| `c` | collection context | one public collection slug, meaningful with `lens=collection` |
| `rel` | year-relevance toggle | `1` when on; absent when off |
| `facet.<slug>` | a layer's facet selection | `property:value1\|value2` for a category, `property:min..max` for a range; several properties separated by `;` |

Values are percent-encoded. Parameters are written in the order above; defaults are omitted (no `y` when the year equals the default year, no `lens` for `theme`, no `rel` when off), so the same state always serialises to the same address.

## Parsing and resolution

- A slug is resolved first against live layer slugs, then against slug histories of public layers (`atlas-slugs.json`). A slug found only in history resolves to the current slug and is reported as renamed.
- A slug that matches nothing public is skipped and reported as unknown. The message never says whether the slug belongs to a held or non-existent layer.
- A focused layer that is not active is dropped from the state and reported.
- A facet whose layer, property or value does not exist is dropped and reported.
- An unparseable `y` is replaced by the default year and reported.
- Nothing is read from or written to `localStorage` or cookies.

## Round trip

`parse(serialise(state))` equals `state` for every state built from public slugs, and `serialise(parse(address))` is the canonical form of any address. Both are tested over generated states (SC-003).

## Reporting

The Atlas shows one notice listing renamed, skipped and dropped items, each as escaped text, and the rest of the view loads normally.
