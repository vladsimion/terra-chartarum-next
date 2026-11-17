# Confluence entry: Build Log (page 2490370)

Not yet published. To be appended as the next section after AB (spec 008), with the header pointer extended to it; the rest of the page is left unchanged. The text below is what will be published, and it grows by one row per merged slice.

## AC. The successor build: the anchor essay (spec 009)

Under way on `main` of [github.com/vladsimion/terra-chartarum-next](https://github.com/vladsimion/terra-chartarum-next), from 20 October 2026. Jira epic TCX-52. Working detail is in the spec 009 programme dossier (`docs/confluence/spec-009-anchor-essay.md` until it is published).

| PR | Scope | Jira |
|---|---|---|
| #105 | The anchor essay grill: the glossary terms Trench A, Lapidarium and Stone; ADR 0017 (the essay rebuilt whole as a faithful port, no JavaScript, releasing only what it uses) | TCX-52 |
| #106 | Spec 009, clarified (a preview build before Publish; a map without a licence statement drops to source-only) | TCX-52 |
| #107 | Plan, research, data model, contracts, quickstart; 65 tasks in twelve pull-request slices; analysis (one high finding fixed: the twelve minted bibliography entries need a `section` to be public) | TCX-52 |
| #108 | Slice 2, the review tooling (T001 to T011): `essay:preview` (a temporary registry copy with the essay and what it uses marked released), the changed-claim ledger check and its seeded ledger, the pit-cell reconciliation against the legacy attestations, the legacy paragraph manifest and the port-fidelity check, the cell-file validator | TCX-53 |
| #110 | Slice 3, the three shared components (T012 to T018): `Timeline` on the legacy square-root scale, `CompareSlider` as a native labelled radio group driving the reveal through `:has()`, `Scrollytelling` as a sticky figure beside its steps; none ships script; a fixture essay, a built-output test over a Vitest build of the essay fixture registry, the progressive-CSS test and a Playwright spec in light, dark and no-JavaScript | TCX-54 |
| (open) | Slice 4, the four essay-specific components (T019 to T021, with T022's registration): `StoneGallery`, a visually hidden labelled checkbox whose `:has()` exchanges ink and paper on every plate; `StonePlate`, which names the slotted drawing; `SectionRadar`, static SVG from a pure geometry module with a values table and `:has()` legend emphasis; `PitTable`, the pit's thirteen cells from the cell file through `renderCell`, every row marked not yet corpus-backed; a second fixture essay with a 52-cell file | TCX-54 |

The one decision slice 3 forced. The contract said a native range input would drive the reveal through a CSS custom property with no script. CSS cannot read a range input's value, so without a script the reveal would never have moved. The editor chose a native labelled radio group of five reveal positions (0, 25, 50, 75, 100 %): the arrow keys move the reveal, it works with script off, and a browser without `:has()` gets the two figures in full over a plain form. FR-007, research.md and the components contract were amended in the same pull request; Home and End, which a radio group does not have, left the test.

The one decision slice 4 forced. The legacy squeeze was a stack of CSS filters, and the shell's lint forbids `filter` outright. The squeeze is now the tokens themselves: the gallery rewrites four `--plate-*` custom properties that every plate reads, so ink and paper exchange places and the relief is a real negative in both colour schemes, with no new colour token and no filter.

State at slice 4: 2619 Vitest tests in 221 files, all passing; `npm run test:e2e:essays` 93 tests in three projects, with axe clean on both fixture essays; `lint:css` and `typecheck` clean; the built fixture page with all four components is 3.6 KB gzipped and ships no script. The essay record does not exist yet; the author's inputs (the `question` and `thesis`, four licence statements, the open map answers, twelve locators) are the critical path for slices 5 to 7.
