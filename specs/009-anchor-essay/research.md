# Research: The Anchor Essay

Each entry is a design question the plan had to settle, answered from the repository and the pinned legacy snapshot (`e82afd9`). Nothing here is a `[NEEDS CLARIFICATION]`; the one item left for the author is marked as such.

## R1. Where the interaction code lives
- **Decision**: three shared components in `src/essays/components/` (`Timeline`, `CompareSlider`, `Scrollytelling`), each a section of `docs/essay-components.md`; four essay-specific components in `src/essays/bespoke/` (`StoneGallery` for the squeeze toggle, `StonePlate`, `SectionRadar`, `PitTable`).
- **Rationale**: spec 003 says the timeline, compare slider and scrollytelling "are built when an essay's Outline needs one, each with its question, keyboard operation, reduced-motion variant and no-JS fallback", and `tests/essays/unit/component-docs.test.ts` fails for a component with no section in the doc. The radar chart (five axes, two series, a values table), the squeeze toggle (a presentation switch) and the plate and table markup serve only this essay.
- **Alternatives**: all seven essay-local (three reusable components nobody could reuse); all seven shared (a radar chart and a squeeze toggle in the framework for one essay).

## R2. How the body reaches a component
- **Decision**: the page's `components` map in `src/pages/essays/[slug].astro` gains the seven names; each takes literal props only (`ESSAY-BODY-DYNAMIC`), keeps its CSS scoped in the component with tokens, and uses no `<script>` and no client directive.
- **Rationale**: the page passes `{ MapFigure, Cite, EvidencePanel, Interaction, CitationExport }` to `<Content>`; MDX takes any tag the map names. A global stylesheet for body markup would leak into every essay, and scoped CSS cannot reach markup written in the body, so the markup that needs styling is inside components.
- **Alternatives**: plain HTML in the body with a global essay stylesheet (leaks; the token lint would apply to a file every essay loads).

## R3. Zero-JavaScript techniques
- **Decision**: the squeeze toggle is a visually hidden checkbox with a label and `:has()`; the compare slider is a native range input whose value sets a CSS custom property that clips the top map; the scrollytelling is a sticky static figure beside the steps, the active step highlighted with CSS scroll-driven animation where the browser supports it; the radar charts are static SVG with a table and `:has()` for legend emphasis; the timeline is ported as it is (it already ships no script).
- **Rationale**: measured on the legacy code, the five pieces use 4.4 KB gzipped of script, and what that script does is toggle an attribute, move a position and mark the active step. Three fail without script (a dead toggle, a slider frozen at 50%, a core drawing that is probably invisible); native controls give keyboard operation and focus for free.
- **Browser support**: the enhancements (`:has()`, scroll-driven animation) are progressive. Without them the controls still work and the content is all present; only the highlight is absent. To be checked in the e2e matrix, not assumed.
- **Alternatives**: port the legacy scripts (they fit the 100 KB budget, but would be rewritten to fix the no-script defects anyway).

## R4. Theming the sixteen drawings
- **Decision**: the legacy drawings are inline SVG with 12 distinct hard-coded colours and 29 inline `style` attributes. They move onto tokens in the component CSS (classes on the elements, colours from `tokens.css`), keeping each drawing's shapes, `role="img"` and `aria-label`; a build test fails on a hard-coded hex colour in the essay's built SVG.
- **Rationale**: the shell has a dark and a light scheme and a token lint; fixed colours cannot be guaranteed to pass contrast in both. The shapes and labels are the author's; the colours are presentation.
- **Open for the author (not blocking)**: the palette mapping is judged by eye at Design QA, in both schemes.

## R5. The preview build
- **Decision**: `scripts/essay-preview.ts <slug>` copies the registry (`content/`, `vocab-mappings/`, the layer data) to a temporary folder; in the copy it sets the essay to stage `Publish`, `release: released`, with placeholder sign-offs, `published_on` and `design_qa_passed` stamped as preview, and sets the records the essay uses (its maps, evidence, sources and their bibliography entries) to published and released; then builds the copy (`REGISTRY_ROOT`) into `dist-anchor`. `--without <map>` leaves a map out (removing it from the copy's `maps` and its `<MapFigure>` from the copy's body), which is how a stone drops to source-only.
- **Rationale**: the site build runs the whole integrity gate (`checkRegistry`) and stops on an error, and a held essay is not projected, so a copy must be gate-consistent to build at all. That is also the point: a record not ready to be published makes the preview fail with the gate's own errors, which is the release-readiness report.
- **Alternatives**: a held-records switch in the site build (rejected in the grill); a branch with the records flipped (public preview URL, risk of merging).
- **Limit**: a preview that builds does not prove the real registry passes; each promotion still runs the real gate.

## R6. The cell file
- **Decision**: `content/essay/<id>.cells.json`, an array of the framework's `Cell` (`pit, stratum, name, language, reading, note, corpus: 'none'`), 52 entries in pit order, rendered by `PitTable` through the existing `renderCell` (which supplies "not yet corpus-backed").
- **Rationale**: spec 003 keeps the cell file "with the essay, not in the registry"; the registry loader reads only YAML, so a JSON file beside the body is ignored by it. The essay's tables are the source of truth (grill Q9), so the file is the author's table in data form, not a second copy.
- **Column mapping**: the legacy table has `Stratum`, `Name found`, `Tongue`, `Note`; these become `stratum`, `name`, `language`, `note`. `_extra muros_`, `_absent_` and `_(uncertain)_` are the author's own marks in the name column and are kept as text.
- **Open for the author**: `Cell.reading` has no column in the legacy table. Candidate values come from the legacy CSV's attestation class where the row matches (`exact`, `variant`, `extra_muros`, `source_silent`, and so on); the author confirms the vocabulary when the file is built (slice 4). Until then `reading` is the empty string, which the type allows.

## R7. The changed-claim ledger and the reconciliation as tests
- **Decision**: `docs/review/anchor-essay-changes.md` is a table (id, legacy line, legacy text, proposed text, reason, status, approved by, date); `docs/review/pit-cells-reconciliation.md` is the report. Two Vitest tests read them and the essay record's `stage`: from stage Build on (the stage after Draft, where the ledger is built up), any ledger entry not `approved`, or any reconciliation difference not resolved, fails the test.
- **Rationale**: the framework's rules are unchanged (spec 003); a test in CI is the way a repository enforces an editorial step without a new rule, and a failing test blocks the pull request that would promote the essay.
- **Seeds for the ledger**, from the legacy essay: "nineteen centuries" (lines 5, 74); "thirteen stones" and `mapCount: 13` (130, 1588, 1600; twelve corpus sources plus the satellite); "1.87 metres" and "twelve centuries" (78, 1586); derived durations "seventeen", "eighteen", "sixteen", "thirteen centuries" (90, 2148, 2043); "112 sheets" (1925); the per-stone record and silence tallies; `yearTo` 2024 against "2026" in the prose; the two appendix titles (2225, 2226); and the "not yet corpus-backed" label added to the pit tables.

## R8. Comparing the port with the legacy text without committing it
- **Decision**: a one-off script reads the legacy clone, normalises each paragraph (markup and whitespace stripped, case folded) and writes `docs/review/anchor-essay-legacy-paragraphs.json`, an array of `{line, sha256}`. `port-fidelity.test.ts` normalises the rebuilt body the same way and requires every legacy hash to be present in it or covered by a ledger entry.
- **Rationale**: CI has no clone of the legacy repository, and 15,000 words with 46 KB of SVG need not be duplicated in this one.
- **Alternatives**: commit the legacy source (a second home for the same text).

## R9. The evidence records
- **Decision**: seventeen: twelve (one per stone with a source) and five (one per declared interaction), minted with the counter. Each has a `source`, a `locator` supplied by the author (`state: pending` until a person verifies it), an `evidence_type` and a `confidence`. The interaction records may cite the same sources as the stones with a different locator.
- **Rationale**: `ESSAY-RESEARCH` needs `evidence[]` with `locator.value`; `ESSAY-INTERACTION` needs each declared interaction to name evidence that resolves; `ESSAY-BODY-PUBLIC` needs each evidence record's source and that source's bibliography entry public.
- **To check in slice 6**: what an evidence record's `target` should be for the six source-only stones (the six maps are natural targets for their stones); the gate will say.

## R10. The release list
- **Decision**: at Publish (after each of the twelve entries has a `section`, which the minted entries lack today), release exactly the essay; its 17 evidence records; the 12 sources and their 12 bibliography entries; and the maps it shows (up to six). Everything else stays held.
- **Checked**: releasing a map does not release what the map lists. `hereford` lists three bibliography entries and `trade-vesconte-1311` one, and a held entry is not shown (ADR 0014); `hereford`'s relations point at held maps, which are not shown; held cartographers are hidden. So the six maps add six records to the public set, not more.
- **The maps' state today**: `hereford` and `trade-vesconte-1311` have rights and an `institutional` witness; `ptolemy`, `peutinger`, `honterus` and `ortelius` have no `rights` and no `witness_kind`; `peutinger` and `hereford` lack a maker. All of it is on the author's critical path, and the spec's fallback applies (a map without a licence statement drops to source-only).

## R11. Redirect and inventory at Publish
- **Decision**: the Publish slice runs `registry inventory --snapshot <clone>` and `registry archive-redirects` for the first time and commits `migration/redirect-inventory.json` and `archive/_redirects` (neither exists in the repository yet), for the whole site; `/essays/dacia/` is then a `rule` to `/essays/dacia-lapidarium/`.
- **Rationale**: `cutover:check` exits 2 without both files; the generator refuses a stale inventory, so any later essay re-runs both.

## R12. Page weight and budgets
- **Decision**: no page-weight workaround is planned. The legacy essay file is 33 KB gzipped (the SVG alone 8.8 KB), and the existing essay page ships no `<script>`, which a build test now asserts.
- **Verified**: the existing fixture essay's built page has zero `<script>` tags; the JavaScript files in the build belong to the collection and Atlas pages.
