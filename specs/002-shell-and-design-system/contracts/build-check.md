# Contract: `npm run shell:check`

Scans the built site (`dist/` by default) for `data-stub` and `data-draft` markers.

| Invocation | Behaviour | Exit code |
|---|---|---|
| `npm run shell:check [-- --dist <dir>]` | Prints each stub (destination, owner spec) and each draft page, then a count. | `0` always, unless `dist` is missing (`2`) |
| `npm run shell:check -- --cutover` | The same output; fails if the count is above zero. Spec 008's cutover acceptance runs this. | `0` none · `1` any · `2` tool failure |

Output is text, one finding per line, with no page body repeated. A page with both markers is reported twice.
