# Quickstart: validating the anchor essay

Prerequisites: Node 24, `npm ci`, Playwright browsers (`npx playwright install`); for the one-off scripts, a fresh clone of the legacy repository pinned at `e82afd990fd473a2cdf80896401bc64602a1bd29` (never your working copy). `PW_CHROMIUM_PATH` points Playwright at a Chromium it does not manage, for a machine its own build does not support.

```bash
npm test                                    # Vitest: components' pure parts, the cell file, ledger, reconciliation, port fidelity, release list, preview
npm run registry -- check                   # the integrity gate over the real registry (the essay is held and passes at every stage)
npm run essay:preview -- dacia-lapidarium   # builds the held essay into dist-anchor from a temporary copy; prints the gate's errors if a used record is not ready
npm run essay:preview -- dacia-lapidarium --without ptolemy   # the same with one map left out (its stone becomes source-only)
npm run test:e2e:anchor                     # builds the preview and runs the essay's Playwright and axe specs: both colour schemes, JavaScript off, keyboard, reduced motion
npm run essay:ledger                        # lists any changed claim still pending; exits 1 while there is one
npm run essay:reconcile -- <legacy clone>   # writes docs/review/pit-cells-reconciliation.md
npm run cutover:check                       # at Publish: the anchor-essay step now passes (the other steps are the editor's)
```

## What to look at in the preview

Open `dist-anchor` with `npx astro preview --outDir dist-anchor` (or the e2e config's port) and read `/essays/dacia-lapidarium/` with JavaScript turned off in the browser:

1. The six sections, the thirteen stones with their drawings and the four pits (13 rows each, each row marked "not yet corpus-backed") are all there, in the legacy order.
2. The compare slider moves with the arrow keys; the squeeze checkbox toggles with Space; the radar tables are beneath the charts; the core drawing stays visible as you scroll.
3. Turn on reduced motion in the system settings: nothing moves.
4. View the source: no `<script>`, no reference to a `.js` file, no hex colour in the drawings.
5. Each stone with a source shows a source line with a note; the six map figures link to their collection records.

## Expected

- Before Publish the real registry shows the essay held: no page, no leak, the gate green.
- The preview fails, naming the gate's errors, while a used record is not ready (for example, a map with no `rights`); with `--without` it builds without that map.
- The ledger test and the reconciliation test fail from stage Build on while a row is pending or unresolved.
- After Publish the essay is public at `/essays/dacia-lapidarium/`, `migration/redirect-inventory.json` and `archive/_redirects` are committed with `/essays/dacia/` redirecting to it, and `cutover:check`'s anchor-essay step passes.
